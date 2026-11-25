import { EntityType } from "shared/whiz/entities/EntityType";
import { ControllerContext } from "../controllers/ControllerDefs";
import AsyncUtil from "shared/whiz/util/AsyncUtil";
import * as _ from 'lodash-es';

export interface BatchSpec {
    entitiesToPersist?: any[],
    entitiesToCreate?: any[],
    entitiesToUpdate?: any[],
    entityIdsToRemove?: any[],
    isDeleteIndividual?: true
}
export default class BatchEntityPersister {
    private _context: ControllerContext;
    private _entityType: EntityType;

    async persist(entityType: EntityType|string, batchSpec: BatchSpec, context: ControllerContext) {
        this._entityType = EntityType.getEntityType(entityType);
        this._context = context;

        let entitiesToCreate, entitiesToUpdate;
        let idField = this._entityType.idField;
        let  entitiesToPersist = batchSpec.entitiesToPersist;
        if (!_.isEmpty(entitiesToPersist)) {
            entitiesToCreate = [];
            entitiesToUpdate = [];
            for (let entity of entitiesToPersist) {
                if (entity[idField]) {
                    entitiesToUpdate.push(entity)
                } else {
                    entitiesToCreate.push(entity)
                }
            }
        } else {
            entitiesToCreate = batchSpec.entitiesToCreate;
            entitiesToUpdate = batchSpec.entitiesToUpdate;
        }
        const result: any = {};
        let affectedEntityIds = [];
        if (!_.isEmpty(entitiesToCreate)) {
            result.creationResults = await this._batchCreate(entitiesToCreate);
            affectedEntityIds = affectedEntityIds.concat(_.map(result.creationResults, "entityId"));
        }
        if (!_.isEmpty(entitiesToUpdate)) {
            result.updateResults = await this._batchUpdate(entitiesToUpdate);
            affectedEntityIds = affectedEntityIds.concat(_.map(entitiesToUpdate, idField));
        }
        if (!_.isEmpty(batchSpec.entityIdsToRemove)) {
            result.deletionResults = this._batchDelete(batchSpec.entityIdsToRemove, batchSpec.isDeleteIndividual);
            affectedEntityIds = affectedEntityIds.concat(batchSpec.entityIdsToRemove);
        }
        result.affectedEntityIds = affectedEntityIds;
        return result;
    }

    private async _batchCreate(entities: any[]) {
        let db = this._context.db;
        let promises = entities.map(entity => {
            return db.create({
                entityTypeId: this._entityType.id,
                entity: entity
            }, this._context);
        });
        return db.batch(promises);
    }
    private async _batchUpdate(entities: any[]) {
        let db = this._context.db;
        let idField = this._entityType.idField;
        const promises = entities.map(entity => {
            let entityId = entity[idField];
            entity = {...entity};
            delete entity[idField];
            return db.update({
                entityTypeId: this._entityType.id,
                entityId: entityId,
                entity: entity
            }, this._context);
        });
        return db.batch(promises);
    }
    private async _batchDelete(entityIds: any[], isDeleteIndividual: boolean) {
        let db = this._context.db;
        if (isDeleteIndividual) {
            let promises = entityIds.map(entityId => {
                return db.delete({
                    entityTypeId: this._entityType.id,
                    entityId: entityId
                }, this._context);
            });
            return db.batch(promises);
        }
        return db.delete({
            entityTypeId: this._entityType.id,
            criteria: {[this._entityType.idField]: entityIds}
        }, this._context);
    }
}