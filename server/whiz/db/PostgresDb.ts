
import Postgres, { PoolClient } from "pg";
import PostgresFormat from "pg-format";
import SqlDb, { ExecuteSqlOptions } from "../sql/SqlDb";
import { SqlDbExtension } from "../plugins/ServerPluginDefs";
import * as _ from 'lodash-es';
import { ControllerContext } from "../controllers/ControllerDefs";
import { QueryField, QueryFieldClause, QueryType } from "shared/whiz/entities/QueryDefs";
import logger from "../server/Logger";
import { EntityField, SemanticType } from "shared/whiz/entities/EntityField";
import FieldType from "shared/whiz/entities/FieldType";
import { EntityFieldInfo } from "shared/whiz/entities/EntityType";
import StringUtil from "shared/whiz/util/StringUtil";
import { FindQuery, QueryFieldInfo } from "../entities/FindQuery";

const DefaultPoolSize = 5;
const AnyAggrSql = "MIN({0})";
const BooleanAggrSql = "BOOL_OR({0})";
const JsonValueOperator = "->";
const JsonStrOperator = "->>";
const JsonArraySelect = "ARRAY(SELECT JSONB_ARRAY_ELEMENTS_TEXT({0}->'{1}'))";
const QueryTableColumnsSql = `
SELECT c.column_name, c.data_type, c.character_maximum_length, c.is_nullable, c.column_default, tc.constraint_type 
FROM information_schema.columns c
LEFT JOIN information_schema.key_column_usage kcu
   ON c.table_schema = kcu.table_schema
   AND c.table_name = kcu.table_name
   AND c.column_name = kcu.column_name
LEFT JOIN information_schema.table_constraints tc
   ON kcu.table_schema = tc.table_schema
   AND kcu.table_name = tc.table_name
   AND kcu.constraint_name = tc.constraint_name
   AND tc.constraint_type = 'PRIMARY KEY'
WHERE c.table_name='{0}' AND c.table_schema = 'public';
`;

export default class PostgresDb extends SqlDb {
   private _pool: Postgres.Pool;

   constructor(dbExtension: SqlDbExtension) {
        super(dbExtension);
         Postgres.defaults.parseInt8 = true; // see https://github.com/brianc/node-postgres/pull/427
         // see https://github.com/brianc/node-postgres/issues/429
         Postgres.types.setTypeParser(1114, this._parseDate);
         Postgres.types.setTypeParser(1184, this._parseDate);
   }
   protected getPoolForContext(context: ControllerContext): Postgres.Pool {
      return this.getPool();
   }
   protected async customGetConnection(pool: Postgres.Pool, context: ControllerContext): Promise<PoolClient> {
      return this._pool.connect();
   }
   protected customReleaseConnection(connection: PoolClient) {
      connection.release();
   }
   protected async customExecuteSql(sql: string, context: ControllerContext, options?: ExecuteSqlOptions): Promise<any> {
      const connection: PoolClient = context.connection;
      const isInsert = options?.queryType === QueryType.Create;
      let idField;
      if (isInsert) {
         idField = options.entityType.idField;
         sql += " RETURNING " + idField;
         if (idField !== idField.toLowerCase()) {
            sql += " AS \"" + idField + "\"";
         }
      }
      const rows = (await connection.query(sql)).rows;
      if (isInsert) {
         return {entityId: rows[0][idField]};
      }
      return rows;
   }
    public async batch(promises: []) {
        // Postgres does not support multiple queries on the same connection:
        // (node:48331) DeprecationWarning: Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead.
        const results = [];
        for (const promise of promises) {
            results.push(await promise);
        }
        return results;
   }
   public async getDbFields(tableName, context: ControllerContext): Promise<{
               fields: EntityField[],
               idField: string
           } | null> {
      const sql = StringUtil.substitute(QueryTableColumnsSql, tableName.toLowerCase());
      let columns;
      try {
         columns = await this.executeSql(sql, context, {logMessage: `Query table metadata: ${tableName}`});
      } catch (error) {
         logger.error({err: error}, `Error getting columns for ${tableName}`);
         return null;
      }
      // logger.debug(`***** ${tableName} columns: ${JSON.stringify(columns)}`);
      let idField;
      let fields = columns.map(column => {
         let field = this._getFieldForColumn(column)
         if (column["constraint_type"] === "PRIMARY KEY") {
            if (idField) {
               logger.error(`Multi columns primary keys not supported, table=${tableName}`);
            }
            idField = field.name;
      }
         return field; 
      });
      return {
         fields: fields,
         idField: idField
      }
   }
   public escape(value: any): string {
      return PostgresFormat.literal(value);
   }
   public escapeId(str: string): string {
      return PostgresFormat.ident(str);
   }
   public getLikeOperator() {
      return "ILIKE";
   }
   public supportsJsonObjects() {
      return true;
   }
   public supportsArrays() {
      return true;
   }
    public getSqlColumn(column: string, queryFieldInfo: QueryFieldInfo, query: FindQuery, clause: QueryFieldClause) {
        /*
        This is to address columns in the select but not in Group By:
        column xxx must appear in the GROUP BY clause or be used in an aggregate function
        */
        if (clause === QueryFieldClause.Select && query.hasGroupBy() && !queryFieldInfo.queryField.func) {
            column = StringUtil.substitute(queryFieldInfo.entityFieldInfo.field.type === FieldType.Boolean ? BooleanAggrSql : AnyAggrSql, column);
        }
        return column;
    }
   public getArrayContainsSql(column:string, value: any, fieldInfo: EntityFieldInfo): string {
      if (fieldInfo.jsonFieldPath) {
         return `${column} ? ${value}`;
      }
      return `${value}=ANY(${column})`;
   }
   public getJsonColumnSql(rootFieldName: string, jsonFieldPath: string, fieldInfo: EntityFieldInfo, clause: QueryFieldClause): string {
      const field: EntityField = fieldInfo.field || <any>{};
      if (clause === QueryFieldClause.Select && field.isArray) {
         return StringUtil.substitute(JsonArraySelect, rootFieldName, jsonFieldPath);
      }
      // ->> needs to be for string type so that operands in single quotes work
      let asStr = !field.isArray && (!field.type || field.type === FieldType.String)
      const operator = asStr ? JsonStrOperator : JsonValueOperator;
      return StringUtil.substitute("{0}{1}'{2}'", rootFieldName, operator, jsonFieldPath);
   }
   public getDateAggregateFuncSql(column: string, selectField: QueryField, fieldInfo: EntityFieldInfo): string {
      throw new Error("Method not implemented.");
   }
   // added to be used in PostgresVectorStore
   public getPool() {
      if (!this._pool) {
         this._pool = new Postgres.Pool(Object.assign(_.pick(this.dbOptions, ["user", "database", "password", "port", "host"]), {
               ssl: false,
               max: this.dbOptions.poolSize || DefaultPoolSize
         }));
      }
      return this._pool;
   }
   private _getFieldForColumn(column): EntityField {
      const columnType = column["data_type"];
      const field: EntityField = {name: column["column_name"]};
      this._setFieldType(columnType, field);

      if (column["is_nullable"] === "NO") {
         field.isRequired = true;
         field.hasDbValue = true;
      }
      const defaultValue = column["column_default"];
      if (defaultValue && !defaultValue.startsWith("NULL")) {
         field.hasDbValue = true;
      }
      if (columnType === "ARRAY") {
         field.isArray = true;
      }
      if (field.type === FieldType.String) {
         field.maxLen = column["character_maximum_length"];
      }
      return field;
   }
   private _setFieldType(columnType, field: EntityField) {
      // e.g "character varying", "USER-DEFINED", "integer", "boolean", "bigint", "timestamp without time zone"
      let shortType = columnType;
      let index = columnType.indexOf(" ");
      if (index > 0) {
         shortType = columnType.substring(0, index);
      }
      let type;
      switch (shortType) {
         case "ARRAY":
         case "character":
         case "text":
         case "USER-DEFINED": { // e.g. enum
            type = FieldType.String;
            break;
         }
         case "integer":
         case "bigint": 
         case "double": {
            type = FieldType.Number;
            break;
         }
         case "double":
         case "numeric": {
            type = FieldType.Number;
            field.semanticType = SemanticType.Decimal
            break;
         }
         case "boolean": {
            type = FieldType.Boolean;
            break;
         }
         case "timestamp":
         case "date": {
            type = FieldType.Date;
            break;
         }
         case "jsonb": {
            type = FieldType.JSON;
            break;
         }
         default: {
            throw new Error(`Unexpected column type: ${columnType} for the column ${field.name}`)
         }
      }
      field.type = type;
   }
   private _parseDate = (stringValue) => {
      if (stringValue) {
         let segments = stringValue.split(" ");
         if (segments.length === 2) {
            let timeStr = segments[1];
            stringValue = segments[0] + "T" + timeStr;

            let zoneIndex = timeStr.indexOf("-");
            if (zoneIndex < 0) {
               zoneIndex = timeStr.indexOf("+");
            }
            if (zoneIndex < 0) { // assume utc if no timezone
               stringValue += "Z"
            } else {
               let zoneStr = timeStr.substring(zoneIndex+1);
               if (zoneStr.length === 2) { // e.g 00:00:00-07
                  stringValue += ":00" // the timezone is required by browsers like Chrome to be + or - followed by hh:mm
               }
            }
         }
      }
      return stringValue;
   }
};
