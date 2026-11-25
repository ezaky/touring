import { EntityFieldInfo, EntityType } from "shared/whiz/entities/EntityType";
import { CriteriaCondition, Criteria } from "shared/whiz/entities/QueryDefs";
import ObjectUtil from "shared/whiz/util/ObjectUtil";
import * as _ from 'lodash-es';
import { Operator } from "shared/whiz/entities/Operator";

export default class QueryUtil {
    static iterateCriteriaFields(entityType: any, criteria: Criteria, 
            iteratee: (fieldInfo: EntityFieldInfo, criteriaNode: any) => boolean|void) {
        if (!criteria) {
            return;
        }
        entityType = EntityType.getEntityType(entityType);
        ObjectUtil.iterateFields(criteria, (key, object) => {
            let fieldInfo = entityType.getFieldInfo(key, false);
            if (fieldInfo) {
                return iteratee(fieldInfo, object);
            }
        });
    }
    static getFieldCriteriaCondition(fieldInfo: EntityFieldInfo, criteriaNode: any): CriteriaCondition {
        let operator;
        let operand = criteriaNode;
        if (_.isArray(criteriaNode)) {
            operator = Operator.In;
        } else if (_.isObject(criteriaNode)) {
            let operatorAndOperand = QueryUtil._getSingleOperatorAndOperand(criteriaNode);
            operator = operatorAndOperand.operator;
            operand = operatorAndOperand.operand;
        } else {
            operator = Operator.Eq;
        }
        let condition = {field: fieldInfo.fieldPath, operator, operand};
        QueryUtil._normalizeCondition(fieldInfo, condition);
        return condition;
    }

    static _getSingleOperatorAndOperand(criteriaNode: object) {
        let operator, operand;
        for (let key in criteriaNode) {
            if (operator) {
                throw new Error(`Expected an object with only 1 operator and operand: ${JSON.stringify(criteriaNode)}`);
            }
            operator = key;
            operand = criteriaNode[key];
        }
        return {operator, operand}
    }
    static _normalizeCondition(fieldInfo: EntityFieldInfo, condition: CriteriaCondition) {
        let field = fieldInfo.field;
        let operator = condition.operator;
        let operand = condition.operand;
        let requireArray = () => {
            if (!_.isArray(operand) || !operand.length) {
                throw new Error(`The value for ${operator} should be an array with 1 or more items`);
            } 
        }
        if (field.isArray && operand !== null) {
            if (operator !== Operator.Some && operator !== Operator.Every && operator !== Operator.None) {
                throw new Error(`Only ${Operator.Some}, ${Operator.Every}, ${Operator.None} can be used with array fields (${fieldInfo.fieldPath})`);
            }
            requireArray();
        }
        switch (operator) {
            case Operator.In:
            case Operator.NotIn: {
                requireArray();
                if (operand.length === 1) {
                    condition.operand = operand[0];
                    condition.operator = operator === Operator.In ? Operator.Eq : Operator.NotEq;    
                }
                break;
            }
            case Operator.Some:
            case Operator.Every:
            case Operator.None: {
                if (!field.isArray) {
                    throw new Error(`The operator ${operator} can only be used with array fields`);
                }
                break;
            }
        }
    }
}