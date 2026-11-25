import StringUtil from "shared/whiz/util/StringUtil";
import { FindQuery, QueryFieldInfo } from "../entities/FindQuery";
import SqlGenerator from "./SqlGenerator";
import { QueryField, QueryFieldClause, FindQuerySpec } from "shared/whiz/entities/QueryDefs";
import { QueryFunction, QueryFunctionUtil } from "shared/whiz/entities/QueryFunction";

const DistinctSql = "DISTINCT {0}";

export default class SqlFindGenerator extends SqlGenerator<FindQuery> {
    generateFinderColumn(queryFieldInfo: QueryFieldInfo, fieldClause: QueryFieldClause) {
        let queryField = queryFieldInfo.queryField;
        if ((fieldClause === QueryFieldClause.GroupBy || fieldClause === QueryFieldClause.OrderBy) && (<any>queryField).selectColumnNum) {
            return {column: String((<any>queryField).selectColumnNum)};
         }   
        let forSelect = fieldClause === QueryFieldClause.Select;
        let column;
        if (!forSelect) {
            let selectField = this.query.getFieldRefs(queryField.field).selectField;
            if (selectField && selectField.alias) {
                column = this.getSqlDb().escapeId(selectField.alias);
            }
        }
        let needsAlias;
        if (!column) {
            column = this.generateColumn(queryFieldInfo.entityFieldInfo, fieldClause);
            let customizedColumn;
            // column could be null from generateColumn if no db column
            if (column) {
                customizedColumn = this.getSqlDb().getSqlColumn(column, queryFieldInfo, this.query, fieldClause);
            }
            if (queryField.generateColumn) {
                customizedColumn = queryField.generateColumn(customizedColumn || column, queryFieldInfo.entityFieldInfo, this, fieldClause);
            } else {
                needsAlias = !!queryFieldInfo.entityFieldInfo.jsonFieldPath;
            }
            if (customizedColumn !== column) {
                column = customizedColumn;
                needsAlias = true;
            }
        }
        let func = queryFieldInfo.queryField.func;
        if (func && column) {
            column = this._generateFunc(column, queryFieldInfo);
            needsAlias = true;
        }
        return {
            column: column,
            needsAlias: forSelect ? needsAlias : undefined
        }
    }

    _generateFunc(column: string, queryFieldInfo: QueryFieldInfo) {
        let queryField = queryFieldInfo.queryField;
        let func = queryField.func;
        let isDistinct;
        if (func === QueryFunction.DistinctCount) {
            func = QueryFunction.Count;
            isDistinct = true;
        } else if (func === QueryFunction.Distinct) {
            func = null;
            isDistinct = true;
        } else if (func === QueryFunction.Count) {
            // use distinct if group by a relation; it is more complicated than that but this may be good enough for similicity
            isDistinct = !!this.query.getGroupByFieldInfos().find(queryFieldInfo => !!queryFieldInfo.entityFieldInfo.relationFields);
            if (!isDistinct && queryField.field === this.query.getEntityType().id) {
                // Count(*) is more efficient, note that in FindQuery.ts we set the field to the id field if the field is null
                column = "*";
            }
        }
        if (isDistinct) {
           column = StringUtil.substitute(DistinctSql, column);
        }
        if (QueryFunctionUtil.isDateAggregate(func)) {
           return this.getSqlDb().getDateAggregateFuncSql(column, queryField, queryFieldInfo.entityFieldInfo);
        }
        // assuming the function names are valid for any database
        return func ? `${func.toUpperCase()}(${column})` : column;
     }
}