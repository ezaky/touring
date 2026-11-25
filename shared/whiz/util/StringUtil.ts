/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */

import * as _ from 'lodash-es';

const SubstituteRegEx = /\{([0-9])\}/g;
const CapitalizeRegEx = /(?:^|\s)\S/g;

export default class StringUtil {
    /**
     * Substitutes the {n} tokens by the corresponding function argument.
     * For example, substitute("Saving the document '{0}'", "myDocument") returns
     * "Saving the document 'myDocument'".
     */
   static substitute(str:string, ...args:any[]) {
      let result = str.replace(SubstituteRegEx, (match, submatch) => {
         return args[parseInt(submatch)];
      });
      return result;
   }

   /**
    * Create a default label for the given id.
    * For example, given emailAddress it returns Email Address.
    */
   static getLabelForId(id): string {
      if (id == null) {
         return "";
      }
      if (!_.isString(id)) {
         return id.toString();
      }
      if (id.indexOf(" ") > 0) {
         return id;
      }
      let str = id;
      // id could be a nested field, criteria we want to show the last segment
      let dotIndex = str.lastIndexOf(".");
      if (dotIndex > 0) {
         str = str.substring(dotIndex+1);
      }
      if (str.indexOf("_") > 0) {
         str = str.replace(/_/g, " ");
         return StringUtil.capitalize(str);
      }
      // add spaces before uppercase letters
      // trim because the first char could be capital
      str = str.replace(/([A-Z])/g, " $1").trim();
      // uppercase first character
      str = str.replace(/^./, str => {
         return str.toUpperCase();
      });
      return str;
   }
   static getAlphaNumericId(str: string): string {
      return str.toLowerCase().replace(/[^a-zA-Z0-9-_]/g, "_");
   }
   static capitalize(str) {
      if (str) {
         return str.replace(CapitalizeRegEx, c => {
            return c.toUpperCase();
         });
      }
   }
   static lowerize(str) {
      if (str) {
         return str.replace(CapitalizeRegEx, c => {
            return c.toLowerCase();
         });
      }
   }
   static insert(str: string, subStr: string, index: number): string {
      return str.substring(0, index) + subStr + str.substring(index+1);
   }
   static randomStr(len=10) {
      const CharSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let maxIndex = CharSet.length-1;
      let str = "";
      for (let i = 0; i < len; i++) {
            str += CharSet.charAt(_.random(0, maxIndex));
      }
      return str;
   }
   static truncateMiddle(str, maxLength): string {
      if (!str || str.length <= maxLength) {
         return str;
      }
      const ellipsis = '...';
      const charsToShow = maxLength - ellipsis.length;
      const frontChars = Math.floor(charsToShow / 2);
      const backChars = Math.ceil(charsToShow / 2);

      return `${str.slice(0, frontChars)}${ellipsis}${str.slice(str.length - backChars)}`;
   }
   static countItems(count: number, singular: string, plural: string): string {
      const word = count === 1 ? singular : plural;
      return `${count} ${word}`;
   }
   static wordForCount(count: number, singular: string, plural: string) {
      return count === 1 ? singular : plural;
   }
   static isNumberStr(val: string) {
      return /^-?\d+(\.\d+)?$/.test(String(val));
   }
}