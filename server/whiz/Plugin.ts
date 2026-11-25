import {WhizPlugin, PluginConst, ControllerExtension, ControllersPointId, EntitiesDataHandlerExtension, 
      EntitiesDataHandlerPointId, DbPointId, UnhostedPagesPointId, MainPagePointId, 
      ServerInitializersPointId, LoginProvidersPointId, EntityTypeExtension,
      EntityTypesPointId} from "./plugins/ServerPluginDefs";

const Plugin:WhizPlugin = {
    id: "whiz-server",
 
    extensionPoints: [
      {
         id: ControllersPointId,
         target: PluginConst.serverPluginTarget
      },
      {
         id: DbPointId,
         target: PluginConst.serverPluginTarget
      },
      {
         id: EntitiesDataHandlerPointId,
         target: PluginConst.serverPluginTarget
      },
      {
         id: ServerInitializersPointId,
         target: PluginConst.serverPluginTarget
      },
      {
         id: LoginProvidersPointId,
         target: PluginConst.serverPluginTarget
      },
      {
         id: MainPagePointId,
         target: PluginConst.webPluginTarget
      },
      {
         id: UnhostedPagesPointId,
         target: PluginConst.webPluginTarget
      }
    ],

    extensions: [
      <ControllerExtension> {
         pointId: ControllersPointId,
         id: "whiz.sessions.intSessionController",
         url: "/whiz/sessions/init",
         module: () => import("./sessions/SessionsController.js"), 
         method: "Get"
      },
      <ControllerExtension> {
         pointId: ControllersPointId,
         id: "whiz.sessions.endSessionController",
         url: "/whiz/sessions/end",
         module: () => import("./sessions/SessionsController.js"), 
         method: "Get"
      },
      <ControllerExtension> {
         pointId: ControllersPointId,
         id: "whiz.sessions.loginController",
         url: "/whiz/login",
         module: () => import("./sessions/LoginController.js"), 
         method: "Get"
      },

      <EntitiesDataHandlerExtension> {
         pointId: EntitiesDataHandlerPointId,
         id: "whiz.entities.commonEntitiesDataHandler",
         entityTypeIds: "*",
         module: () => import("./entities/CommonEntitiesDataHandler.js")
      },
      <EntityTypeExtension> {
            pointId: EntityTypesPointId,
            id: "whiz.tenantState",
            tableName: "tenant_states",
            fields: [
               {name: "id"},
               {name: "session_token"},
               {name: "state_name"},
               {name: "tenant_id"},
               {name: "state_value"},
               {name: "expires_at"}
            ]
        }
   ]
 }
 export default Plugin;
