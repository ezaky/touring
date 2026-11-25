import {CookieOptions, Request as ExpressRequest, Response as ExpressResponse} from "express";
import UsersManager from "./UsersManager";
import { LoginUserData, ServerSessionUserData } from "./ServerSessionDefs";
import crypto from "crypto";
import EnvUtil from "../util/EnvUtil";

const CachedRequestUserData = "cachedUserData";
const CookieName = "whiz_token";
const SessionHeader = "session-header";
const SessionHeaderParam = "h";
const TokenLength = 64;
const CookieMaxAge = 30*60*1000; // 30 minutes

export interface getUserDataOptions {
    ignoreDoubleCookie?: boolean
}
class SessionsManager {
    async getUserData(req:ExpressRequest, res:ExpressResponse, options?:getUserDataOptions):Promise<ServerSessionUserData> {
        if (!req) {
            return;
        }
        let userData:ServerSessionUserData = req[CachedRequestUserData];
        if (userData) {
            return userData;
        }
        let sessionToken = this._getTokenForRequest(req, options);
        if (!sessionToken) {
            return;
        }
        const updateCookieMaxAge = !UsersManager.isCachedToken(sessionToken);
        userData = await UsersManager.getUserDataForToken(sessionToken);
        if (!userData) {
            return;
        }
        req[CachedRequestUserData] = userData;
        if (updateCookieMaxAge) {
            res.cookie(CookieName, sessionToken, this._getCookieOptions(CookieMaxAge));
        }
        return userData;
    }
    getCachedUserData(req:ExpressRequest):ServerSessionUserData {
        if (req) {
            return req[CachedRequestUserData];
        }
    }
    getContextUserData(context) {
        return this.getCachedUserData(context.req);
    }
    requireUserData(context):ServerSessionUserData {
        const userData = this.getContextUserData(context);
        if (!userData) {
            throw new Error("Invalid user session");
        }
        return userData;
    }
    requireTenantId(context) {
        let tenantId = context.tenantId || this.requireUserData(context).tenantId;
        if (!tenantId) {
            throw new Error("tenantId not present in the session");
        }
        return tenantId;
    }
    async setUserData(userData: LoginUserData, req: ExpressRequest, res: ExpressResponse): Promise<ServerSessionUserData> {
        let sessionUserData: ServerSessionUserData = {
            userEmail: userData.userEmail,
            tenantId: userData.tenantId,
            sessionToken: this._generateToken(),
            role: userData.role
        };
        await UsersManager.addUserData(sessionUserData);
        // added so people can call getUserData after this
        req[CachedRequestUserData] = sessionUserData;
        res.cookie(CookieName, sessionUserData.sessionToken, this._getCookieOptions(CookieMaxAge));
        return sessionUserData;
    }
    async removeUserData(req: ExpressRequest, res: ExpressResponse) {
        res.clearCookie(CookieName, this._getCookieOptions());
        let token = this._getTokenForRequest(req);
        if (token) {
            return UsersManager.removeUserData(token);
        }
    }
    private _getTokenForRequest(req: ExpressRequest, options?:getUserDataOptions) {
        let cookies = req.cookies;
        if (!cookies) {
            return;
        }
        let token = cookies[CookieName];
        if (!token) {
            return;
        }
        // see https://www.owasp.org/index.php/CSRF_Prevention_Cheat_Sheet
        // sections: Use of Custom Request Headers and Double Submit Cookie
        if (!options || !options.ignoreDoubleCookie) {
            const header = req.headers[SessionHeader] || req.query[SessionHeaderParam];
            if (header !== token) {
                return;
            }
        }
        return token;
    }
    private _generateToken() {
        return crypto.randomBytes(TokenLength).toString("base64");
    }
    private _getCookieOptions(maxAge?): CookieOptions {
        let options: CookieOptions = {
            // Prevents client-side JS from accessing the cookie
            httpOnly: true,
            // Ensures the cookie is only sent over HTTPS
            secure: EnvUtil.isProduction(),
            // Helps protect against CSRF attacks
            sameSite: "strict"
        }
        if (maxAge) {
            options.maxAge = maxAge;
            // make the expiration date UTC explicit
            options.expires = new Date(Date.now() + maxAge)
        }
        return options;
    }
}
export default new SessionsManager();