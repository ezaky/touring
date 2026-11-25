import { CreateQueryResult, DeleteQueryResult, QueryField, FindQueryResult, FindQuerySpec, UpdateQueryResult, QueryFieldClause, QueryType } from "shared/whiz/entities/QueryDefs";
import { ControllerContext } from "../controllers/ControllerDefs";
import Database from "../entities/Database";
import SqlFinder from "./SqlFinder";
import { EntityFieldInfo, EntityType } from "shared/whiz/entities/EntityType";
import { FindQuery, QueryFieldInfo, QueryOptions } from "../entities/FindQuery";
import { DeleteQuery, PersistQuery } from "../entities/Query";
import SqlPersister from "./SqlPersister";
import * as _ from 'lodash-es';
import FieldType from "shared/whiz/entities/FieldType";
import DateUtil from "shared/whiz/util/DateUtil";
import SqlDeleter from "./SqlDeleter";
import logger from "../server/Logger";
import { QueryFunction } from "shared/whiz/entities/QueryFunction";

const StartTransactionSql = "START TRANSACTION";
const CommitTransactionSql = "COMMIT";
const RollbackTransactionSql = "ROLLBACK";
const LikeOperator = "LIKE";
const MaxSqlLog = 1000;
const BogusYear = 1970;

let Moment;

export interface ExecuteSqlOptions {
    queryType?: QueryType,
    entityType?: EntityType,
    logMessage?: string
}
export default abstract class SqlDb extends Database {
    protected abstract getPoolForContext(context: ControllerContext): any;
    protected abstract customGetConnection(pool: any, context: ControllerContext): Promise<any>;
    protected abstract customReleaseConnection(connection: any);
    protected abstract customExecuteSql(sql: string, context: ControllerContext, options?: ExecuteSqlOptions): Promise<any>;
    abstract escape(column: string): string;
    abstract escapeId(column: string): string;
    /**
     * Returns the sql for a json field. For example a User entity type may have a profile JSON field that has 
     * a nested general JSON field which has a gender field
     * 
     * @param rootFieldName The top level JSON field. In this example "profile"
     * @param jsonFieldPath In this example "general.gender"
     */
    abstract getJsonColumnSql(rootFieldName: string, jsonFieldPath: string, fieldInfo: EntityFieldInfo, clause: QueryFieldClause): string;
    abstract getArrayContainsSql(column:string, value: any, fieldInfo: EntityFieldInfo): string;
    abstract getDateAggregateFuncSql(column:string, selectField: QueryField, fieldInfo: EntityFieldInfo): string;

    async getConnection(readonly:boolean, context: ControllerContext) {
        let pool: any = this.getPoolForContext(context);
        let connection = await this.customGetConnection(pool, context);
        if (!readonly) {
           try {
              await this.executeSql(StartTransactionSql, {db: this, connection: connection});
           } catch (error) {
              await this.releaseConnection(connection, false);
              throw error;
           }
        }
        return connection;
     }
     async releaseConnection(connection, readonly:boolean, rollback:boolean=false) {
        let error;
        if (!readonly) {
            let sql = rollback ? RollbackTransactionSql : CommitTransactionSql;
            try {
                await this.executeSql(sql, {db: this, connection: connection});
            } catch (rollbackOrCommitError) {
                error = rollbackOrCommitError;
            }
        }
        await this.customReleaseConnection(connection);
        if (error) {
           throw error;
        }
    }
    async find(querySpec: FindQuerySpec, context: ControllerContext, queryOptions: QueryOptions = {}): Promise<FindQueryResult> {
        let sqlFinder = new SqlFinder();
        querySpec = await sqlFinder.adjustQuerySpec(querySpec);
        // save sqlFinder in the context to be used in customFind
        queryOptions.custom = {sqlFinder: sqlFinder};
        return super.find(querySpec, context, queryOptions);
    }
    protected customFind(query:FindQuery, queryOptions: QueryOptions): Promise<FindQueryResult> {
        let sqlFinder = <SqlFinder>queryOptions.custom.sqlFinder;
        return sqlFinder.find(query);
    }
    protected async customCreate(query:PersistQuery): Promise<CreateQueryResult> {
        return new SqlPersister(query).create();
    }
    protected async customUpdate(query:PersistQuery): Promise<UpdateQueryResult> {
        return new SqlPersister(query).update();
    }
    protected async customDelete(query:DeleteQuery): Promise<DeleteQueryResult> {
        return new SqlDeleter(query).delete();
    }
    async executeSql(sql: string, context: ControllerContext, options?: ExecuteSqlOptions) {
        let t1 = Date.now();
        const log = () => {
            const logMessage = options?.logMessage || _.truncate(sql, {length: MaxSqlLog});
            logger.info(`${logMessage} (${Date.now()-t1} ms)`);
        }
        try {
            let result = await this.customExecuteSql(sql, context, options);
            log();
            return result;
        } catch(error) {
            log();
            throw error;
        }
    }
    getLikeOperator() {
        return LikeOperator;
    }
    supportsJsonObjects() {
        return false;
    }  
    supportsArrays() {
        return false;
    }
    getSqlColumn(column: string, queryFieldInfo: QueryFieldInfo, query: FindQuery, clause: QueryFieldClause) {
        return column;
    }
    getSqlValue(value: any, fieldInfo: EntityFieldInfo) {
        const type = fieldInfo.field.type;
        if (type === FieldType.Date) {
            if (!_.isNumber(value)) {
                throw new Error(`Expected a number for the date value of '${fieldInfo.fieldPath}', but got ${JSON.stringify(value)}`);
            }
            return DateUtil.getISOString(value);
        }
        return value;   
    }
   public adjustDateFromQuery(dateValue: string, selectField: QueryField, fieldInfo: EntityFieldInfo) {
      let func = selectField.func;
      let timezone = selectField.timezone;
      let isWeek = func === QueryFunction.AggrWeek;
      if (!timezone && !isWeek) {
         return;
      }
      !Moment && (Moment = require("moment-timezone"));
      let dateForMoment = dateValue;
      if (isWeek) {
         !timezone && (timezone = "UTC");
         dateForMoment = dateForMoment.replace("-", "W");
      }
      if (timezone) {
         let moment = Moment.tz(dateForMoment, timezone);
         // so 1970-1-1 is not returned as 1970-1-1 08:00:00 which would make isNullDate returns false
         if (moment.year() === BogusYear) {
            return;
         }
         let result = moment.utc().format();
         // logger.debug(`**** adjustDateFromQuery: ${dateValue}, ${timezone} --> ${result}`);
         return result;
      }   
   }
}