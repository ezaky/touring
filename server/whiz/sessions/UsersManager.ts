import StateManager from "./StateManager";
import { LRUCache } from 'lru-cache';
import { ServerSessionUserData } from "./ServerSessionDefs";

const StateName = "UserData";
const CacheMaxEntries = 1000;
const CacheTTL = 10*60*1000; // 10 min

class UsersManager {
    private _cache:LRUCache<string, ServerSessionUserData>;

    constructor() {
        this._cache = new LRUCache({
            max: CacheMaxEntries,
            ttl: CacheTTL
        })
    }
    async getUserDataForToken(sessionToken:string):Promise<ServerSessionUserData> {
        let userData:ServerSessionUserData = this._cache.get(sessionToken);
        if (userData) {
            return userData;
        }
        userData = await StateManager.getValue(sessionToken, StateName);
        if (userData) {
            this._cache.set(sessionToken, userData);
        }
        return userData;
    }
    isCachedToken(sessionToken:string):boolean {
        return this._cache.has(sessionToken);
    }
    async addUserData(userData:ServerSessionUserData) {
        let sessionToken = userData.sessionToken;
        await StateManager.setValue(sessionToken, StateName, userData.tenantId, userData);
        this._cache.set(sessionToken, userData);
    }
    async removeUserData(sessionToken) {
        this._cache.delete(sessionToken);
        await StateManager.deleteAllKeys(sessionToken);
    }
}
export default new UsersManager();