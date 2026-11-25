import {WhizPlugin, PluginConst, AppsPointId, EntityTypesPointId} from "./plugins/PluginDefs";

const Plugin:WhizPlugin = {
    id: "whiz-shared",
 
    extensionPoints: [
      {
         id: AppsPointId,
         target: [PluginConst.serverPluginTarget, PluginConst.webPluginTarget]
      },
      {
         id: EntityTypesPointId,
         target: [PluginConst.serverPluginTarget, PluginConst.webPluginTarget]
      }
    ]
 }
 export default Plugin;
