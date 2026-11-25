import PluginsManager from "shared/whiz/plugins/PluginsManager";
import { PageExtension, PageNavSpec } from "./WebPluginDefs";
import Router from "../app/Router";

type ExtensionHostRendererProps = {
    pointId: string,
    firstPageId?: string,
    renderSelectors: (extensions: PageExtension[]) => void,
    setPageNavSpec: (spec:PageNavSpec) => void
}
export default class ExtensionHostRenderer {
    private props: ExtensionHostRendererProps;

    constructor(props: ExtensionHostRendererProps) {
        this.props = props;
    }
    render() {
        let extensions = PluginsManager.getExtensions<PageExtension>(this.props.pointId);
        this.props.renderSelectors(extensions);

        let info = Router.hostConnected({
            pointId: this.props.pointId,
            setPageNavSpec: this.props.setPageNavSpec
        });
        if (!info.isNavTarget && extensions.length) {
            Router.navigate({pageId: this.props.firstPageId || extensions[0].id});
        }
    }
    hostDisconnected() {
        Router.hostDisconnected(this.props.pointId);
    }
    selectedPageChanged(pageId: string) {
        Router.navigate({pageId});
    }
}