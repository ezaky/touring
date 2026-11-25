import { WhizPlugin, PageExtension, PluginConst } from "shared/whiz/plugins/PluginDefs"
import { ControllerExtension, ControllersPointId } from "../whiz/plugins/ServerPluginDefs.js";
import EnvUtil from "../whiz/util/EnvUtil.js";

const plugin:WhizPlugin = {
    id: "touring.test",

    extensions: [
        <ControllerExtension> {
            enabled: EnvUtil.isDev(),
            pointId: ControllersPointId,
            id: "touring.test_controller",
            url: "/touring/test",
            module: () => import("./TestController.js"),
            method: "Post",
            dbConnection: true
        },
        <PageExtension> {
            enabled: EnvUtil.isDev(),
            pointId: PluginConst.rootPagesPointId,
            id: "touring.rootPages.test_page",
            label: "Test",
            componentKey: "test/TestPage",
            icon: "eye"
        }
   ]
 }
 export default plugin;
