import { EntityRelationField } from "shared/whiz/entities/EntityRelationField";
import { Query } from "../entities/Query";
import { EntityFieldInfo, EntityType } from "shared/whiz/entities/EntityType";
import * as _ from 'lodash-es';
import FieldType from "shared/whiz/entities/FieldType";
import { QueryFieldClause } from "shared/whiz/entities/QueryDefs";

const FieldOperandPrefix = "Field(";
const FieldOperandSuffix = ")";

export default class SqlGenerator<T extends Query> {
    protected query: T;

    constructor(query: T) {
        this.query = query;
    }
    // cannot import SqlDb to avoid circular dependencies
    getSqlDb() {
        return <any>this.query.getDb();
    }
    generateColumn(fieldInfoOrName: EntityFieldInfo|string, clause: QueryFieldClause): string {
        let fieldInfo: EntityFieldInfo;
        if (_.isString(fieldInfoOrName)) {
            fieldInfo = this.query.getEntityType().getFieldInfo(<string>fieldInfoOrName);
        } else {
            fieldInfo = <EntityFieldInfo>fieldInfoOrName;
        }
        if (!fieldInfo.field.hasDbColumn) {
            return null;
        }
        let tableRef = this.getTableNamesForRelations(fieldInfo.relationFields).refName;
        if (fieldInfo.jsonFieldPath) {
            let patha = fieldInfo.jsonFieldPath.split(".");
            return this.getSqlDb().getJsonColumnSql(`${tableRef}.${patha[0]}`, patha.slice(1).join("."), fieldInfo);
        }
        return `${tableRef}.${fieldInfo.field.name}`;
    }
    generateColumnValue(fieldInfoOrName: EntityFieldInfo|string, value, options: {forPersist?: boolean} = {}) {
        if (value == null) {
            return "NULL"
        }
        if (_.isString(value) && (<string>value).startsWith(FieldOperandPrefix)) {
            let fieldName = (<string>value).substring(FieldOperandPrefix.length, value.length-FieldOperandSuffix.length);
            return this.generateColumn(fieldName, QueryFieldClause.Select)
        }
         let fieldInfo: EntityFieldInfo;
         if (_.isString(fieldInfoOrName)) {
             fieldInfo = this.query.getEntityType().getFieldInfo(<string>fieldInfoOrName);
         } else {
             fieldInfo = <EntityFieldInfo>fieldInfoOrName;
         } 
         let field = fieldInfo.field;
         let db = this.getSqlDb();
         let fieldType = field.type;
         value = db.getSqlValue(value, fieldInfo, options);
         if (options.forPersist) {
            let isArray = _.isArray(value);
            if (fieldType === FieldType.JSON || (isArray && !db.supportsArrays())) {
                value = JSON.stringify(value);
             } else if (isArray) {
                throw new Error("What to do here?");
             } else if (_.isObject(value)) {
                throw new Error(`Invalid column value for the field ${field.name}: ${JSON.stringify(value)}`);
             }
         }
         return db.escape(value);   
    }  
    getTableNamesForRelations(relationFields: EntityRelationField[]): {name: string, alias?: string, refName: string} {
        if (_.isEmpty(relationFields)) {
            let tableName = this.query.getEntityType().tableName;
            let refName = this.query.options.mainTableAlias || tableName;
            return {name: tableName, refName: refName};
        }
        let relationNames = relationFields.map(relationField => relationField.name);
        let entityType = EntityType.getEntityType(relationFields[relationFields.length-1].entityTypeId);
        let alias = relationNames.join("_");
        return {
            name: entityType.tableName,
            alias: alias,
            refName: alias
        }
    }
}