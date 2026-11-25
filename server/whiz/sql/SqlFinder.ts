import { FindQueryResult, FindQuerySpec, RelationFinderInfo, SelectField } from "shared/whiz/entities/QueryDefs";
import { ControllerContext } from "../controllers/ControllerDefs";
import { FindQuery, QueryOptions } from "../entities/FindQuery";
import SqlSelectGenerator from "./SqlSelectGenerator";
import SqlUtil from "./SqlUtil";
import ArrayUtil from "shared/whiz/util/ArrayUtil";
import ObjectUtil from "shared/whiz/util/ObjectUtil";
import { EntityRelationField } from "shared/whiz/entities/EntityRelationField";
import FieldType from "shared/whiz/entities/FieldType";
import EntityUtil from "shared/whiz/entities/EntityUtil";
import { QueryFunctionUtil } from "shared/whiz/entities/QueryFunction";
import * as _ from 'lodash-es';
import logger from "../server/Logger";

interface MultiRelationInfo {
    multiRelationPath: string,
    relationField: EntityRelationField,
    sourceIdFieldPath: string,
    singleRelationFieldPath: string,
    selectFields: SelectField[]
}
export default class SqlFinder {
    private _querySpec: FindQuerySpec;
    private _query: FindQuery;
    private _context: ControllerContext;
    private _selectGenerator: SqlSelectGenerator;
    private _multiRelationInfos: {[relationName: string]: MultiRelationInfo};

    async adjustQuerySpec(querySpec: FindQuerySpec): Promise<FindQuerySpec> {
        this._querySpec = querySpec;
        let singleRowQuerySpec = await this._excludeMultiRelations(querySpec);
        return singleRowQuerySpec;
    }
    async find(query: FindQuery): Promise<FindQueryResult> {
        this._query = query;
        this._context = query.getContext();
        this._selectGenerator = new SqlSelectGenerator(query);

        let entities;
        if (this._query.getLimit() !== 0) {
            entities = await this._findEntities();
        }
        let result:FindQueryResult = {data: entities};
        if (this._query.needsCount()) {
            // Avoid the count query if the data query contains all the data
            let limit = this._query.getLimit();
            if (!this._query.getOffset() && (limit == null || entities.length < limit)) {
                result.count = entities.length;
            } else {
                result.count = await this._queryCount();
            }
        }
        return result;
    }
    getQuery(): FindQuery {
        return this._query;
    }
    
    // cannot import SqlDb to avoid circular dependencies
    private _getSqlDb() {
        return <any>this._context.db;
    }
    private async _findEntities(): Promise<any[]> {
        let sql = await this._selectGenerator.generate();
        let entities = await this._executeSql(sql);
        this._adjustEntityFields(entities);
        let promises = [];
        for (let relationName in this._multiRelationInfos) {
            promises.push(this._findMultiRelations(entities, this._multiRelationInfos[relationName]));
        }
        if (promises.length) {
            await Promise.all(promises);
        }
        return entities;
    }
    private async _queryCount(): Promise<number> {
        let sql = await this._selectGenerator.generateCountSql();
        let result = await this._executeSql(sql);
        return SqlUtil.getSingleValue(result);
    }
    private async _executeSql(sql) {
        return this._getSqlDb().executeSql(sql, this._context);
    }
    private _adjustEntityFields(entities: any[]) {
        // commented out because compoundFieldPaths stuff is needed for the GroupBy in _findMultiRelations
        /* 
        if (!_.isEmpty(this._query.getGroupByFieldInfos())) {
            // for fields using the auto generated junction relations the alias is set to the original field in the 
            // select fields; see FindQuery.ts _initQueryFields
            return;
        }
        */
        let db = this._getSqlDb();
        let supportsJsonObjects = db.supportsJsonObjects();
        let supportsArrays = db.supportsArrays();
        let compoundFieldPaths: string[] = [];
        let jsonFieldPaths: string[] = [];
        let dateFieldInfos: any[] = [];
        for (let queryFieldInfo of this._query.getSelectFieldInfos()) {
            let selectField = queryFieldInfo.queryField;
            let fieldInfo = queryFieldInfo.entityFieldInfo;
            let field = fieldInfo.field;
            // Assuming that SqlSelectGenerator generates AS with the path
            if (fieldInfo.relationFields || fieldInfo.jsonFieldPath) {
                compoundFieldPaths.push(fieldInfo.fieldPath);
            }
            let parseJson;
            if (field.type === FieldType.JSON) {
                parseJson = !supportsJsonObjects;
            } else if (field.isArray) {
                parseJson = !supportsArrays;
            }
            if (parseJson) {
                jsonFieldPaths.push(selectField.alias || selectField.field);
            }
            if (field.type === FieldType.Date && selectField.func && QueryFunctionUtil.isDateAggregate(selectField.func)) {
                dateFieldInfos.push({
                    fieldPath: fieldInfo.fieldPath,
                    fieldInfo: fieldInfo,
                    selectField: selectField
                });
            }
        }
        if (!compoundFieldPaths.length && !jsonFieldPaths.length  && !dateFieldInfos.length) {
            return;
        }
        for (let entity of entities) {
            for (let jsonFieldPath of jsonFieldPaths) {
                let value = _.get(entity, jsonFieldPath);
                if (value != null) {
                    value = ObjectUtil.parseJson(value);
                    _.set(entity, jsonFieldPath, value);
                }
            }
            for (let fieldPath of compoundFieldPaths) {
                if (entity.hasOwnProperty(fieldPath)) {
                    let value = entity[fieldPath];
                    delete entity[fieldPath];
                    _.set(entity, fieldPath, value);
                }
            }
            for (let dateFieldInfo of dateFieldInfos) {
                let value = _.get(entity, dateFieldInfo.fieldPath);
                if (value) {
                    value = db.adjustDateFromQuery(value, dateFieldInfo.selectField, dateFieldInfo.fieldInfo);
                    if (value) {
                        _.set(entity, dateFieldInfo.fieldPath, value);
                    }
                }
            }
        }
    }
    private async _excludeMultiRelations(querySpec: FindQuerySpec): Promise<FindQuerySpec> {
        let query = await FindQuery.instantiate(querySpec, this._context, {forSelect: false})
        let singleSelectFields = [];
        let multiRelationInfos:{[relationName: string]: MultiRelationInfo} = {};
        for (let selectFieldInfo of query.getSelectFieldInfos()) {
            let selectField = selectFieldInfo.queryField;
            let relationInfo = query.getMultiRelationInfo(selectFieldInfo.entityFieldInfo);
            if (!relationInfo || query.isAggregatedMultiEntityField(selectFieldInfo.entityFieldInfo)) {
                singleSelectFields.push(selectField);
                continue;
            }
            let multiRelationField = relationInfo.multiRelationField;
            let sourceIdFieldPath = relationInfo.sourceIdFieldPath;
            if (!query.getSelectFieldInfo(sourceIdFieldPath)) {
                singleSelectFields.push({...selectField, field: sourceIdFieldPath});
            }
            let multiRelationInfo = multiRelationInfos[multiRelationField.name];
            if (!multiRelationInfo) {
                multiRelationInfo = multiRelationInfos[multiRelationField.name] = {
                    multiRelationPath: relationInfo.multiRelationPath,
                    relationField: multiRelationField,
                    sourceIdFieldPath: sourceIdFieldPath,
                    singleRelationFieldPath: EntityUtil.getRelationsPath(relationInfo.singleRelationFields),
                    selectFields: []
                }
            }
            let fieldPath = EntityUtil.getRelationsPath(relationInfo.multiRelationFields);
            fieldPath && (fieldPath += ".");
            fieldPath += selectFieldInfo.entityFieldInfo.field.name;
            multiRelationInfo.selectFields.push({field: fieldPath});
        }
        this._multiRelationInfos = multiRelationInfos;
        return {...querySpec, fields: singleSelectFields};
    }
    private async _findMultiRelations(entities: any[], multiRelationInfo: MultiRelationInfo) {
        let sourceIds = ArrayUtil.mapAndFilter(entities, entity => _.get(entity, multiRelationInfo.sourceIdFieldPath));
        if (!sourceIds.length) {
            return;
        }
        let relationField = multiRelationInfo.relationField;
        if (relationField.junctionRelation) {  // see EntityType._initRelations
            throw new Error("Unexpected junctionRelation");
        }
        let entityTypeId = relationField.entityTypeId;
        let targetIdField = relationField.targetIdField;
        let criteria = FindQuery.getRelationFieldCriteria(relationField);
        criteria[targetIdField] = sourceIds;
        let querySpec:FindQuerySpec = {
            entityTypeId: entityTypeId,
            fields: [targetIdField, ...multiRelationInfo.selectFields],
            criteria: criteria
        }
        if (this._query.getRelationFinderInfo(multiRelationInfo.multiRelationPath)?.aggregateFields !== false) {
            querySpec.groupBy = querySpec.fields.map((field, index) => {
                return {field: null, selectColumnNum: index+1}
            })
        }
        // inner is supposidly faster and also the junction table could have null source fields so 
        // this discards the unnecessary null rows
        let entities2 = (await this._query.getDb().find(querySpec, this._context, {canInnerJoin: true})).data;
        let entities2ById = _.groupBy(entities2, targetIdField);
        let {junctionRelationName, junctionRelationFieldName} = relationField.autoGeneratedInfo || {};
        let targetEntitiesFieldPath = junctionRelationName || relationField.name;
        if (multiRelationInfo.singleRelationFieldPath) {
            targetEntitiesFieldPath = `${multiRelationInfo.singleRelationFieldPath}.${targetEntitiesFieldPath}`;
        }
        for (let entity of entities) {
            let id = _.get(entity, multiRelationInfo.sourceIdFieldPath);
             if (!id) {
                continue;
            }
            let multiEntities = entities2ById[id];
            if (multiEntities) {
               for (let i = 0; i < multiEntities.length; ++i) {
                    let multiEntity = multiEntities[i];
                    if (junctionRelationFieldName) {
                        multiEntities[i] = multiEntity[junctionRelationFieldName];
                    } else {
                        // remove the targetIdField we added above to avoid causing extra updates of the child
                        // entities when the parent entity is updated. We assume that this field was not in the original
                        // field list because it doesn't make sense to have it.
                        delete multiEntity[targetIdField];
                    }
                }
                _.set(entity, targetEntitiesFieldPath, multiEntities);
            }
        }
    }
}