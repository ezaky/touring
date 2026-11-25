/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */

import { Request as ExpressRequest } from "express";
import { ControllerContext } from "../controllers/ControllerDefs";
import { WhizPlugin, PluginConst } from "../plugins/ServerPluginDefs";
import pluginsLoader from "../plugins/PluginsLoader";
 import {SessionInitData} from "shared/whiz/sessions/SessionDefs";
import SessionsManager from "./SessionsManager";
import LoginManager from "./LoginManager";
import { ServerSessionUserData } from "./ServerSessionDefs";
import EnvUtil from "../util/EnvUtil";

export default class SessionsController {
    async handleGet(req: ExpressRequest, context: ControllerContext) {
        let path = req.path;
        if (path.endsWith("/init")) {
            return this._initSession(req, context);
        }
    if (path.endsWith("/end")) {
            return this._endSession(req, context);
        }
        throw new Error(`Invalid controller path: ${path}`);
    }

    private async _initSession(req: ExpressRequest, context: ControllerContext) {
         let serverUserData:ServerSessionUserData = await SessionsManager.getUserData(req, context.res, {ignoreDoubleCookie: true});
         let plugins:WhizPlugin[] = await pluginsLoader.loadPlugins(PluginConst.webPluginTarget);
         let initData: SessionInitData = {
            plugins: plugins,
            userData: serverUserData ? {
                userEmail: serverUserData.userEmail,
                sessionToken: serverUserData.sessionToken,
                tenantId: serverUserData.tenantId,
                role: serverUserData.role
            } : null,
            isDev: EnvUtil.isDev()
        }
        return initData;  
    }
    private _endSession(req: ExpressRequest, context: ControllerContext) {
       LoginManager.logout(req, context);
    }
}