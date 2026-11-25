import { Request as ExpressRequest } from "express";
import { ControllerContext } from "../controllers/ControllerDefs";
import LoginManager from "./LoginManager";
import { SessionUserData } from "shared/whiz/sessions/SessionDefs";
import { ServerSessionUserData } from "./ServerSessionDefs";

export default class LoginController {
    async handleGet(req: ExpressRequest, context: ControllerContext): Promise<SessionUserData> {
        let serverData:ServerSessionUserData = await LoginManager.login(req, context);
        return {
            userEmail: serverData.userEmail,
            sessionToken: serverData.sessionToken,
            tenantId: serverData.tenantId,
            role: serverData.role
        }
    }
}