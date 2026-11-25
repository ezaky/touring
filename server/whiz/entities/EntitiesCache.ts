import { LRUCache } from 'lru-cache';
import { Entity, FindQuerySpec } from 'shared/whiz/entities/QueryDefs';
import DbManager from './DbManager';

const CacheMaxEntries = 500;
const CacheTTL = 15*60*1000; // 15 min

export interface EntitiesCacheParams {
    querySpec: FindQuerySpec,
    maxCount?: number,
    cacheTTL?: number
}
export default class EntitiesCache {
    private _querySpec: FindQuerySpec;
    private _cache: LRUCache<string, Entity>;

    constructor(params: EntitiesCacheParams) {
        this._querySpec = params.querySpec;
        this._cache = new LRUCache({
            max: params.maxCount || CacheMaxEntries,
            ttl: params.cacheTTL || CacheTTL
        })
    }
    async getEntity(entityId) {
        let entity = this._cache.get(entityId);
        if (entity === undefined) {
            entity = await DbManager.getDb().invokeWithConnection({}, async context => {
                return (await context.db.findOne({
                    ...this._querySpec,
                    entityId: entityId
                }, context)).data;
            }, false);
            this._cache.set(entityId, entity);
        }
        return entity;
    }
}