import UserRole from "../../whiz/tenants/UserRole";
import {WhizPlugin} from "../plugins/PluginDefs";

export interface SessionUserData {
    userEmail: string,
    sessionToken: string,
    tenantId: string,
    role: UserRole
}
export interface SessionInitData {
    plugins: WhizPlugin[],
    userData: SessionUserData,
    isDev: boolean,
    configProps?: {[key: string]: any}
}
export const UnauthorizedStatus = 401;
