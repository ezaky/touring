import { FindQuery } from "./FindQuery";
import EntitiesDataHandler from "./EntitiesDataHandler";
import { SoftDeleteOptions, SqlDbExtension } from "../plugins/ServerPluginDefs";
import { Operator } from "shared/whiz/entities/Operator";
import { QueryFieldClause, Criteria } from "shared/whiz/entities/QueryDefs";
import { EntityType } from "shared/whiz/entities/EntityType";
import { DeleteQuery } from "./Query";
import Database from "./Database";

export default class CommonEntitiesDataHandler extends EntitiesDataHandler {
   async preFind(query: FindQuery) {
      let criteria = this._getActiveCriteria(query);
      criteria && query.addCriteria(criteria);
   }  
   getJoinCriteria(query: FindQuery, entityTypeId: string): Criteria {
      return this._getActiveCriteria(query, entityTypeId, true);
   }
   async preDelete(query: DeleteQuery) {
      let entityType = query.getEntityType();
      let softDeleteOptions = this._getSoftDeleteOptions(entityType, query.getDb());
      if (!softDeleteOptions) {
         return;
      }
      let result = await query.getDb().update({
         entityTypeId: entityType.id,
         entity: {[softDeleteOptions.fieldName]: softDeleteOptions.deletedFieldValue},
         criteria: query.getCriteria()
      }, query.getContext());
      query.setPreventDefaultInfo({
         preventDefault: true,
         preventRelationsDefault: false,
         result: result     
      });
   }

   private _getActiveCriteria(query: FindQuery, entityType: EntityType|string=null, forRelations=false) {
      if (!entityType) {
         entityType = query.getEntityType();
      } else {
         entityType = EntityType.getEntityType(entityType);
      }
      let softDeleteOptions = this._getSoftDeleteOptions(entityType, query.getDb());
      if (!softDeleteOptions) {
         return;
      }
      if (forRelations || !query.hasField(softDeleteOptions.fieldName, QueryFieldClause.Where)) {
         // using NotEq because the column could have other values than Deleted/Active
         return {[softDeleteOptions.fieldName]: {[Operator.NotEq]: softDeleteOptions.deletedFieldValue}};
      }
   }
   private _getSoftDeleteOptions(entityType: EntityType, database: Database): SoftDeleteOptions {
      if (!entityType.isSoftDelete) {
         return;
      }
      let softDeleteConfig = (<SqlDbExtension>database.dbExtension).softDelete;
      if (!softDeleteConfig) {
         throw new Error(`Expected the database extension to have a softDelete field to handle the soft delete in ${entityType.id}`);
      }
      return softDeleteConfig;
   }
}