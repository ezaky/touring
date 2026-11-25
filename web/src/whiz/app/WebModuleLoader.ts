import ModuleLoader from "shared/whiz/plugins/ModuleLoader";
import { ModuleSpec, PageExtension } from "../plugins/WebPluginDefs";
import { html, render as renderLit } from "lit-html";  
import PluginsManager from "shared/whiz/plugins/PluginsManager";

export default class WebModuleLoader {
    static webModulesMap: {[key: string]: ModuleSpec};

    static async load(moduleKey: string, props: any = null, parentElem: HTMLElement=null): Promise<any> {
        let moduleSpec = this.webModulesMap[moduleKey];
        if (!moduleSpec) {
            throw new Error(`Invalid module key: ${moduleKey}`);
        }
        let clazz = await ModuleLoader.load(moduleSpec);
        let isElement = clazz.prototype instanceof HTMLElement;
        let instance = props && !isElement ? new clazz(props) : new clazz();
        if (isElement && props) {
            instance.props = props;
        }
        if (parentElem) {
            renderLit(html`${instance}`, parentElem);
        }
        return instance;
    }
    static async loadPage(pageId: string, props: any = null, parentElem: HTMLElement=null) {
        let pageExtension = PluginsManager.getExtension<PageExtension>(pageId);
        return this.load(pageExtension.componentKey, props, parentElem);
    }
}