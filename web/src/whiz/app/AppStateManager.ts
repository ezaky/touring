import * as _ from 'lodash-es';

const TimezoneKey = "whiz.timezone";
const UTCTimezone = "UTC";
const LocalTimezone = "Local";


class AppStateManager {
    private defaultTimezone;
    private hasLocalStorage;
    private timezone;
    private isUTC;
    private localTimezone;
    
    constructor() {
        // security exception could be thrown when accessing localStorage if "Block third-party cookies"
        // is checked in Chrome
        try {
         this.hasLocalStorage = typeof(Storage) !== "undefined" && typeof window.localStorage !== "undefined";
        } catch (error) {
         this.hasLocalStorage = false;
        }
        this.defaultTimezone = LocalTimezone;
     }
     getValue(key: string): string {
        if (this.hasLocalStorage) {
           return localStorage.getItem(this._adjustKey(key));
        }
     }
     setValue(key: string, value: any) {
        if (!this.hasLocalStorage) {
           return;
        }
        if (value == null) {
           return this.removeValue(key);
        }
        if (value instanceof Date) {
           value = value.toUTCString();
        } else if (_.isObject(value)) {
           value = JSON.stringify(value);
        }
        localStorage.setItem(this._adjustKey(key), value);
     }
     removeValue(key) {
        if (this.hasLocalStorage) {
           localStorage.removeItem(this._adjustKey(key));
        }
     }
     getIntValue(key): number {
        let value: any = this.getValue(key);
        if (value != null) {
           value = parseInt(value);
        }
        return value;
     }

     getBooleanValue(key): boolean {
        let value: any = this.getValue(key);
        if (value != null) {
           value = value === "true";
        }
        return value;
     }
     getObjectValue(key):any {
        var value = this.getValue(key);
        if (value) {
           value = JSON.parse(value);
        }
        return value;
     }
     getDateValue(key) {
        var value: any = this.getValue(key);
        if (value) {
           value = new Date(value);
        }
        return value;
     }
     getTimezone() {
        if (this.timezone === undefined) {
         this.timezone = this.getValue(TimezoneKey) || this.defaultTimezone;
           if (this.timezone === LocalTimezone) {
            this.timezone = this.getLocalTimezone();
           }
        }
        return this.timezone;
     }
     setTimezone(value) {
        this.setValue(TimezoneKey, value);
        this.timezone = undefined;
        this.isUTC = undefined;
     }
     setDefaultTimezone(timezone) {
        if (!timezone) {
           throw new Error("Expected timezone");
        }
        this.defaultTimezone = timezone;
        this.timezone = undefined;
        this.isUTC = undefined;
     }
     getLocalTimezone() {
        if (!this.localTimezone) {
           let formatter = new Intl.DateTimeFormat(undefined, {});
           this.localTimezone = formatter.resolvedOptions().timeZone;
        }
        return this.localTimezone;
     }
     isUTCTimezone() {
        if (this.isUTC === undefined) {
         this.isUTC = this.getTimezone() === UTCTimezone;
        }
        return this.isUTC;
     }
     isLocalTimezone() {
        return this.getTimezone() === this.getLocalTimezone();
     }

     private _adjustKey(key) {
        /* 
        let tenantId = SessionsManager.getTenantId();
        tenantId && (key = tenantId + KeyTenantSeparator + key);
        */
        return key;
     }
}

_.extend(AppStateManager.prototype, {
    UTCTimezone: UTCTimezone,
    LocalTimezone: LocalTimezone
 });

export default new AppStateManager();