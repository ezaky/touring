import { DeleteQueryResult } from "shared/whiz/entities/QueryDefs";
import { DeleteQuery } from "../entities/Query";
import SqlDb from "./SqlDb";
import SqlQueryUtil from "./SqlQueryUtil";
import StringUtil from "shared/whiz/util/StringUtil";
import { EntityRelationField, EntityRelationType } from "shared/whiz/entities/EntityRelationField";
import ArrayUtil from "shared/whiz/util/ArrayUtil";
import * as _ from 'lodash-es';

const DeleteSql = "DELETE FROM {0} WHERE {1}";

export default class SqlDeleter {
    private _query: DeleteQuery;

    constructor(query: DeleteQuery) {
        this._query = query;
    }
    async delete(): Promise<DeleteQueryResult> {
        await this._deleteRelationEntities();
        let preventDefaultInfo = this._query.getPreventDefaultInfo();
        if (preventDefaultInfo) {
            return <DeleteQueryResult>preventDefaultInfo.result;
        }
        return this._deleteEntities();
    }

    private _getSqlDb() {
        return <SqlDb>this._query.getDb();
    }
    private async _deleteRelationEntities() {
        let relationFields = this._query.getEntityType().relationFields;
        let promises;
        if (relationFields) {
            promises = ArrayUtil.mapAndFilter<EntityRelationField, Promise<any>>(relationFields, relationField => {
                if (relationField.parentChild) {
                    return this._deleteRelationEntity(relationField);
                }
            });
        }
        if (!_.isEmpty(promises)) {
            return Promise.all(promises); 
        }         
    }
    private async _deleteEntities(): Promise<DeleteQueryResult> {
        let query = this._query;
        let whereSql = await SqlQueryUtil.getPersistCriteriaSql(query);
        let sql = StringUtil.substitute(DeleteSql, query.getEntityType().getPersistTableName(), whereSql);
        let sqlResult = await this._getSqlDb().executeSql(sql, query.getContext());
        return {affectedCount: sqlResult.affectedRows};
    }
    private async _deleteRelationEntity(relationField: EntityRelationField) {
        let query = this._query;
        let entityType = query.getEntityType();
        let db = this._getSqlDb();
        let sourceEntityIds: any[];
        let queryEntityIds = this._query.getEntityIds();
        if (queryEntityIds && relationField.sourceIdField === entityType.idField) {
            sourceEntityIds = queryEntityIds;
        } else {
            let relationEntities = (await db.find({
                entityTypeId: entityType.id,
                fields: [relationField.sourceIdField],
                criteria: query.getCriteria()
            }, query.getContext())).data;
            sourceEntityIds = _.map(relationEntities, relationField.sourceIdField);
        }
        if (!_.isEmpty(sourceEntityIds)) {
            await db.delete({
                entityTypeId: relationField.entityTypeId,
                criteria: {[relationField.targetIdField]: sourceEntityIds}
            }, query.getContext());
        }
    }
}