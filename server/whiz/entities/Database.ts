import { EntityField } from "shared/whiz/entities/EntityField";
import { DbExtension, DbOptions } from "../plugins/ServerPluginDefs";
import { CreateQueryResult, PersistQuerySpec, FindQueryResult, FindQuerySpec, UpdateQueryResult, QueryType, DeleteQuerySpec, DeleteQueryResult } from "shared/whiz/entities/QueryDefs";
import { FindQuery, QueryOptions } from "./FindQuery";
import { DeleteQuery, PersistQuery } from "./Query";
import * as _ from 'lodash-es';
import logger from "../server/Logger";
import { ControllerContext } from "../controllers/ControllerDefs";

export default abstract class Database {
    dbExtension: DbExtension;
    dbOptions: DbOptions;

    constructor(dbExtension: DbExtension) {
        this.dbExtension = dbExtension;
        this.dbOptions = dbExtension.dbOptions;
        logger.info(`Using ${dbExtension.label} @ ${this.dbOptions.host || this.dbOptions.socketPath}`);
    }

     // context is of type ControllerContext but is not imported to avoid circular dependency
    abstract getConnection(readonly:boolean, context:any): Promise<any>;

    abstract releaseConnection(connection, readonly:boolean, rollback:boolean): Promise<any>;

    abstract getDbFields(tableName, context): Promise<{
            fields: EntityField[],
            idField: string
        } | null>;

    protected abstract customFind(query:FindQuery, queryOptions: QueryOptions): Promise<FindQueryResult>;

    protected abstract customCreate(query:PersistQuery): Promise<CreateQueryResult>;

    protected abstract customUpdate(query:PersistQuery): Promise<UpdateQueryResult>;
    
    protected abstract customDelete(query:DeleteQuery): Promise<DeleteQueryResult>;

    // context is of type ControllerContext but is not imported to avoid circular dependency
    getDatabaseName(context:any) {
        return this.dbOptions.database;
    }  
    // context is of type ControllerContext but is not imported to avoid circular dependency
    async find(querySpec:FindQuerySpec, context:any, queryOptions: QueryOptions = {}): Promise<FindQueryResult> {
        let query = await FindQuery.instantiate(querySpec, context, queryOptions);
        let result = await this.customFind(query, queryOptions);
        let entities = result.data;
        if (entities.length) {
            await query.iterateDataHandlers(dataHandler => {
                return dataHandler.postFind(result, query);
            }, true /*parallel*/);
        }
        if (query.getEntityId()) {
            result.data = entities[0];
        }
        return result;
    }
    // context is of type ControllerContext but is not imported to avoid circular dependency
    async findOne(querySpec: FindQuerySpec, context: any): Promise<FindQueryResult> {
        let result = await this.find(querySpec, context);
        let entities = result.data;
        // could be an id condition criteria the result is 1 entity
        if (_.isArray(entities)) {
            if (entities.length > 1) {
                throw new Error("Unexpected multiple matches.");
             }
             result.data = entities[0];
        }
        return result;
    }
    async requireOne(querySpec: FindQuerySpec, context: any): Promise<FindQueryResult> {
        const result = await this.findOne(querySpec, context);
        if (!result?.data) {
            throw new Error(`Entity not found`);
        }
        return result;
    }
    // context is of type ControllerContext but is not imported to avoid circular dependency
    async create(querySpec:PersistQuerySpec, context:any): Promise<CreateQueryResult> {
        let query: PersistQuery = new PersistQuery(querySpec, context, {queryType: QueryType.Create});
        await query.iterateDataHandlers(dataHandler => {
            return dataHandler.preCreate(query);
        });
        let preventDefaultInfo = query.getPreventDefaultInfo();
        if (preventDefaultInfo && preventDefaultInfo.preventDefault) {
            return <CreateQueryResult>preventDefaultInfo.result;
        }
        let result = await this.customCreate(query);
        await query.iterateDataHandlers(dataHandler => {
            return dataHandler.postCreate(result, query);
        });
        return result;  
    }
    async update(querySpec:PersistQuerySpec, context:any): Promise<UpdateQueryResult> {
        let query: PersistQuery = new PersistQuery(querySpec, context, {queryType: QueryType.Update});
        await query.iterateDataHandlers(dataHandler => {
            return dataHandler.preUpdate(query);
        });
        let preventDefaultInfo = query.getPreventDefaultInfo();
        if (preventDefaultInfo && preventDefaultInfo.preventDefault) {
            return <UpdateQueryResult>preventDefaultInfo.result;
        }
        let result = await this.customUpdate(query);
        await query.iterateDataHandlers(dataHandler => {
            return dataHandler.postUpdate(result, query);
        });
        return result;  
    }
    async delete(querySpec:DeleteQuerySpec, context:any): Promise<DeleteQueryResult> {
        let query: DeleteQuery = new DeleteQuery(querySpec, context, {queryType: QueryType.Delete});
        await query.iterateDataHandlers(dataHandler => {
            return dataHandler.preDelete(query);
        });
        let preventDefaultInfo = query.getPreventDefaultInfo();
        if (preventDefaultInfo && preventDefaultInfo.preventRelationsDefault !== false) {
            return <DeleteQueryResult>preventDefaultInfo.result;
        }   
        let result = await this.customDelete(query);
        if (!preventDefaultInfo) {
            await query.iterateDataHandlers(dataHandler => {
                return dataHandler.postDelete(result, query);
            });    
        }
        return result;  
    }
    // context is of type ControllerContext but is not imported to avoid circular dependency
    async invokeWithConnection(context, func: (context) => any,  readonly = false) {
        const connection = await this.getConnection(readonly, context);
        const funcContext: any = {...context, db: this, connection};
        let result, error;
        try {
           result = await func(funcContext);
        } catch (asyncError) {
           error = asyncError;
        }
        await this.releaseConnection(connection, readonly, !!error);
        if (error) {
            throw error;
        }
        return result;
     }
    async batch(promises: any[]) {
        return Promise.all(promises);
   }
}