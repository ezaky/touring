import { Request as ExpressRequest } from "express";
import { ControllerContext } from "../controllers/ControllerDefs";
import PluginsManager from "shared/whiz/plugins/PluginsManager";
import { LoginProviderExtension, LoginProvidersPointId } from "../plugins/ServerPluginDefs";
import ModuleLoader from "shared/whiz/plugins/ModuleLoader";
import { LoginUserData, ServerSessionUserData } from "./ServerSessionDefs";
import SessionsManager from "./SessionsManager";
import { UnauthorizedStatus } from "shared/whiz/sessions/SessionDefs";
import logger from "../server/Logger";

class LoginManager {
    private _loginProvider;

    async login(req: ExpressRequest, context: ControllerContext): Promise<ServerSessionUserData> {
        let provider = await this._getLoginProvider();
        let user:LoginUserData = await provider.handleLocalLogin(req, context);
        if (!user) {
            throw {httpStatus: UnauthorizedStatus};
        }
        let userData:ServerSessionUserData = await SessionsManager.setUserData(user, req, context.res);
        logger.info(`Login ${userData.userEmail}, session: ${userData.tenantId}/${userData.sessionToken}`);
        return userData;
    }
    async logout(req: ExpressRequest, context: ControllerContext) {
        return SessionsManager.removeUserData(req, context.res);
    }
    private async _getLoginProvider() {
        if (!this._loginProvider) {
            let extension = PluginsManager.getSingleExtension<LoginProviderExtension>(LoginProvidersPointId);
            this._loginProvider = await ModuleLoader.load(extension.module);
        }
        return this._loginProvider;
    }
}
export default new LoginManager();