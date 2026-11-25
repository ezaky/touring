
import { EntityFieldInfo } from "./EntityType"
import { Operator } from "./Operator"
import { QueryFunction } from "./QueryFunction"

export enum QueryType {
    Find = "Find",
    Create = "Create",
    Update = "Update",
    Delete = "Delete"
}
export enum QueryFieldClause {
    Select = "Select",
    Where = "Where",
    OrderBy = "OrderBy",
    GroupBy = "GroupBy"
}
// sqlGenerator is a SqlFindGenerator instance
export type GenerateColumnFunc = (column: string, fieldInfo: EntityFieldInfo, sqlGenerator, clause: QueryFieldClause) => string;
export interface QueryField {
    field: string,
    func?: QueryFunction,
    /**
     * relevant only if func is a date aggregation function
     */
    timezone?: string,
    generateColumn?: GenerateColumnFunc
}
export interface SelectField extends QueryField {
    alias?: string,
    /**
     * Params to the entity data handler. For example, it can be used with custom fields.
     */
    handlerParams?: {[key: string]: any}
}
export interface GroupByField extends QueryField {
    /**
     * The column number in the selected fields, starting by 1
     */
    selectColumnNum?: number
}
export interface OrderByField extends QueryField {
    descending?: boolean,
    /**
     * The column number in the selected fields, starting by 1
     */
    selectColumnNum?: number
}
export enum JoinType {
    Left = "Left",
    Right = "Right",
    Inner = "Inner"
}
export interface RelationFinderInfo {
    relationPath: string,
    /**
     * Relevant only for multi relations. If true (the default value if not specified) then the multi 
     * relation fields are aggregated.
     */
    aggregateFields?: boolean
    joinType?: JoinType,
}
/**
 * The Criteria object can have the following keys:
 * - Field path: e.g. severity, assignee.name.
 *  The value for this key key can be one of:
 *      - Field value: e.g. "High", ["Low", "Medium"]. The operator in this case is Operator.Eq or Operator.In if the value is an array
 *      - An object with the key is an operator, and value is a field value: e.g. {[Operator.NotEq]: "Low"}
 * - A logical operator (Operator.And, Operator.Or, Operator.Not).
 *  The value for this key is an array of Criteria objects. The value can also be a Criteria object, which has the same meaning of an array with 1 item.
 */
export type Criteria = {[key: string|Operator]: any};
export interface CriteriaCondition {
    field: string,
    operator: Operator,
    operand: any
}
export interface QuerySpec {
    entityTypeId: string,
    // criteria key is field name/path or operator
    criteria?: Criteria,
    /* shortcut for a criteria on the entity id */
    entityId?: any,
    /**
     * Params for the entities data handler
     */
    handlerParams?: {[key: string]: any}
}
export interface FindQuerySpec extends QuerySpec  {
    fields: (SelectField|string)[],
    groupBy?: GroupByField[],
    orderBy?: OrderByField[],
    offset?: number,
    limit?: number,
    needsCount?: boolean,
    relationsFinderInfo?: RelationFinderInfo[]
}
export interface FindQueryResult {
    data: any,
    count?: number
}
// Create and Update QuerySpec
export interface PersistQuerySpec extends QuerySpec {
    entity: any
}
export interface DeleteQuerySpec extends QuerySpec {
}
export interface CreateQueryResult {
    entityId: any
}
export interface UpdateQueryResult {
    affectedCount: number
}
export interface DeleteQueryResult extends UpdateQueryResult {
}
export type Entity = {[key: string]: any};