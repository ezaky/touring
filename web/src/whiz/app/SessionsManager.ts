/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */

const SessionHeader = "session-header";
const SessionHeaderParam = "h"; // so it doesn't alarm people about security issues

import UserRole from "shared/whiz/tenants/UserRole";
import { Entity } from "shared/whiz/entities/QueryDefs";
 import {SessionUserData} from "shared/whiz/sessions/SessionDefs";

class SessionsManager {
   private _userData: SessionUserData = {
      sessionToken: null!,
      userEmail: null,
      tenantId: null,
      role: null
   };
   private _tenant: Entity;
   private _configData: any = null;
   private _isDev: boolean;

   setConfigData(configData: any) {
      this._configData = configData;
   }
   getConfigData() {
      return this._configData;
   }
   setUserData(userData: SessionUserData) {
      this._userData = userData;
   }
   getUserData(): SessionUserData {
      return this._userData;
   }
   setDev(isDev: boolean) {
      this._isDev = isDev;
   }
   isDev() {
      return this._isDev;
   }
   isTenantAdmin(): boolean {
      return this._userData.role === UserRole.TenantAdmin;
   }
   setTenant(tenant: Entity) {
      this._tenant = tenant;
   }
   getTenant(): Entity {
      return this._tenant;
   }
   getSessionToken() {
      return this._userData?.sessionToken;
   }
   getHttpHeader() {
      return this._getHttpHeader(false);
   }
   getUrlHttpHeader() {
      return this._getHttpHeader(true);
   }

   private _getHttpHeader(forUrl: boolean): any {
      let headers: any = {};
      let sessionToken = this.getSessionToken();
      if (sessionToken) {
         headers[forUrl ? SessionHeaderParam : SessionHeader] = sessionToken;
      }
      return headers;
   }
}

export default new SessionsManager();