import { EntityFieldInfo } from "shared/whiz/entities/EntityType";
import { QueryFieldInfo, FindQuery } from "../entities/FindQuery";
import SqlCriteriaGenerator from "./SqlCriteriaGenerator";
import StringUtil from "shared/whiz/util/StringUtil";
import { QueryFieldClause, FindQuerySpec, JoinType, OrderByField, SelectField } from "shared/whiz/entities/QueryDefs";
import { EntityRelationField } from "shared/whiz/entities/EntityRelationField";
import * as _ from 'lodash-es';
import EntityUtil from "shared/whiz/entities/EntityUtil";
import SqlFindGenerator from "./SqlFindGenerator";

const AsSql = "AS {0}";
const JoinSql = "{0} JOIN {1} ON {2}={3}";
const DescSql = "DESC";
const SelectFromSql = "SELECT {0} FROM {1}";
const WhereSql = "WHERE {0}";
const GroupBySql = "GROUP BY {0}";
const OrderBySql = "ORDER BY {0}";
const LimitSql = "LIMIT {0}";
const OffsetSql = "OFFSET {0}";
const CountSelectSql = "COUNT(*)";
const NoFieldsSelect = "1";

/*
    In this class, it is assumed that relationField.multiple can be true only for:
    - fields in aggregate select fields
    - criteria conditions
    - group by fields.
    non-aggregate multiple select fields are excluded in SqlFinder
*/
export default class SqlSelectGenerator extends SqlFindGenerator {
    private _whereSql;
    
    async generate() {
        return this._generate();
    }
    async generateCountSql() {
        return this._generate(true);
    }

    private async _generate(forCount=false) {
        let select, groupBy, orderBy, limit, offset;
        if (!forCount) {
            select = this._generateSelect() || NoFieldsSelect;
            groupBy = this._generateGroupBy();
            orderBy = this._generateOrderBy();
            limit =  this.query.getLimit();
            offset = this.query.getOffset();
        } else {
            select = CountSelectSql;
        }
        let sqlCriteriaGenerator = new SqlCriteriaGenerator(this.query);
        let from = await this._generateFrom(sqlCriteriaGenerator, forCount);
        let sql = StringUtil.substitute(SelectFromSql, select, from);
        // remember this._whereSql to be reused for generationg the count sql
        let criteria = this._whereSql || await sqlCriteriaGenerator.generate();
        if (criteria) {
            sql += " " + StringUtil.substitute(WhereSql, criteria);
        }
        this._whereSql = criteria;
        if (groupBy) {
            sql += " " + StringUtil.substitute(GroupBySql, groupBy);
        }
        if (orderBy) {
            sql += " " + StringUtil.substitute(OrderBySql, orderBy);
        }
        if (limit) {
            sql += " " + StringUtil.substitute(LimitSql, limit);
        }
        if (offset) {
            sql += " " + StringUtil.substitute(OffsetSql, offset);
        }
        return sql;
    }
    private _generateSelect(): string {
        return this._generateFindColumns(this.query.getSelectFieldInfos(), QueryFieldClause.Select, 
                (column, columnInfo, queryFieldInfo) => {
            let fieldInfo = queryFieldInfo.entityFieldInfo;
            let alias = (<SelectField>queryFieldInfo.queryField).alias;
            if (!alias && (fieldInfo.relationFields || columnInfo.needsAlias)) {
                // SqlFinder uses the alias to create the result objects
                alias = fieldInfo.fieldPath;
            }
            if (alias) {
                column += " " + StringUtil.substitute(AsSql, this.getSqlDb().escapeId(alias));
            }
            return column;
        });
    }
    private async _generateFrom(sqlCriteriaGenerator: SqlCriteriaGenerator, forCount: boolean): Promise<string> {
        let query = this.query;
        let fieldInfos: EntityFieldInfo[] = query.getAllFieldInfos();
        let rootJoinInfo = {
            leftEntityTypeId: query.getEntityType().id,
            leftTableNames: this.getTableNamesForRelations(null)
        }
        // let allRelationsJoinType = query.options.canInnerJoin && JoinType.Inner;
        let joinsByRelationPath = {};
        for (let fieldInfo of fieldInfos) {
            let relationFields = fieldInfo.relationFields;
            if (!relationFields || (forCount && !this.query.getFieldRefs(fieldInfo.fieldPath).isCriteriaField)) {
                continue;
            }
            let multiRelationIndex = relationFields.findIndex(relationField => EntityUtil.isMultipleRelation(relationField));
            if (multiRelationIndex >= 0) {
                // better to use inner join when possible
                // allRelationsJoinType = JoinType.Inner;
                let fieldRefs = query.getFieldRefs(fieldInfo.fieldPath);
                if (fieldRefs.isCriteriaField && !fieldRefs.selectField && !fieldRefs.isGroupByField && !fieldRefs.isOrderByField
                        && sqlCriteriaGenerator.isInnerQueryMultiEntityField(fieldInfo)
                ) {
                    // add the joins of the relations up to the multi relation to be used in the id condition 
                    // generated by SqlCriteriaGenerator
                    if (multiRelationIndex === 0) {
                        continue;
                    }
                    relationFields = relationFields.slice(0, multiRelationIndex);
                }
            }
            let leftJoinInfo = rootJoinInfo;
            let relationPath = "";
            for (let i = 0; i < relationFields.length; ++i) {
                let relationField = relationFields[i];
                relationPath = relationPath ? `${relationPath}.${relationField.name}` : relationField.name;
                let rightTableNames = this.getTableNamesForRelations(relationFields.slice(0, i+1));
                let joinInfo = joinsByRelationPath[relationPath];
                if (joinInfo) {
                    leftJoinInfo = joinInfo;
                } else {
                    let joinType = query.getRelationFinderInfo(relationPath)?.joinType;
                    !joinType && (joinType = /*allRelationsJoinType ||*/ JoinType.Left);
                    joinsByRelationPath[relationPath] = {
                        relationPath: relationPath,
                        relationField: relationField,
                        leftEntityTypeId: leftJoinInfo.leftEntityTypeId,
                        leftTableNames: leftJoinInfo.leftTableNames,
                        rightTableNames: rightTableNames,
                        joinType: joinType
                    }    
                }
                leftJoinInfo = Object.assign({...leftJoinInfo}, {
                    leftEntityTypeId: relationField.entityTypeId,
                    leftTableNames: rightTableNames
                });
            }
        }
        let joinInfos = _.values(joinsByRelationPath);
        joinInfos = _.sortBy(joinInfos, "relationPath");
        let result = this._generateFromTable(rootJoinInfo.leftTableNames);
        for (let joinInfo of joinInfos) {
            let segment = await this._generateJoin(joinInfo);
            result && (result += " ");
            result += segment;
        }
        return result;
    }
    private _generateGroupBy() {
        return this._generateFindColumns(this.query.getGroupByFieldInfos(), QueryFieldClause.GroupBy);
    }
    private _generateOrderBy() {
        return this._generateFindColumns(this.query.getOrderByFieldInfos(), QueryFieldClause.OrderBy, (column, columnInfo, queryFieldInfo) => {
            if ((queryFieldInfo.queryField as OrderByField).descending) {
                column += ` ${DescSql}`;
            }
            return column;
        });
    }
    private _generateFindColumns(queryFieldInfos: QueryFieldInfo[], clause: QueryFieldClause, 
            adjuster?: (column: string, columnInfo, queryFieldInfo: QueryFieldInfo) => string) {
        if (_.isEmpty(queryFieldInfos)) {
            return;
        }
        let result = "";
        for (let queryFieldInfo of queryFieldInfos) {
            let columnInfo = this.generateFinderColumn(queryFieldInfo, clause);
            let column = columnInfo.column;
            // could be null if no db column for example
            if (!column) {
                continue;
            }
            if (adjuster) {
                column = adjuster(column, columnInfo, queryFieldInfo);
                if (!column) {
                    continue;
                }
            }
            result && (result += ", ");
            result += column;
        }
        return result;
    }
    private async _generateJoin(joinInfo): Promise<string> {
        let relationField: EntityRelationField = joinInfo.relationField;
        let rightTableRef = joinInfo.rightTableNames.refName;
        let sql = StringUtil.substitute(JoinSql, joinInfo.joinType.toUpperCase(),
            this._generateFromTable(joinInfo.rightTableNames),
            `${joinInfo.leftTableNames.refName}.${relationField.sourceIdField}`,
            `${rightTableRef}.${relationField.targetIdField}`
        );
        // junctionTargetCriteria is ignored for now
        let extraCriteria = relationField.targetCriteria || {};
        FindQuery.iterateEntityTypeDataHandlers(relationField.entityTypeId, dataHandler => {
            _.extend(extraCriteria, dataHandler.getJoinCriteria(this.query, relationField.entityTypeId));
        });
        if (!_.isEmpty(extraCriteria)) {
            // targetCriteria should be added in the JOIN ON conditions for single relations, and could be added 
            // as WHERE conditions or JOIN ON conditions for multiple relations. Here we are adding them in the JOIN ON 
            // because it is easier in this case
            let querySpec: FindQuerySpec = {
                entityTypeId: relationField.entityTypeId,
                fields: [],
                criteria: extraCriteria
            }
            let query = await FindQuery.instantiate(querySpec, this.query.getContext(), {
                mainTableAlias: rightTableRef,
                forSelect: false
            });
            let extraWhereSql = await new SqlCriteriaGenerator(query).generate();
            sql += " AND " + extraWhereSql;
        }
        return sql;
    }
    private _generateFromTable(tableNames: {name: string, alias?: string, refName: string}): string {
        let result = tableNames.name;
        if (tableNames.alias) {
            result += " " + StringUtil.substitute(AsSql, tableNames.alias);
        }
        return result;
    }
}
