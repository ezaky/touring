/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */

export enum QueryFunction {
    Count = "Count",
    DistinctCount = "DistinctCount",
    Max = "Max",
    Min = "Min",
    Sum = "Sum",
    Avg = "Avg",
    Distinct = "Distinct",
    Lower = "Lower",
    Upper = "Upper",

    AggrHour =  "AggrHour",
    AggrDay = "AggrDay",
    AggrWeek = "AggrWeek",
    AggrMonth = "AggrMonth",
    AggrYear = "AggrYear"
}
let _allFunctions = {};
for (let fn in QueryFunction) {
    _allFunctions[QueryFunction[fn]] = true;
}
let _aggrFunctions = {
    "Count": true,
    "DistinctCount": true,
    "Max": true,
    "Min": true,
    "Sum": true,
    "Avg": true,
}
let _dateAggrFunctions = {
    [QueryFunction.AggrHour]: true,
    [QueryFunction.AggrDay]: true,
    [QueryFunction.AggrWeek]: true,
    [QueryFunction.AggrMonth]: true,
    [QueryFunction.AggrYear]: true
};
Object.assign(_aggrFunctions, _dateAggrFunctions);

export class QueryFunctionUtil {
    static isValid(func) {
        return _allFunctions[func];
    }
    static isAggregate(func) {
        return _aggrFunctions[func];
    }
    static isDateAggregate(func) {
        return _dateAggrFunctions[func];
    }
}
