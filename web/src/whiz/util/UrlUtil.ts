/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */

let _urlParams:URLSearchParams;

export default class UrlUtil {
   static getBrowserUrlParam(paramName:string): any {
      if (!_urlParams) {
         _urlParams = new URL(window.location.href).searchParams;
      }
      const value = _urlParams.get(paramName);
      if (value === "") {
         return true;
      }
      return value;
   }
   static addUrlParams(urlStr:string, params:{[key:string]:string}):string {
      // use a dummyBase just in case is relative (e.g. /api/whatever)
      const dummyBase = "http://localhost";
      const url = new URL(urlStr, dummyBase) ;
      for (let paramName in params) {
            url.searchParams.set(paramName, params[paramName]);
      }
      if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
         return url.pathname + url.search;
      }
      return url.toString();
   }
 }
