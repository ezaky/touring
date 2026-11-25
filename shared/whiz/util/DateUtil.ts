import StringUtil from "./StringUtil";
import * as _ from 'lodash-es';

const ISODateTemplate = "{0}-{1}-{2}T{3}:{4}:{5}Z";

export default class DateUtil {
    static toDate(value) {
        if (value == null) {
           return null;
        }
        let isString = _.isString(value);
        if (isString || _.isNumber(value)) {
           if (isString && !value.endsWith("Z")) {
              // support epoch strings to accomodate some use cases from Java; e.g. some json stringifying
              // tools generate strings if the field is unsigned long.
              // use Number instead of parseInt because parseInt("10px") returns 10
              let numValue = Number(value);
              if (isNaN(numValue)) {
                 var timeIndex = value.indexOf(" ");
                 if (timeIndex < 0) {
                    timeIndex = value.indexOf("T");
                 } else { // added for Safari which seems to require T not space
                    value = value.substring(0, timeIndex) + "T" + value.substring(timeIndex+1);
                 }
                 // added +/- just in case it has timezone like -08:00
                 if (timeIndex > 0) {
                    if (value.indexOf("+", timeIndex) < 0 && value.indexOf("-", timeIndex) < 0) {
                       value += "Z"
                    }
                 }
              } else {
                 value = numValue;
              }
           }
           value = new Date(value)
        }
        return value;
     }
     static isValidDate(date) {
      if (date == null) {
         return false;
      }
      return !isNaN(DateUtil.toTime(date));
   }

   static isNullDate(date) {
      // null date or 1970-1-1
      return !DateUtil.toTime(date);
   }

   static toTime(value) {
      if (value == null) {
         return null;
      }
      if (_.isNumber(value)) {
         return value;
      }
      return DateUtil.toDate(value).getTime();
   }

   /**
    * Returns the ISO-8601 UTC string for the given date.
    */
   static getISOString(date) {
      date = DateUtil.toDate(date);
      return StringUtil.substitute(ISODateTemplate,
         date.getUTCFullYear(), DateUtil.zeroFill(date.getUTCMonth() + 1),
         DateUtil.zeroFill(date.getUTCDate()), DateUtil.zeroFill(date.getUTCHours()),
         DateUtil.zeroFill(date.getUTCMinutes()), DateUtil.zeroFill(date.getUTCSeconds()));
   }
   static serverFormat(date) {
      date = DateUtil.toDate(date);
      return date.toLocaleDateString('en-US');
   }
   static getUTCString(date) {
      date = DateUtil.toDate(date);
      return date.toUTCString();
   }

   static zeroFill(num) {
      return num < 10 ? "0" + num : num;
   }
}