export enum Operator {
    And = "$and",
    Or = "$or",
    Not = "$not",
    Eq = "$eq",
    NotEq = "$neq",
    GT = "$gt",
    GEq = "$geq",
    LT = "$lt",
    LEq = "$leq",
    In = "$in",
    NotIn = "$nin",
    Between = "$between",
    NotBetween = "$nbetween",
    Like = "$like",
    NotLike = "$nlike",

    // array fields operators
    Some = "$some",
    Every = "$every",
    None = "$none"
}
let _operatorsSet = {};
for (let key in Operator) {
    _operatorsSet[Operator[key]] = true;
}
export class OperatorUtil {
    static isExclude(operator: Operator) {
        return operator === Operator.NotEq || operator === Operator.NotIn || operator === Operator.NotBetween
            || operator === Operator.NotLike || operator === Operator.None;
    }
    static isOperator(key): boolean {
        return _operatorsSet[key];
    }
}
