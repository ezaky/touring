import SqlFindGenerator from "./SqlFindGenerator";
import { QueryFieldInfo, FindQuery } from "../entities/FindQuery";
import { Operator, OperatorUtil } from "shared/whiz/entities/Operator";
import StringUtil from "shared/whiz/util/StringUtil";
import { EntityFieldInfo, EntityType } from "shared/whiz/entities/EntityType";
import SqlSelectGenerator from "./SqlSelectGenerator";
import { QueryFieldClause, FindQuerySpec } from "shared/whiz/entities/QueryDefs";
import * as _ from 'lodash-es';
import QueryUtil from "../entities/QueryUtil";
import ArrayUtil from "shared/whiz/util/ArrayUtil";
import EntityUtil from "shared/whiz/entities/EntityUtil";

const BetweenOperandSql = "{0} AND {1}";
const NotConditions = "NOT ({0})";
const ImpliedNullSql = "({0} OR {1})";

export default class SqlCriteriaGenerator extends SqlFindGenerator {
    private _multiRelationInfos = [];

    constructor(query: FindQuery) {
        super(query);
    }
    async generate(): Promise<string> {
        let criteria = this.query.getCriteria();
        if (!criteria) {
            return;
        }
        let sql = this._generate(criteria, Operator.And);
        if (this._multiRelationInfos.length) {
            sql = await this._generateMultiRelationConditions(sql);
        }
        return sql;
}
    isInnerQueryMultiEntityField(fieldInfo: EntityFieldInfo) {
        return !this.query.isAggregatedMultiEntityField(fieldInfo);
    }

    private _generate(criteria, logicalOperator: Operator, level=0): string {
        let conditionsSqls = [];
        if (_.isArray(criteria)) {
            conditionsSqls = ArrayUtil.mapAndFilter(criteria, item => this._generate(item, logicalOperator, level));
        } else {
            for (let key in criteria) {
                let queryFieldInfo: QueryFieldInfo = this.query.getCriteriaFieldInfo(key);
                if (queryFieldInfo) {
                    let conditionSql = this._generateCondition(queryFieldInfo, criteria[key], logicalOperator, level);
                    // conditionSql could be null from _generateMultiRelationPlaceholder
                    conditionSql && conditionsSqls.push(conditionSql);
                } else {
                    if (key !== Operator.And && key !== Operator.Or && key !== Operator.Not) {
                        throw new Error(`Expected "${key}" to be a ${this.query.getEntityType().id} field name, or one of ${Operator.And}, ${Operator.Or}, ${Operator.Not}: ${JSON.stringify(criteria)}`);
                    }
                    let operator: Operator = <Operator>key;
                    let isNot = operator === Operator.Not;
                    let sql2 = this._generate(criteria[key], isNot ? Operator.And : operator, level+1);
                    if (sql2) {
                        if (isNot) {
                            sql2 = StringUtil.substitute(NotConditions, sql2);
                        }
                        conditionsSqls.push(sql2);
                    }
                }
            }
        }
        if (conditionsSqls.length) {
            let sql = conditionsSqls.join(` ${this._getLogicalOperatorSql(logicalOperator)} `);
            if (conditionsSqls.length > 1 && logicalOperator === Operator.Or) {
                sql = `(${sql})`;
            }
            return sql
        }
    }
    private _generateCondition(queryFieldInfo: QueryFieldInfo, criteriaNode: any, logicalOperator: Operator, level: number) {
        let fieldInfo = queryFieldInfo.entityFieldInfo;
        let condition = QueryUtil.getFieldCriteriaCondition(fieldInfo, criteriaNode)
        let operator = condition.operator;
        let operand = condition.operand;
        let multiRelation = this.query.getMultiRelationForField(fieldInfo);
        if (multiRelation && !this.query.isAggregatedMultiEntityField(fieldInfo)) {
            return this._generateMultiRelationPlaceholder(queryFieldInfo, operator, operand, logicalOperator, level);
        }
        return this._generateSimpleCondition(queryFieldInfo, operator, operand, logicalOperator, level);
    }
    private _generateSimpleCondition(queryFieldInfo: QueryFieldInfo, operator: Operator, operand: any, 
            logicalOperator: Operator, level: number) {
        let fieldInfo = queryFieldInfo.entityFieldInfo;
        let field = fieldInfo.field;
        let isNull = operand === null;
        let column = this.generateFinderColumn(queryFieldInfo, QueryFieldClause.Where).column;
        let sql;
        if (field.isArray && !isNull) {
            sql = this._generateArrayCondition(fieldInfo, column, operator, operand, logicalOperator);
        } else {
            let template = this._getConditionTemplate(operator, isNull);
            let operandSql: string;
            if (!isNull) { // see _getConditionTemplate in this case
                operandSql = this._generateConditionOperand(queryFieldInfo, operator, operand)
            } else {
                operandSql = "";
            }
            sql = StringUtil.substitute(template, column, operandSql);
        }
        if (!isNull && OperatorUtil.isExclude(operator) && !field.hasDbValue) {
           let nullSql = this._generateSimpleCondition(queryFieldInfo, Operator.Eq, null, logicalOperator, level);
           sql = StringUtil.substitute(ImpliedNullSql, sql, nullSql);
        }
        return sql;  
    }
    private _getConditionTemplate(operator: Operator, isNull=false) {
        switch (operator) {
            case Operator.Eq: {
                if (isNull) {
                    return "{0} IS NULL"
                }
                return "{0} = {1}";
            }
            case Operator.NotEq: {
                if (isNull) {
                    return "{0} IS NOT NULL"
                }
                return "{0} != {1}";
            }
            case Operator.LT: {
                return "{0} < {1}";
            }
            case Operator.LEq: {
                return "{0} <= {1}";
            }
            case Operator.GT: {
                return "{0} > {1}";
            }
            case Operator.GEq: {
                return "{0} >= {1}";
            }
            case Operator.In: {
                return "{0} IN ({1})";
            }
            case Operator.NotIn: {
                return "{0} NOT IN ({1})";
            }
            case Operator.Between: {
                return "{0} BETWEEN {1}";
            }
            case Operator.NotBetween: {
                return "{0} NOT BETWEEN {1}";
            }
            case Operator.Like: {
                return `{0} ${this.getSqlDb().getLikeOperator()} {1}`;
            }
            case Operator.NotLike: {
                return `{0} NOT ${this.getSqlDb().getLikeOperator()} {1}`;
            }
            default: {
                throw new Error(`Invalid operator: ${operator}`);
            }
        }
     }
     private _getLogicalOperatorSql(operator: Operator) {
        switch (operator) {
            case Operator.And: {
                return "AND";
            }
            case Operator.Or: {
                return "OR";
            }
            // Operator.Not is handled separately
            default: {
                throw new Error(`Unexpected logical operator: ${operator}`);
            }
        }
     }
     private  _generateConditionOperand(queryFieldInfo: QueryFieldInfo, operator: Operator, operand): string {
        let fieldInfo = queryFieldInfo.entityFieldInfo;
        switch (operator) {
            case Operator.Between:
            case Operator.NotBetween: {
                if (operand.length !== 2) {
                    throw new Error("The between operators expects an array of 2 items.");
                 }
                return StringUtil.substitute(BetweenOperandSql, 
                     this.generateColumnValue(fieldInfo, operand[0]), 
                     this.generateColumnValue(fieldInfo, operand[1]));
            }
            case Operator.Like:
            case Operator.NotLike: {
                if (operand.indexOf("*") >= 0) {
                    operand = operand.replace(/\*/g, "%");
                } else {
                    operand = `%${operand}%`;
                }
                break;
            }
        }
        return this.generateColumnValue(fieldInfo, operand);
     }
     private _generateArrayCondition(fieldInfo: EntityFieldInfo, column: string, operator: Operator, operand: any, 
            logicalOperator: Operator): string {
        let db = this.getSqlDb();
        let itemSqls = operand.map(item => {
            return db.getArrayContainsSql(column, this.generateColumnValue(fieldInfo, item), fieldInfo);
        });
        // operator is one of Operator.Some, Operator.Every, Operator.None
        let conditionsOperator = operator === Operator.Every ? Operator.And : Operator.Or;
        let sql = itemSqls.join(` ${this._getLogicalOperatorSql(conditionsOperator)} `);
        if (operator === Operator.None) {
            sql = StringUtil.substitute(NotConditions, sql);
        } else if (logicalOperator !== conditionsOperator && operand.length > 1) {
            sql = `(${sql})`;
        }
        return sql;         
    }
    private _generateMultiRelationPlaceholder(queryFieldInfo: QueryFieldInfo, operator: Operator, operand: any, 
            logicalOperator: Operator, level: number) {
        let relationInfo = this.query.getMultiRelationInfo(queryFieldInfo.entityFieldInfo);
        let multiRelationField = relationInfo.multiRelationField;
        let isExclude;
        if (operand === null) {
            isExclude = operator === Operator.Eq;
        } else {
            isExclude = OperatorUtil.isExclude(operator);
        }
        let multiRelationInfo = this._multiRelationInfos.find(multiRelationInfo => {
            return multiRelationInfo.level === level
                && multiRelationInfo.isExclude === isExclude
                && multiRelationInfo.relationField.name === multiRelationField.name
        });
        let combined = !!multiRelationInfo;
        if (!combined) {            
            multiRelationInfo = {
                relationField: multiRelationField,
                conditionIdFieldPath: relationInfo.sourceIdFieldPath,
                level: level,
                isExclude: isExclude,
                logicalOperator: logicalOperator,
                placeholder: `##${_.uniqueId()}##`,
                conditionInfos: []
            }
            this._multiRelationInfos.push(multiRelationInfo)
        }
        let fieldName = queryFieldInfo.entityFieldInfo.field.name;
        let multiRelationFields = relationInfo.multiRelationFields;
        if (multiRelationFields.length) {
            fieldName = `${EntityUtil.getRelationsPath(multiRelationFields)}.${fieldName}`;
        }
        multiRelationInfo.conditionInfos.push({
            field: fieldName,
            operator: operator,
            operand: operand
        });
        if (combined) {
            return null;
        }
        return multiRelationInfo.placeholder;
    }
    private async _generateMultiRelationConditions(sql: string): Promise<string> {
        for (let multiRelationInfo of this._multiRelationInfos) {
            let conditionSql = await this._generateMultiRelationCondition(multiRelationInfo);
            sql = sql.replace(multiRelationInfo.placeholder, conditionSql);
        }
        return sql;
    }
    private async _generateMultiRelationCondition(multiRelationInfo): Promise<string> {
        // logger.debug(`*** _generateMultiRelationCondition: ${JSON.stringify(multiRelationInfo)}`);
        let relationField = multiRelationInfo.relationField;
        let isExclude = multiRelationInfo.isExclude;
        let criteria = {};
        let conditionInfos = multiRelationInfo.conditionInfos;
        const relationEntityType = EntityType.getEntityType(relationField.entityTypeId);
        for (let conditionInfo of conditionInfos) {
            // the condition on the null/not-null id field is added in the query spec to mean existence of a matching 
            // row in the target table, it is not meaningful to generate
            if (conditionInfo.operand === null && conditionInfo.field === relationEntityType.idField) {
                continue;
            }
            let operator: Operator = conditionInfo.operator;
            if (isExclude) {
                operator = SqlCriteriaGenerator._negateOperator(operator);
            }
            criteria[conditionInfo.field] = {[operator]: conditionInfo.operand};
        }
        if (conditionInfos.length > 1) {
            let logicalOperator = multiRelationInfo.logicalOperator;
            if (isExclude) {
                logicalOperator = logicalOperator === Operator.Or ? Operator.And : Operator.Or;
            }
            if (logicalOperator === Operator.Or) {
                criteria = {[Operator.Or]: criteria}
            }
        }
        Object.assign(criteria, FindQuery.getRelationFieldCriteria(relationField));
        let querySpec: FindQuerySpec = {
            entityTypeId: relationField.entityTypeId,
            fields: [relationField.targetIdField],
            criteria: criteria
        }
        let generator = new SqlSelectGenerator(await FindQuery.instantiate(querySpec, this.query.getContext(), {canInnerJoin: true}));
        let innerSql = await generator.generate();
        return StringUtil.substitute(this._getConditionTemplate(isExclude ? Operator.NotIn : Operator.In), 
            this.generateColumn(multiRelationInfo.conditionIdFieldPath, QueryFieldClause.Where), innerSql);
    }
    private static _negateOperator(operator: Operator): Operator {
        switch (operator) {
            case Operator.NotEq: {
                return Operator.Eq;
            }
            // Operator.Eq can happen if operand is null
            case Operator.Eq: {
                return Operator.NotEq;
            }
            case Operator.NotIn: {
                return Operator.In;
            }
            case Operator.NotBetween: {
                return Operator.NotBetween;
            }
            case Operator.NotLike: {
                return Operator.Like;
            }
            case Operator.None: {
                return Operator.Some;
            }
            default: {
                throw new Error(`Invalid exclude operator: ${operator}`);
            }
        }
     }  
}