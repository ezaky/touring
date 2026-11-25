/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */

import * as _ from 'lodash-es';

export default class ArrayUtil {
    static mapAndFilter<U=any, T=any>(array: U[], mapper: (item: U) => T): T[] {
      if (_.isEmpty(array)) {
         return [];
      }
        let result = array.reduce((filtered, item) => {
            let mappedItem = mapper(item);
            if (mappedItem != null) {
                filtered.push(mappedItem);
            }
            return filtered;
        }, []);
        return result;
    }
    static pluckNotNull(array, property, uniques) {
        if (!array) {
           return [];
        }
        let values = uniques ? {} : [];
        for (let item of array) {
           let value = item[property];
           if (value != null) {
              if (uniques) {
                 values[value] = true;
              } else {
                 (<any>values).push(value);
              }
           }
        }
        if (uniques) {
           return _.keys(values);
        }
        return values;
     }
}
