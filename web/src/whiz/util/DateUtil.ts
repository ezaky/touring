import BaseDateUtil from "shared/whiz/util/DateUtil";
import AppStateManager from "../app/AppStateManager";

import * as _ from 'lodash-es';

const NumericDatePart = "numeric";
const ShortDatePart = "short";
const LongDatePart = "long";

const UTCTimezone = "UTC";

let _dateFormatters = {};

let _isUTC = AppStateManager.isUTCTimezone();

export default class DateUtil extends BaseDateUtil {
     static formatDate(timestamp, options=null) {
        options = _.defaults(options ||  {}, {
           realtime: false,
           renderDayName: false,
           renderMonthName: false,
           renderFullMonthName: false,
           renderTime: true,
           renderYear: true,
           renderSeconds: false,
           relativeDate: false,
           utc: _isUTC
        })
        let date = DateUtil.toDate(timestamp);
        if (!DateUtil.isValidDate(date)) {
           return timestamp;
        }
        if (DateUtil.isNullDate(date)) {
           return;
        }
        timestamp = date.getTime();

        let dateOptions: any = {utc: options.utc};
        if (options.renderTime) {
           dateOptions.hour = true;
           dateOptions.minute = true;
           if (options.renderSeconds) {
              dateOptions.second = true;
           }
        }
         if (options.relativeDate) {
            let today = new Date();
            let yesterday = new Date();
            today.setHours(0, 0, 0, 0);
            yesterday.setDate(today.getDate() - 1); // see http://stackoverflow.com/questions/5511323/javascript-yesterday
            yesterday.setHours(0, 0, 0, 0);
            if (timestamp >= yesterday.getTime()) {
               let prefix = timestamp >= today.getTime() ? "Today " : "Yesterday ";
               return prefix + DateUtil.formatTime(timestamp, options);
            }
         }
        dateOptions.month = true;
        dateOptions.day = true;
        dateOptions.year = options.renderYear;
        dateOptions.renderMonthName = options.renderMonthName;
        dateOptions.renderFullMonthName = options.renderFullMonthName;
        dateOptions.renderDayName = options.renderDayName;
        let result = DateUtil._formatDate(date, dateOptions);
        if (options.renderTime) {
           // avoid breaking the date at AM/PM
           let index = result.lastIndexOf(" ");
           result = result.substring(0, index) + " " + result.substring(index + 1);
        }
        return result;
     }
     static formatTime(timestamp, options) {
        options = _.defaults(options || {}, {
           renderSeconds: false,
           utc: _isUTC
        });
        var dateOptions: any = {hour: true, minute: true};
        if (options.renderSeconds) {
           dateOptions.second = true;
        }
        dateOptions.utc = options.utc;
        dateOptions.hour12 = options.hour12;
        return DateUtil._formatDate(DateUtil.toDate(timestamp), dateOptions);
     }
      static formatDateRange(start, end) {
         const startDate: Date = DateUtil.toDate(start) 
         const endDate: Date = DateUtil.toDate(end); 
         if (startDate.getFullYear() === endDate.getFullYear()) {
            const startStr = `${DateUtil.getMonthName(startDate)} ${startDate.getDate()}`;
            const endStr = `${DateUtil.getMonthName(endDate)} ${endDate.getDate()}`;
            let rangeStr;
            if (startStr === endStr) {
               rangeStr = startStr;
            } else {
               rangeStr = `${startStr} - ${endStr}`;
            }
            return `${rangeStr}, ${startDate.getFullYear()}`
         }
         return `${DateUtil.getMonthName(startDate)} ${startDate.getDate()} ${startDate.getFullYear()} - ${DateUtil.getMonthName(endDate)} ${endDate.getDate()} ${endDate.getFullYear()}`
      }
     static getShortString(date, options) {
        options = _.defaults(options || {}, {
           utc: _isUTC,
           omitYear: false,
           omitYearIfCurrent: false,
           renderMonthName: false
        });
        date = DateUtil.toDate(date);
        var omitYear = options.omitYear;
        if (!omitYear && options.omitYearIfCurrent) {
           var year, currentYear;
           var currentDate = new Date();
           if (options.utc) {
              year = date.getUTCFullYear();
              currentYear = currentDate.getUTCFullYear();
           } else {
              year = date.getFullYear();
              currentYear = currentDate.getFullYear();
           }
           omitYear = year === currentYear;
        }
        var dateOptions: any = {month: true, day: true, utc: options.utc, renderMonthName: options.renderMonthName};
        if (!omitYear) {
           dateOptions.year = true;
        }
        var result = DateUtil._formatDate(date, dateOptions);
        return result;
     }
     static getShortMonth(date, options) {
        options = _.defaults(options || {}, {
           utc: _isUTC
        });
        return DateUtil._formatDate(DateUtil.toDate(date), {month: true, utc: options.utc});
     }
     static getMonthName(date, options?) {
        options = _.defaults(options || {}, {
           utc: _isUTC,
           renderFullMonthName: false
        });
        let formatOptions: any = {
           month: true,
           utc: options.utc
        }
        if (options.renderFullMonthName) {
           formatOptions.renderFullMonthName = true;
        } else {
           formatOptions.renderMonthName = true;
        }
        return DateUtil._formatDate(DateUtil.toDate(date), formatOptions);
     }
     static getFullYear(date, options) {
        options = _.defaults(options || {}, {
           utc: _isUTC
        });
        date = DateUtil.toDate(date);
        return options.utc ? date.getUTCFullYear() : date.getFullYear();
     }
     private static _formatDate(date, options) {
        if (!date) {
           return;
        }
        let month;
        if (options.month === true) {
           if (options.renderFullMonthName) {
              month = LongDatePart;
           } else if (options.renderMonthName) {
              month = ShortDatePart;
           } else {
              month = NumericDatePart;
           }
        }
        let year = options.year;
        if (options.year === true) {
           year = NumericDatePart;
        } else if (options.year === false) {
           year = undefined;
        }
        var dateOptions: any = {
           year: year,
           month: month,
           day: (options.day === true) ? NumericDatePart : options.day,
           hour: (options.hour === true) ? NumericDatePart : options.hour,
           minute: (options.minute === true) ? NumericDatePart : options.minute,
           second: (options.second === true) ? NumericDatePart : options.second,
           hour12: options.hour12 !== false
        }
        if (options.renderDayName) {
           dateOptions.weekday = ShortDatePart;
        }
        dateOptions.timeZone = options.utc ? UTCTimezone : AppStateManager.getTimezone();
        var key = JSON.stringify(dateOptions);
        var formatter = _dateFormatters[key];
        if (!formatter) {
           formatter = _dateFormatters[key] = new Intl.DateTimeFormat(undefined, dateOptions);
        }
        let dataStr = formatter.format(date);
        // remove the column between the date and time
        if (dateOptions.hour) {
           let index = dataStr.lastIndexOf(",");
           if (index > 0) {
              dataStr = dataStr.substring(0, index) + dataStr.substring(index + 1);
           }
        }
        return dataStr;
     }
}