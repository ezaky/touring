/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */

import * as _ from 'lodash-es';

export default class ObjectUtil {
    static extendDeep(target, ...sources) {
        const customizer = (objValue: unknown, srcValue: unknown) => {
            // If the incoming value from a source is an array,
            // replace the destination value completely rather than index-merging.
            if (_.isArray(srcValue)) {
                return srcValue;
            }
        };
       return _.mergeWith(target, ...sources, customizer)
    }
    /*
    * Returns the object for the given string.
    * @param str The string to convert to object
    * @param options Accepts one or more of the following options:
    *    <ul>
    *    <li>tupleSep: The tuple separator string, defaults to "&". </li>
    *    <li>nameValueSep: The name value separator string, defaults to "=". </li>
    *    <li>uriDecode: True if the values are to be uri decoded. </li>
    *   <li>trim: true to trim the spaces around the values. </li>
    *    </ul>
    * For example, given a string "a=1&b=bee", a tupleSep of "&" and a nameValueSep of "=", it returns the object:
    * {a: 1, b: "bee"}.
    */
    static strToObject(str: string, {
                tupleSep = "&",
                nameValueSep = "=",
                uriDecode = false,
                trim = false
            }
        ): any {
        let result:any = {};
        if (!str ) {
            return result;
        }
        let properties = str.split(tupleSep);
        for (let property of properties) {
            trim && (property = property.trim());
            let key, value;
            let sepIndex = property.indexOf(nameValueSep);
            if (sepIndex >= 0) {
                key = property.substring(0, sepIndex);
                value = property.substring(sepIndex+1);
                trim && (value = value.trim());
                if (uriDecode) {
                    value = decodeURIComponent(value);
                }
            } else {
                key = property;
                value = true
            }
            result[key] = value;
        };
        return result;
    }
    /**
     * Iterate an object fields recursively. It is safe to change the object keys in the iteratee.
     */
    static iterateFields(object: any, iteratee: (key: string, object:any) => boolean|void): boolean|void {
        if (!object) {
            return;
        }
        // could be array for operands for the operators And, Or, Not, Between, In etc
        if (_.isArray(object)) {
            for (let item of object) {
                if (_.isObject(item)) {
                    if (ObjectUtil.iterateFields(item, iteratee) === false) {
                        return false;
                    }
                }
            }
            return;
        }
        let keys = _.keys(object);
        for (let key of keys) {
            let value = object[key];
            if (iteratee(key, object) === false) {
                return false;
            }
            if (_.isObject(value)) {
                if (ObjectUtil.iterateFields(value, iteratee) === false) {
                    return false;
                }
            }
        }
    }
    /**
     * The field names with . are unflattened into their object hierarchy.
     */
    static unflatten(object) {
        if (!object) {
            return object;
        }
        let result = {};
        for (let key in object) {
            let value = object[key];
            if (key.indexOf(".") > 0) {
                _.set(result, key, value);
            } else {
                result[key] = value;
            }
        }
        return result;
    }
    static parseJson(jsonStr, throws=true) {
        try {
           return JSON.parse(jsonStr)
        } catch(error) {
           console.log(`Error parsing json: ${jsonStr}`);
           if (throws) {
              throw error;
           }
        }
    }
    static mapObject(a: string[], iteratee: (key: string) => any) {
        let result = {};
        for (let str of a) {
            result[str] = iteratee(str)
        }
        return result;
    }
    static isEmptyValue(value) {
        if (value == null || value === "") {
            return true;
        }
        if (_.isObject(value)) {
            return _.isEmpty(value);
        }
        return false;
    }
    static getErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        };
        if (_.isString(error)) {
            return <string>error;
        }
        if (_.isObject(error)) {
            return JSON.stringify(error);
        }
        return String(error);
    }
}