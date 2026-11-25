import { EntityRelationField, EntityRelationType } from "./EntityRelationField";
import { EntityFieldInfo } from "./EntityType";
import * as _ from 'lodash-es';
import { Criteria, SelectField } from "./QueryDefs";
import { Operator } from "./Operator";

export default class EntityUtil {
    static getRelationsPath(relationFields: EntityRelationField[]) {
        if (_.isEmpty(relationFields)) {
            return "";
        }
        let names = relationFields.map(relationField => relationField.name);
        return names.join(".");
    }
    static qualifyFieldName(fieldName, relationFields: EntityRelationField[]) {
        let relationsPath = this.getRelationsPath(relationFields);
        if (!relationsPath) {
            return fieldName;
        }
        return `${relationsPath}.${fieldName}`;
    }
    static isMultipleRelation(relationField: EntityRelationField): boolean {
        return relationField.type === EntityRelationType.OneToMany || relationField.type === EntityRelationType.ManyToMany;
    }
    static getMultiRelationForField(fieldInfo: EntityFieldInfo) {
        let relationFields = fieldInfo.relationFields;
        return relationFields && relationFields.find(relationField => EntityUtil.isMultipleRelation(relationField));
    }
    static addCriteria(targetCriteria: Criteria, srcCriteria: Criteria): Criteria {
        if (_.isEmpty(targetCriteria)) {
            return srcCriteria;
        }
        if (_.isEmpty(srcCriteria)) {
            return targetCriteria;
        }
        if (_.size(targetCriteria) === 1) {
            let value = targetCriteria[Operator.And];
            if (_.isArray(value)) {
                return {[Operator.And]: [...value, srcCriteria]};
            }
        }
        return {[Operator.And]: [targetCriteria, srcCriteria]};
    }
    static normalize(selectFields: (SelectField | string)[]): SelectField[] {
        return <SelectField[]>selectFields.map(selectField => {
            if (_.isString(selectField)) {
                return {field: selectField}
            }
            return <SelectField>selectField;
        });
    }
}