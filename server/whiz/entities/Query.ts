import { EntityType } from "shared/whiz/entities/EntityType";
import { CreateQueryResult, DeleteQueryResult, DeleteQuerySpec, PersistQuerySpec, QuerySpec, QueryType, UpdateQueryResult, CriteriaCondition, Criteria } from "shared/whiz/entities/QueryDefs";
import { ControllerContext } from "../controllers/ControllerDefs";
import EntitiesDataHandler from "./EntitiesDataHandler";
import * as _ from 'lodash-es';
import Database from "./Database";
import ModuleLoader from "shared/whiz/plugins/ModuleLoader";
import { EntitiesDataHandlerExtension, EntitiesDataHandlerPointId, ModuleSpec } from "../plugins/ServerPluginDefs";
import PluginsManager from "shared/whiz/plugins/PluginsManager";
import QueryUtil from "./QueryUtil";
import { Operator } from "shared/whiz/entities/Operator";
import { Class } from "shared/whiz/util/CommonDefs";
import EntityUtil from "shared/whiz/entities/EntityUtil";

let dataHandlerModulesByEntityType: {[entityTypeId: string]: Class[]};
let globalDataHandlerModules: Class[] = [];

export interface QueryOptions {
    queryType?: QueryType,
    mainTableAlias?: string,
    canInnerJoin?: boolean,
    forSelect?: boolean,
    // see SqlDb for a usage example
    custom?: {[key: string]: any}
}
export interface PreventDefaultInfo {
    preventDefault: true,
    preventRelationsDefault?: boolean,
    result?: CreateQueryResult | UpdateQueryResult | DeleteQueryResult
}
export class Query<T extends QuerySpec = QuerySpec> {
    public options: QueryOptions;
    protected querySpec: T;
    protected entityType: EntityType;
    protected criteria: Criteria;
    private context: ControllerContext;
    private queryType: QueryType;
    private dataHandlers;
    private preventDefaultInfo;

    constructor(querySpec: T, context: ControllerContext, options: QueryOptions) {
        this.options = options;
        this.context = context;
        this.queryType = options.queryType;
        if (!this.queryType) {
            throw new Error("queryType required");
        }
        this.entityType = EntityType.getEntityType(querySpec.entityTypeId);

        if (querySpec.entityId) {
            if (querySpec.criteria) {
                throw new Error("criteria cannot be specified if entityId is specified");
            }
            let idField = this.entityType.idField;
            if (!idField) {
                throw new Error(`entityId is specified but the entity type ${querySpec.entityTypeId} does not have an id field`);
            }
            querySpec = {
                ...querySpec,
                criteria: {[idField]: querySpec.entityId}
            }
        }

        this.querySpec = querySpec;

        this.criteria = querySpec.criteria ? _.cloneDeep(querySpec.criteria) : {};
        if (_.isArray(this.criteria)) {
            throw new Error(`query criteria should be an {}} not an array: ${JSON.stringify(this.criteria)}`);
        }
    }
    getQueryType(): QueryType {
        return this.queryType;
    }
    getContext(): ControllerContext {
        return this.context;
    }
    getDb(): Database {
        return this.context.db;
    }
    getEntityType(): EntityType {
        return this.entityType
    }
    getCriteria() {
        return this.criteria;
    }
    addCriteria(criteria: Criteria) {
        this.criteria = EntityUtil.addCriteria(this.criteria, criteria);
    }
    getHandlerParams(): {[key: string]: any} {
        return this.querySpec.handlerParams;
    }
    setPreventDefaultInfo(info: PreventDefaultInfo) {
        this.preventDefaultInfo = info;
    }
    getPreventDefaultInfo(): PreventDefaultInfo {
        return this.preventDefaultInfo;
    }
    getFieldCondition(fieldName): CriteriaCondition {
        let condition: CriteriaCondition;
        QueryUtil.iterateCriteriaFields(this.entityType, this.criteria, (fieldInfo, object) => {
            if (fieldInfo.fieldPath === fieldName) {
                condition = QueryUtil.getFieldCriteriaCondition(fieldInfo, object[fieldName]);
                return false; // stop iterating
            }
        });
        return condition;
    }
    getEntityIds() {
        let condition: CriteriaCondition = this._getIdFieldCondition();
        if (!condition) {
            return;
        }
        let operand = condition.operand;
        !_.isArray(operand) && (operand = [operand]);
        return operand;
    }
    getEntityId() {
        let entityIds = this.getEntityIds();
        if (entityIds && entityIds.length === 1) {
           return entityIds[0];
        }
    }
    requireEntityId() {
        const entityId = this.getEntityId();
        if (!entityId) {
            throw new Error(`Expected entityId in the querySpec: ${JSON.stringify(this.querySpec)}`);
        }
        return entityId;
    }
    async iterateDataHandlers(iteratee: (dataHandler: EntitiesDataHandler) => any, parallel=false) {
        if (!this.dataHandlers) {
           this.dataHandlers = await Query._getDataHandlersForEntityType(this.entityType.id);
        }
        return Query._iterateDataHandlers(this.dataHandlers, iteratee, parallel);
    }
    static async iterateEntityTypeDataHandlers(entityTypeId: string, 
            iteratee: (dataHandler: EntitiesDataHandler) => any, parallel=false) {
        let dataHandlers = await Query._getDataHandlersForEntityType(entityTypeId);
        return Query._iterateDataHandlers(dataHandlers, iteratee, parallel);
    }
    
    private _getIdFieldCondition(fixedIdsOnly=true): CriteriaCondition {
        let idFieldName = this.entityType.idField;
        if (!idFieldName) {
           return;
        }
        let condition: CriteriaCondition = this.getFieldCondition(idFieldName);
        if (!condition || !fixedIdsOnly) {
           return condition;
        }
        let operator = condition.operator;
        if (operator === Operator.Eq || operator === Operator.In || operator === Operator.NotIn) {
           return condition;
        }
    }
    private static async _iterateDataHandlers(dataHandlers: EntitiesDataHandler[], 
            iteratee: (dataHandler: EntitiesDataHandler) => any, parallel) {
        if (_.isEmpty(dataHandlers)) {
            return;
        }
        if (parallel) {
            let promises = dataHandlers.map(dataHandler => iteratee(dataHandler));
            await Promise.all(promises);
        } else {
            for (let dataHandler of dataHandlers) {
                await iteratee(dataHandler);
            }
        }
    }
    private static async _getDataHandlersForEntityType(entityTypeId) {
        if (!dataHandlerModulesByEntityType) {
            await Query._initDataHandlers();
        }
        // if dataHandlers are in both the entityType and EntitiesDataHandlerPointId then the entityType one is
        // executed first. This is, for example, so the latter may check on query criteria added by the former
        // before adding its own criteria (e.g. tenantId)
        let handlerModules: Class[] = [...dataHandlerModulesByEntityType[entityTypeId] || [], ...globalDataHandlerModules];
        return handlerModules.map(handlerModule => new handlerModule());
    }
    private static async _initDataHandlers() {
        dataHandlerModulesByEntityType = {};
        let addDataHandlerModule = async (entityTypeIds, moduleSpec: ModuleSpec) => {
            let handlerClass = await ModuleLoader.load(moduleSpec);
            if (entityTypeIds === "*") {
                globalDataHandlerModules.push(handlerClass);
                return;
             }
             for (let entityTypeId of entityTypeIds) {
                let handlerModuleSpecs = dataHandlerModulesByEntityType[entityTypeId];
                if (!handlerModuleSpecs) {
                    handlerModuleSpecs = dataHandlerModulesByEntityType[entityTypeId] = [];
                }
                handlerModuleSpecs.push(handlerClass)
             }
        }
        for (let extension of EntityType.getEntityTypeExtensions()) {
            let moduleSpec = extension.dataHandler;
            if (moduleSpec) {
               await addDataHandlerModule([extension.id], moduleSpec);
            } 
        }
        for (let extension of PluginsManager.getExtensions<EntitiesDataHandlerExtension>(EntitiesDataHandlerPointId)) {
            await addDataHandlerModule(extension.entityTypeIds, extension.module);
        }
     }
}

export class PersistQuery extends Query<PersistQuerySpec> {
    private _entity;

    constructor(querySpec: PersistQuerySpec, context: ControllerContext, options: QueryOptions) {
        super(querySpec, context, options);
        if (this.getQueryType() === QueryType.Update && _.isEmpty(this.getCriteria())) {
            throw new Error("Update queries should specify one of entityId or criteria in the querySpec.");
        }
        this._entity = querySpec.entity;
        this._validateEntityFields();
    }
    getEntity() {
        return this._entity;
    }
    setEntity(entity) {
        this._entity = entity;
    }
    
    private _validateEntityFields() {
        let entityType = this.getEntityType();
        for (let fieldName in this._entity) {
            let fieldOrRelation = entityType.getField(fieldName, false) || entityType.getRelationField(fieldName, false);
            if (!fieldOrRelation) {
                throw new Error(`Invalid field name "${fieldName}" for the entity type "${entityType.id}"`);
            }
        }
    }
}

export class DeleteQuery  extends Query<DeleteQuerySpec> {
    constructor(querySpec: DeleteQuerySpec, context: ControllerContext, options: QueryOptions) {
        super(querySpec, context, options);
        if (_.isEmpty(this.getCriteria())) {
            throw new Error("Delete queries should specify one of entityId or criteria in the querySpec.");
        }
    }
}