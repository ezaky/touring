import { WhizPlugin, PageExtension, EntityTypeExtension, EntityTypesPointId, PluginConst, UnhostedPagesPointId } from "shared/whiz/plugins/PluginDefs"
import FieldType from "shared/whiz/entities/FieldType";

const plugin:WhizPlugin = {
    id: "touring.home",

    extensions: [
        <PageExtension> {
            pointId: PluginConst.rootPagesPointId,
            id: "touring.website.home_page",
            label: "Home",
            componentKey: "website/HomePage"
        }
   ]
 }
 export default plugin;
