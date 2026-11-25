import { CreateQueryResult, QueryType, UpdateQueryResult } from "shared/whiz/entities/QueryDefs";
import { PersistQuery } from "../entities/Query";
import FieldType from "shared/whiz/entities/FieldType";
import SqlGenerator from "./SqlGenerator";
import StringUtil from "shared/whiz/util/StringUtil";
import SqlDb from "./SqlDb";
import ArrayUtil from "shared/whiz/util/ArrayUtil";
import { EntityField, UniqueSpec } from "shared/whiz/entities/EntityField";
import ObjectUtil from "shared/whiz/util/ObjectUtil";
import { Operator } from "shared/whiz/entities/Operator";
import UserError from "../entities/UserError";
import { EntityType, LabelSelector } from "shared/whiz/entities/EntityType";
import { EntityRelationField, EntityRelationType } from "shared/whiz/entities/EntityRelationField";
import EntityUtil from "shared/whiz/entities/EntityUtil";
import BatchEntityPersister from "./BatchEntityPersister";
import SqlQueryUtil from "./SqlQueryUtil";
import * as _ from 'lodash-es';
import logger from "../server/Logger";

const InsertSql = "INSERT INTO {0} ({1}) VALUES ({2})";
const UpdateSql = "UPDATE {0} SET {1} WHERE {2}";
const NameUsedError = "The {1} \"{2}\" is already used in an existing {0}.";

interface PersistRelationInfo {
    relationField: EntityRelationField,
    relationFieldValue: any
}

export default class SqlPersister {
    private _query: PersistQuery;
    private _isUpdate: boolean;

    constructor(query: PersistQuery) {
        this._query = query;
        this._isUpdate = query.getQueryType() === QueryType.Update
    }
    async create(): Promise<CreateQueryResult> {
        return <Promise<CreateQueryResult>>this._persist();
    }
    async update(): Promise<UpdateQueryResult> {
        return <Promise<UpdateQueryResult>>this._persist();
    }

    private async _persist(): Promise<CreateQueryResult | UpdateQueryResult> {
        let relationsInfo: PersistRelationInfo[] = this._getRelationsInfo();
        if (relationsInfo.length) {
            let relationNames = relationsInfo.map(relationInfo => relationInfo.relationField.name)
            this._query.setEntity(_.omit(this._query.getEntity(), relationNames));
        }
        await this._prePersistEntity();
        let result = this._isUpdate ? await this._executeUpdate() : await this._executeCreate();
        if (relationsInfo.length) {
            let entityId;
            if (this._isUpdate) {
                entityId = this._query.getEntityId();
                if (!entityId) {
                    throw new Error("update criteria not supported with relation fields");
                }
            } else {
                entityId = (<CreateQueryResult>result).entityId;
            }
            await this._persistRelations(relationsInfo, entityId);
        }
        return result;
    }
    private _getSqlDb() {
        return <SqlDb>this._query.getDb();
    }
    private async _prePersistEntity() {
        let fields = this._query.getEntityType().fields;
        let promises = ArrayUtil.mapAndFilter<EntityField, Promise<void>>(fields, field => {
            if (field.unique) {
                return this._checkUniqueField(field);
            }
        });
        if (promises.length) {
           await Promise.all(promises);
        }
    }
    private async _executeCreate(): Promise<CreateQueryResult> {
        let query:PersistQuery = <PersistQuery>this._query;
        let entityType = query.getEntityType();
        // if the handlers assigned a computed id
        let genEntityId = this._query.getEntity()[entityType.idField];
        let sqlInfo = this._getPersistSqlInfo();
        let sql = StringUtil.substitute(InsertSql, sqlInfo.tableName, sqlInfo.fieldNames.join(","), sqlInfo.fieldValues.join(","));
        let sqlResult = await this._getSqlDb().executeSql(sql, query.getContext(), {
            queryType: QueryType.Create,
            entityType: entityType
        });
        let entityId = sqlResult.entityId || genEntityId;
        if (!entityId) {
            throw new Error(`Expected the entity id to be specified or returned from executeSql`);
        }
        // mysql returns String entityId even if the column is numeric, so fix it here because
        // comparison of keys may be done in the ui
        if (_.isString(entityId) && entityType.idField) {
            let idField = entityType.getField(entityType.idField);
            if (idField && idField.type === FieldType.Number) {
               entityId = parseInt(entityId);
            }
        }
        return {entityId};
    }
    private async _executeUpdate(): Promise<UpdateQueryResult> {
        let sqlInfo = this._getPersistSqlInfo();
        if (_.isEmpty(sqlInfo.fieldNames)) {
            return {affectedCount: 0}
        }
        let whereSql = await SqlQueryUtil.getPersistCriteriaSql(this._query);
        let i= 0;
        let columns = sqlInfo.fieldNames.map(fieldName => {
           return `${fieldName}=${sqlInfo.fieldValues[i++]}`;
        });
        let sql = StringUtil.substitute(UpdateSql, sqlInfo.tableName, columns.join(","), whereSql);
        let sqlResult = await this._getSqlDb().executeSql(sql, this._query.getContext());
        return {affectedCount: sqlResult.affectedRows};
    }
    private _getPersistSqlInfo() {
        let query:PersistQuery = <PersistQuery>this._query;
        let entityType = query.getEntityType();
        let entity = query.getEntity();
        let generator = new SqlGenerator<PersistQuery>(query);
        let fieldNames = _.keys(entity);
        let fieldValues = fieldNames.map(fieldName => {
            return generator.generateColumnValue(fieldName, entity[fieldName], {forPersist: true})
        });
        return {
            tableName: entityType.getPersistTableName(),
            fieldNames: fieldNames,
            fieldValues: fieldValues
        }
    }
    private async _checkUniqueField(field: EntityField) {
        let entityType = this._query.getEntityType();
        let entity = this._query.getEntity();
        let uniqueSpec = field.unique;
        // _.get to support json field
        let value = _.get(entity, field.name);
        // assume that if the field is set then it has been modified
        if (!value) {
           return;
        }
        let criteria = {[field.name]: value};
        let entityId;
        if (this._isUpdate) {
            entityId = this._query.getEntityId();
            if (!entityId) {
                throw new Error(`The field "${field.name}" is unique but is modified with a criteria`);
            }
        }
        let db = this._getSqlDb();
        if (_.isObject(uniqueSpec)) {
            let fieldNames = (<UniqueSpec>uniqueSpec).fieldNames;
            let uniquesEntity;
            if (this._isUpdate) {
                uniquesEntity = (await db.find({
                    entityTypeId: entityType.id,
                    entityId: entityId,
                    fields: fieldNames
                }, this._query.getContext())).data;

            } else {
                uniquesEntity = _.pick(entity, fieldNames);
            }
            Object.assign(criteria, uniquesEntity);
        }
        if (entityId) {
            criteria[entityType.idField] = {[Operator.NotEq]: entityId}
        }
        let entities = (await db.find({
            entityTypeId: entityType.id,
            fields: [entityType.idField],
            criteria: criteria 
        }, this._query.getContext())).data;
        if (!_.isEmpty(entities)) {
           throw new UserError(StringUtil.substitute(NameUsedError, entityType.getLabel(LabelSelector.SingularLower),
                 entityType.getFieldLabel(field.name, LabelSelector.SingularLower), value))
        }
    }
    private _getRelationsInfo(): PersistRelationInfo[] {
        let entityType = this._query.getEntityType();
        let entity = this._query.getEntity();
        return ArrayUtil.mapAndFilter<EntityRelationField, PersistRelationInfo>(entityType.relationFields, relationField => {
            let relationName = relationField.name;
            let relationFieldValue = entity[relationName];
            let relationType = relationField.type;
            if (EntityUtil.isMultipleRelation(relationField)) {
                if (!relationFieldValue) {
                    return;
                }
                if (relationType === EntityRelationType.ManyToMany) {
                    throw new Error("ManyToMany persistence not supported.");
                }
            } else if (relationFieldValue === undefined) {
                return;        
            }
            return {
               relationField: relationField,
               relationFieldValue: relationFieldValue
            }
         });
    }
    private _persistRelations(relationsInfo: PersistRelationInfo[], entityId) {
        let promises = relationsInfo.map(relationInfo => {
            if (EntityUtil.isMultipleRelation(relationInfo.relationField)) {
               return this._persistMultiRelationEntities(relationInfo, entityId);
            } else {
                return this._persistSingleRelationEntity(relationInfo, entityId);
            }
         });
         return Promise.all(promises);   
    }
    private async _persistMultiRelationEntities(relationInfo: PersistRelationInfo, entityId) {
        let relationEntities = relationInfo.relationFieldValue;
        if (!_.isArray(relationEntities)) {
            relationEntities = [relationEntities];
        }
        let relationField = relationInfo.relationField;
        let relationEntityType = EntityType.getEntityType(relationField.entityTypeId);
        for (let relationEntity of relationEntities) {
            relationEntity[relationField.targetIdField] = entityId;
        }
        let idsToRemove;
        if (this._isUpdate) {
            let idField = relationEntityType.idField;
            let criteria = {[relationField.targetIdField]: entityId};
            if (relationField.targetCriteria) {
                Object.assign(criteria, relationField.targetCriteria);
            }
            let oldRelationEntities = (await this._getSqlDb().find({
                entityTypeId: relationField.entityTypeId,
                fields: [idField],
                criteria: criteria,
            }, this._query.getContext())).data;
            let oldIds = _.map(oldRelationEntities, idField);
            let newIds = _.map(relationEntities, idField);
            idsToRemove = _.difference(oldIds, newIds);
        }
        return new BatchEntityPersister().persist(relationEntityType, {
            entitiesToPersist: relationEntities,
            entityIdsToRemove: idsToRemove
        }, this._query.getContext());
    }
    private async _persistSingleRelationEntity(relationInfo: PersistRelationInfo, entityId) {
        let relationEntity = relationInfo.relationFieldValue;
        let relationField = relationInfo.relationField;
        let relationEntityType = EntityType.getEntityType(relationField.entityTypeId);
        let db = this._getSqlDb();
        let oldRelationEntityId;
        let idField = relationEntityType.idField;
        let context = this._query.getContext();
        relationEntity && (oldRelationEntityId = relationEntity[idField]);
        if (this._isUpdate && !oldRelationEntityId) {
            let criteria = {[relationField.targetIdField]: entityId};
            relationField.targetCriteria && Object.assign(criteria, relationField.targetCriteria);
            let oldRelationEntity = (await db.findOne({
                entityTypeId: relationField.entityTypeId,
                fields: [idField],
                criteria: criteria,
            }, context)).data;
            if (oldRelationEntity) {
                oldRelationEntityId = oldRelationEntity[idField];
            }    
        }
        if (relationEntity) {
           if (!this._isUpdate || !oldRelationEntityId) {
              relationEntity[relationField.targetIdField] = entityId;
              return db.create({
                entityTypeId: relationField.entityTypeId,
                entity: relationEntity
              }, this._query.getContext());
           }
           return db.update({
                entityTypeId: relationField.entityTypeId,
                entityId: oldRelationEntityId,
                entity: relationEntity
           }, context);
        }
        if (oldRelationEntityId) {
            return db.delete({
                entityTypeId: relationField.entityTypeId,
                entityId: oldRelationEntityId
            }, context)
        }
    }
}