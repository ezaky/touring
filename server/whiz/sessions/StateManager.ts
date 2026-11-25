import { FindQuerySpec } from "shared/whiz/entities/QueryDefs";
import DbManager from "../entities/DbManager";
import StringUtil from "shared/whiz/util/StringUtil";
import { EntityType } from "shared/whiz/entities/EntityType";

const TenantStateEntityType = "whiz.tenantState";
const StateTTLSeconds = 6*60*60; // 6 hours
const SetValueSql = `INSERT INTO tenant_states (session_token, state_name, tenant_id, state_value, expires_at) 
    VALUES ({0}, {1}, {2}, {3}, {4}) 
    ON CONFLICT (session_token, state_name) DO UPDATE SET state_value=EXCLUDED.state_value, expires_at=EXCLUDED.expires_at`;

class StateManager {
    async getValueAndTenant(sessionToken, stateName) {
        let db = DbManager.getDbForEntityType(TenantStateEntityType);
        return db.invokeWithConnection({}, async (context) => {
            const querySpec:FindQuerySpec = {
                entityTypeId: TenantStateEntityType,
                fields: ["state_value", "tenant_id"],
                criteria: {
                    session_token: sessionToken,
                    state_name: stateName
                }
            }
            let state = (await context.db.findOne(querySpec, {
                ...context,
                bypassTenantIdCriteria: true
            })).data;
            let value = state?.state_value;
            if (value && !context.db.supportsJsonObjects()) {
                value = JSON.parse(value);
            }
            return value ? {value, tenantId: state?.tenant_id} : null;
        });
    }
    async getValue(sessionToken, stateName) {
        return (await this.getValueAndTenant(sessionToken, stateName))?.value;
    }
    async hasKey(sessionToken, stateName) {
        let db = DbManager.getDbForEntityType(TenantStateEntityType);
        return db.invokeWithConnection({}, async (context) => {
            const querySpec:FindQuerySpec = {
                entityTypeId: TenantStateEntityType,
                fields: ["id"],
                criteria: {
                    session_token: sessionToken,
                    state_name: stateName
                }
            }
            let state = (await context.db.findOne(querySpec, {
                ...context,
                bypassTenantIdCriteria: true
            })).data;
            return !!state;
        }, true);
    }
    async setValue(sessionToken, stateName, tenantId, value, ttlSeconds=StateTTLSeconds) {
        let db:any = DbManager.getDbForEntityType(TenantStateEntityType);
        value && (value = JSON.stringify(value));
        const expiresAt:number = Date.now() + ttlSeconds * 1000;
        let datestr = db.getSqlValue(expiresAt, EntityType.getEntityType(TenantStateEntityType).getFieldInfo("expires_at"));
        await db.invokeWithConnection({}, async (context) => {
            db.executeSql(StringUtil.substitute(SetValueSql, 
                db.escape(sessionToken), 
                db.escape(stateName), 
                db.escape(tenantId), 
                db.escape(value), 
                db.escape(datestr)), context)
        });
    }
    async deleteKey(sessionToken, stateName) {
        return this._delete(sessionToken, stateName);
    }
    async deleteAllKeys(sessionToken) {
        return this._delete(sessionToken);
    }
    private async _delete(sessionToken, stateName?) {
        let db:any = DbManager.getDbForEntityType(TenantStateEntityType);
        let criteria = {session_token: sessionToken};
        stateName && (criteria["state_name"] = stateName);
        db.invokeWithConnection({bypassTenantIdCriteria: true}, async (context) => {
            db.delete({
                entityTypeId: TenantStateEntityType,
                criteria: criteria
            }, context)
        });
    }
}
export default new StateManager();