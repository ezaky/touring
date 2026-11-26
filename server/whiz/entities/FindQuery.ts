/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */

import { QueryField, FindQuerySpec, SelectField, OrderByField, Criteria, GroupByField, RelationFinderInfo, QueryType, QueryFieldClause, GenerateColumnFunc } from "shared/whiz/entities/QueryDefs";
import { EntityFieldInfo } from "shared/whiz/entities/EntityType";
import { ControllerContext } from "../controllers/ControllerDefs";
import { QueryFunction, QueryFunctionUtil } from "shared/whiz/entities/QueryFunction";
import QueryUtil from "./QueryUtil";
import EntityUtil from "shared/whiz/entities/EntityUtil";
import { EntityRelationField } from "shared/whiz/entities/EntityRelationField";
import { Query, QueryOptions } from "./Query";
import * as _ from 'lodash-es';

export { QueryOptions };

export interface QueryFieldInfo<T extends QueryField = QueryField> {
    queryField: T,
    entityFieldInfo: EntityFieldInfo
}
export interface FieldRefs {
    selectField?: SelectField,
    isCriteriaField?: boolean,
    isGroupByField?: boolean,
    isOrderByField?: boolean
}
export class FindQuery extends Query<FindQuerySpec> {
    private _selectFields: SelectField[];
    private _groupByFields: GroupByField[];
    private _orderByFields: OrderByField[];
    private _criteriaFieldsByName: {[name: string]: QueryField} = {};
    private _fieldInfos: {[name: string]: EntityFieldInfo} = {};
    private _fieldRefs: {[name: string]: FieldRefs} = {};

    private constructor(querySpec: FindQuerySpec, context: ControllerContext, options: QueryOptions = {}) {
        !options.queryType && (options.queryType = QueryType.Find);
        super(querySpec, context, options);

        this._initSelectFields();
        this._initCriteriaFields();
        this._initGroupByFields();
        this._initOrderByFields();
    }
    static async instantiate(querySpec: FindQuerySpec, context: ControllerContext, 
            options: QueryOptions = {}): Promise<FindQuery> {
        let query = new FindQuery(querySpec, context, options);
        if (options.forSelect !== false && options.queryType === QueryType.Find) {
            await query._preFind();
        }
        return query;
    }
    getLimit() {
        return this.querySpec.limit;
    }
    getOffset() {
        return this.querySpec.offset;
    }
    needsCount() {
        return this.querySpec.needsCount;
    }
    getRelationFinderInfo(relationPath): RelationFinderInfo {
        let relationsFinderInfo = this.querySpec.relationsFinderInfo;
        if (relationsFinderInfo) {
            return _.find(relationsFinderInfo, {relationPath: relationPath})
        }
    }
    getSelectFieldInfos(): QueryFieldInfo<SelectField>[] {
        return this._getQueryFieldInfos(this._selectFields);
    }
    getSelectFieldInfo(fieldName): QueryFieldInfo<SelectField> {
        let selectField = _.find(this._selectFields, {field: fieldName});
        if (selectField) {
            return this._getQueryFieldInfo(selectField);
        }
    }
    getCriteriaFieldInfo(fieldName): QueryFieldInfo {
        let criteriaField = this._criteriaFieldsByName[fieldName];
        if (criteriaField) {
            return this._getQueryFieldInfo(criteriaField);
        }
    }
    hasGroupBy() {
        return !_.isEmpty(this._groupByFields);
    }
    getGroupByFieldInfos(): QueryFieldInfo[] {
        return this._getQueryFieldInfos(this._groupByFields);
    }
    getOrderByFieldInfos(): QueryFieldInfo[] {
        return this._getQueryFieldInfos(this._orderByFields);
    }
    getAllFieldInfos(): EntityFieldInfo[] {
        return _.values(this._fieldInfos);
    }
    getEntityFieldInfo(fieldName) {
        let fieldInfo =  this._fieldInfos[fieldName];
        if (!fieldInfo) {
            throw new Error(`Invalid query field ${fieldName}`);
        }
        return fieldInfo;
    }
    getFieldRefs(fieldName): FieldRefs {
        return this._fieldRefs[fieldName];
    }
    hasField(fieldName, clause: QueryFieldClause=QueryFieldClause.Select): boolean {
        let refs = this.getFieldRefs(fieldName);
        if (!refs) {
            return false;
        }
        switch (clause) {
            case QueryFieldClause.Select: {
                return !!refs.selectField;
            }
            case QueryFieldClause.Where: {
                return refs.isCriteriaField;
            }
            case QueryFieldClause.GroupBy: {
                return refs.isGroupByField;
            }
            case QueryFieldClause.OrderBy: {
                return refs.isOrderByField;
            }
            default: {
                throw new Error(`Unexpected QueryFieldClause: ${clause}`);
            }
        }
    }
    getMultiRelationForField(fieldInfo: EntityFieldInfo) {
        return EntityUtil.getMultiRelationForField(fieldInfo);
    }
    isAggregatedMultiEntityField(fieldInfo: EntityFieldInfo): boolean {
        if (_.isEmpty(this._groupByFields)) {
            return false;
        }
        let relationFields = fieldInfo.relationFields;
        if (!relationFields) {
            return false;
        }
        let multiRelationField = this.getMultiRelationForField(fieldInfo);
        if (!multiRelationField) {
            return false;
        }
        for (let queryFieldInfo of this.getGroupByFieldInfos()) {
            let groupByRelationFields = queryFieldInfo.entityFieldInfo.relationFields;
            if (groupByRelationFields 
                    && groupByRelationFields.find(groupByRelationField => groupByRelationField.name === multiRelationField.name)) {
                return true;
            }
        }
        return false;
    }
    getMultiRelationInfo(fieldInfo: EntityFieldInfo) {
        let relationFields = fieldInfo.relationFields;
        if (!relationFields) {
            return;
        }
        let index = relationFields.findIndex(relationField => EntityUtil.isMultipleRelation(relationField));
        if (index < 0) {
            return;
        }
        let multiRelationField = relationFields[index];
        let sourceIdFieldPath: string;
        let singleRelationFields, multiRelationPath;
        if (index) {
            singleRelationFields = relationFields.slice(0, index);
            let relationsPath = EntityUtil.getRelationsPath(singleRelationFields);
            sourceIdFieldPath = `${relationsPath}.${_.last(singleRelationFields).targetIdField}`;
            multiRelationPath = `${relationsPath}.${multiRelationField.name}`;
        } else {
            sourceIdFieldPath = multiRelationField.sourceIdField;
            singleRelationFields = [];
            multiRelationPath = multiRelationField.name;
        }
        return {
            multiRelationPath: multiRelationPath,
            multiRelationField: multiRelationField,
            sourceIdFieldPath: sourceIdFieldPath,
            singleRelationFields: singleRelationFields,
            multiRelationFields: relationFields.slice(index+1)
        }
    }
    static getRelationFieldCriteria(relationField: EntityRelationField): Criteria {
        let targetCriteria = relationField.targetCriteria;
        if (targetCriteria) {
            let autoGeneratedInfo = relationField.autoGeneratedInfo;
            if (autoGeneratedInfo?.junctionRelationFieldName) {
                targetCriteria = FindQuery._nestCriteriaFieldNames(relationField.entityTypeId, targetCriteria, autoGeneratedInfo.junctionRelationFieldName)
            }
        }
        let criteria = {};
        targetCriteria && Object.assign(criteria, targetCriteria);
        return criteria;
    }
    addSelectField(selectField: SelectField) {
        if (this.hasField(selectField.field)) {
            return;
        }
        selectField = this._initQueryFields([selectField], QueryFieldClause.Select)[0];
        this._selectFields.push(selectField);
    }
    addCriteria(criteria: Criteria) {
        this._initCriteriaFields(criteria);
        super.addCriteria(criteria);
    }
    removeFieldCriteria(fieldName) {
        let removed;
        QueryUtil.iterateCriteriaFields(this.entityType, this.criteria, (fieldInfo, object) => {
            if (fieldInfo.fieldPath === fieldName) {
                delete object[fieldName];
                removed = true;
                return false; // stop iterating
            }
        });
        if (!removed) {
            throw new Error(`The field ${fieldName} was not found in criteria conditions`);
        }
    }  

    private async _preFind() {
        await this.iterateDataHandlers(dataHandler => {
            dataHandler.preFind(this)
        });
        this._updateGenerateColumn();
    }
    _updateGenerateColumn() {
        let columnGeneratorsByEntityType = {};
        let getColumnGenerators = entityTypeId => {
            let columnGenerators = columnGeneratorsByEntityType[entityTypeId];
            if (columnGenerators === undefined) {
                // just a small optimization to avoid re-instantiating this dataHandlers
                if (entityTypeId === this.entityType.id) {
                    this.iterateDataHandlers(dataHandler => {
                        let columnGenerators2 = dataHandler.getColumnGenerators();
                        columnGenerators2 && (columnGenerators = columnGenerators2);
                    })
                } else {
                    FindQuery.iterateEntityTypeDataHandlers(entityTypeId, dataHandler => {
                        let columnGenerators2 = dataHandler.getColumnGenerators();
                        columnGenerators2 && (columnGenerators = columnGenerators2);
                    })  
                }
                columnGeneratorsByEntityType[entityTypeId] = columnGenerators || null;
            }
            return columnGenerators;
        }
        for (let fieldName in this._fieldInfos) {
            let fieldInfo = this._fieldInfos[fieldName];
            let columnGenerators = getColumnGenerators(fieldInfo.entityType.id);
            let columnGenerator;
            if (columnGenerators && (columnGenerator = columnGenerators[fieldInfo.field.name])) {
                this._updateQueryield(fieldName, (queryField: QueryField) => {
                    queryField.generateColumn = columnGenerator;
                })
            }
        }
    }
    private _getQueryFieldInfos(queryFields: QueryField[]) {
        return queryFields.map(queryField => this._getQueryFieldInfo(queryField))
    }
    private _getQueryFieldInfo(queryField: QueryField) {
        return {
            queryField: queryField,
            entityFieldInfo: this._fieldInfos[queryField.field]
        }
    }
    private _initSelectFields() {
        this._selectFields = this._initQueryFields(this.querySpec.fields, QueryFieldClause.Select);
    }
    private _initCriteriaFields(criteria=null) {
        !criteria && (criteria = this.criteria);
        let criteriaFieldsByName = {};
        QueryUtil.iterateCriteriaFields(this.entityType, criteria, (fieldInfo, object) => {
            let fieldName = fieldInfo.fieldPath;
            let adjustedPath = this._adjustJunctionFieldPath(fieldName);
            if (adjustedPath !== fieldName) {
                object[adjustedPath] = object[fieldName];
                delete object[fieldName];
                fieldName = adjustedPath;
            }
            criteriaFieldsByName[fieldName] = {field: fieldName};
        });
        this._addFieldInfos(_.values(criteriaFieldsByName), QueryFieldClause.Where);
        _.defaults(this._criteriaFieldsByName, criteriaFieldsByName);
    }
    private _initGroupByFields() {
        this._groupByFields = this._initQueryFields(this.querySpec.groupBy, QueryFieldClause.GroupBy);
    }
    private _initOrderByFields() {
        this._orderByFields = this._initQueryFields(this.querySpec.orderBy, QueryFieldClause.OrderBy);
    }
    private _initQueryFields(queryFields: (string|QueryField)[], clause: QueryFieldClause) {
        if (!queryFields) {
            return [];
        }
        let result = queryFields.map(nameOrObj => {
            // could be a string in select fields
            let queryField = <any>(_.isString(nameOrObj) ? {field: nameOrObj} : nameOrObj);
            let fieldPath = queryField.field;
            let adjustedPath = this._adjustJunctionFieldPath(fieldPath);
            if (adjustedPath !== fieldPath) {
                queryField = {...queryField, field: adjustedPath};
                if (clause === QueryFieldClause.Select && !queryField.alias) {
                    queryField.alias = fieldPath;
                }
            }
            return queryField;
        });
        this._addFieldInfos(result, clause);
        return result;
    }
    
    private _updateQueryield(fieldName: string, updater: (queryField: QueryField) => void) {
        let queryField: QueryField = _.find(this._selectFields, {field: fieldName});
        queryField && updater(queryField);

        queryField = _.find(this._groupByFields, {field: fieldName});
        queryField && updater(queryField);
        
        queryField = _.find(this._orderByFields, {field: fieldName});
        queryField && updater(queryField);

        queryField = this._criteriaFieldsByName[fieldName];
        queryField && updater(queryField);
    }
    private _adjustJunctionFieldPath(fieldPathOrInfo: string|EntityFieldInfo): string {
        if (!fieldPathOrInfo) {
            return <string>fieldPathOrInfo;
        }
        let fieldPath: string;
        let fieldInfo: EntityFieldInfo;
        if (_.isString(fieldPathOrInfo)) {
            fieldPath = <string>fieldPathOrInfo;
            fieldInfo = this.entityType.getFieldInfo(fieldPath);
        } else {
            fieldInfo = <EntityFieldInfo>fieldPathOrInfo;
            fieldPath = fieldInfo.fieldPath;
        }        
        if (!fieldInfo.relationFields) {
            return fieldPath;
        }
        let relationNames:string[] = [];
        let hasJunctions = false;
        for (let relationField of fieldInfo.relationFields) {
            let junctionRelation = relationField.junctionRelation;
            if (junctionRelation) {
                relationNames = relationNames.concat(junctionRelation.relationFieldPath.split("."));
                hasJunctions = true;
            } else {
                relationNames.push(relationField.name);
            }
        }
        return hasJunctions ? `${relationNames.join(".")}.${fieldInfo.field.name}` : fieldPath;
    }
    private _addFieldInfos(queryFields: QueryField[], clause: QueryFieldClause) {
        for (let queryField of queryFields) {
            this._validateQueryField(queryField, clause);
            let fieldName = queryField.field;
            if (!this._fieldInfos[fieldName]) {
                this._fieldInfos[fieldName] = this.entityType.getFieldInfo(fieldName);
            }
            let refs: FieldRefs = this._fieldRefs[fieldName];
            if (!refs) {
                refs = this._fieldRefs[fieldName] = {};
            }
            switch (clause) {
                case QueryFieldClause.Select: {
                    refs.selectField = queryField;
                    break;
                }
                case QueryFieldClause.Where: {
                    refs.isCriteriaField = true;
                    break;
                }
                case QueryFieldClause.GroupBy: {
                    refs.isGroupByField = true;
                    break;
                }
                case QueryFieldClause.OrderBy: {
                    refs.isOrderByField = true;
                    break;
                }
                default: {
                    throw new Error(`Unexpected QueryFieldClause: ${clause}`);
                }
            }
        }
    }
    private _validateQueryField(queryField: QueryField, clause: QueryFieldClause) {
        // field could be null if Count func or there is selectColumnNum
        if (!queryField.field) {
            let selectColumnNum = (<any>queryField).selectColumnNum;
            if (queryField.func !== QueryFunction.Count && !selectColumnNum) {
                throw new Error(`field should be specified in ${JSON.stringify(queryField)}`);
            }
            // avoid breaking the asumption that there is an entity field for all finder fields. If selectColumnNum
            // then the field is not used, if Count then we will generate Count(*) if the field is id field.
            // if selectColumnNum then the field needs to be the actual select field because the correct field info matters in SqlFinder excluding multi relations etc
            if (selectColumnNum) {
                let selectField = this._selectFields[selectColumnNum-1];
                if (!selectField) {
                    throw new Error(`Invalid selectColumnNum in ${queryField.field} query field`);
                }
                queryField.field = selectField.field;
            } else{
                queryField.field = this.getEntityType().idField;
            }
        }
        if (queryField.func && !QueryFunctionUtil.isValid(queryField.func)) {
            throw new Error(`Invalid function ${queryField.func}`);
        }
        if (queryField.generateColumn && !_.isFunction(queryField.generateColumn)) {
            throw new Error(`Invalid generateColumn in the field "${queryField.field}`);
        }   
    }
    private  static _nestCriteriaFieldNames(entityTypeId: string, criteria: Criteria, relationName: string) {
        if (!criteria) {
            return;
        }
        criteria = _.cloneDeep(criteria);
        QueryUtil.iterateCriteriaFields(entityTypeId, criteria, (fieldInfo, object) => {
            let fieldName = fieldInfo.fieldPath;
            let nestedName = `${relationName}.${fieldName}`;
            object[nestedName] = object[fieldName];
            delete object[fieldName];
        });
        return criteria;
    }
  }