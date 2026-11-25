import { UnhostedPagesPointId, PageExtension, PageNavSpec, MainPagePointId } from "../plugins/WebPluginDefs";
import PluginsManager from "shared/whiz/plugins/PluginsManager";
import * as _ from 'lodash-es';

interface RouterNavOptions {
    preserveBrowserUrl?: boolean
}
class RouterHostInfo {
    pointId: string;
    setPageNavSpec: (spec: PageNavSpec) => void
}
class Router {
    private _hostsInfoByPointId: {[pointId: string]: RouterHostInfo} = null;
    private _pathsById: {[extensionId: string]: string[]} = {};
    private _pendingPath: string[];
    private _hash;
    private _rootHostInfo: RouterHostInfo;

    hostConnected(hostInfo: RouterHostInfo): {isNavTarget: boolean} {
        let pointId = hostInfo.pointId;
        let isFirstConnect;
        if (!this._hostsInfoByPointId) {
            this._hostsInfoByPointId = {};
            isFirstConnect = true;
        }
        this._hostsInfoByPointId[pointId] = hostInfo;
        let handledExtensionIds;
        if (isFirstConnect) {
            this._rootHostInfo = hostInfo;
            handledExtensionIds = this._navigateToBrowserUrl();
            window.addEventListener("popstate", this._handlePopState);
        } else {
            handledExtensionIds = this._checkPendingPath();
        }
        let isNavTarget;
        if (!_.isEmpty(handledExtensionIds)) {
            let extension = PluginsManager.getExtension(handledExtensionIds[0]);
            isNavTarget = extension.pointId === pointId 
                || (isFirstConnect && extension.pointId === UnhostedPagesPointId);
        } else {
            isNavTarget = false;
        }
        return {isNavTarget: isNavTarget};
    }
    hostDisconnected(pointId: string) {
        if (!this._hostsInfoByPointId) {
            throw new Error(`Unexpected call to hostDisconnected`);
        }
        delete this._hostsInfoByPointId[pointId];
    }
    navigate(pageNavSpec: PageNavSpec, options?: RouterNavOptions): string[] {
        if (!this._hostsInfoByPointId) {
            throw new Error("Unexpected call to navigate before a first call to hostConnected");
        }
        let pageId = pageNavSpec.pageId;        
        this._pendingPath = this._getPath(pageId).concat();
        let result = this._checkPendingPath(pageNavSpec.props);
        if (!options?.preserveBrowserUrl) {
            this._updateBrowserUrl(pageNavSpec);
        }
        return result;
    }
    getUrlForPage(pageNavSpec: PageNavSpec, urlParams?: {[key:string]: string}) {
        const url = new URL(window.location.href);
        if (urlParams) {
            for (let paramName in urlParams) {
                url.searchParams.set(paramName, urlParams[paramName]);
            }
        }
        url.hash = this._encodeFragment(pageNavSpec);
        return url.toString();
    }
    private _checkPendingPath(pageProps?): string[] {
        let path = this._pendingPath;
        if (_.isEmpty(path)) {
            return;
        }
        let handledExtensionIds = [];
        while (path.length) {
            let pageId = path[0];
            let pointId = PluginsManager.getExtension(pageId).pointId;
            let hostInfo = (pointId === UnhostedPagesPointId) ? this._rootHostInfo : this._hostsInfoByPointId[pointId];
            if (!hostInfo) {
                console.log(`host for pointId ${pointId} not connected yet`);
                // we will continue the navigation on following hostConnected
                break;
            }
            handledExtensionIds.push(path.shift());
            let pageNavSpec:PageNavSpec = {pageId};
            !path.length && pageProps && (pageNavSpec.props = pageProps);
            hostInfo.setPageNavSpec(pageNavSpec);
        }
        return handledExtensionIds;
    }
    private _getPath(extensionId: string) {
        if (this._pathsById.hasOwnProperty(extensionId)) {
           return this._pathsById[extensionId];
        }
        let path = this._pathsById[extensionId] = [];
        let extension = PluginsManager.getExtension(extensionId);
        while (extension) {
            let hostExtension = PluginsManager.findExtension<PageExtension>(null,
                    extension2 => extension2.hostedPointId === extension.pointId);
            if (!hostExtension || hostExtension.pointId === MainPagePointId) {
                break;
            }
            if (hostExtension) {
                path.unshift(hostExtension.id);
            }
            extension = hostExtension;
        }
        path.push(extensionId);
        return path;
    }
    private _navigateToBrowserUrl(): string[] {
        let fragment = window.location.hash;
        if (!fragment) {
            return;
        }
        fragment = fragment.substring(1); // skip #
        let pageNavSpec:PageNavSpec = this._decodeFragment(fragment);
        if (pageNavSpec) {
            let extension = PluginsManager.getExtension(pageNavSpec.pageId);
            if (extension) {
                return this.navigate(pageNavSpec, {preserveBrowserUrl: true})
            }
        }
    }
    private _updateBrowserUrl(pageNavSpec:PageNavSpec) {
        window.location.hash = this._hash = `#${this._encodeFragment(pageNavSpec)}`;
    }
    private _handlePopState = (event) => {
        let newHash = window.location.hash;
        // for some reason Chrome fires popstate when the hash changes in _updateUrl
        if (newHash !== this._hash) {
            // console.log(`_handlePopState: ${newHash}`, this._decodeFragment(newHash.substring(1)));
            this._hash = newHash;
            this._navigateToBrowserUrl();
        }
    }
    private _encodeFragment(pageNavSpec:PageNavSpec) {
        let fragment = pageNavSpec.pageId;
        if (pageNavSpec.props) {
           fragment += "?" + JSON.stringify(pageNavSpec.props);
        }
        return this._encodeParam(fragment);
     }
     private _decodeFragment(fragment): PageNavSpec {
        let result:PageNavSpec = null;
        if (!fragment) {
           return result;
        }
        // just in case atob or JSON.parse throw
        try {
           // support plain fragment to make it easier to construct the urls by other apps. Note that
           // ".", "?" are not part of the base64 chars
           let isPlain = fragment.indexOf(".") > 0;
           if (!isPlain) {
              fragment = this._decodeParam(fragment);
           }
           let optionsIndex = fragment.indexOf("?");
           if (optionsIndex > 0) {
                result = {pageId: fragment.substring(0, optionsIndex)}
                let propsStr = fragment.substring(optionsIndex + 1);
                if (propsStr) {
                    result.props = JSON.parse(propsStr);
                }
           } else {
                result = {pageId: fragment}
           }
        } catch (error) {
            console.log("Invalid fragment: ", fragment);
            console.log(error);
            return null;
        }
        return result;
    }
   private _encodeParam(str) {
      let result = btoa(str);
      if (result) {
         // replace / by * (which is not part of the base64 chars because / causes an issue with Backbone
         // route matching
         result = result.replace(/\//g, "*");
      }
      return result;
   }
   private _decodeParam(str) {
      str = str.replace(/\*/g, "/");
      return atob(str);
   }
}

export default new Router();