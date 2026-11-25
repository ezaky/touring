/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */

import pathlib from "path";
import EnvUtil from "../util/EnvUtil";
import { AppConst } from "shared/app/AppDefs";

const ServerBaseUrlDev = "https://29c3-2a01-cb1c-e05-d700-2487-578d-13c4-c313.ngrok-free.app";

let _rootPath;

export default class ServerUtil {
    /**
     * Returns the path to the root whiz folder; e.g. /Users/user/dev/whiz
     */
    static getRootPath():string {
        if (!_rootPath) {
            _rootPath = pathlib.resolve(__dirname + "/../../../");
            /*
            let p = __dirname;
            for (;;) {
                p = pathlib.resolve(p + "/../");
                if (fs.existsSync(pathlib.resolve(p, "package.json"))) {
                    // this is the "server" folder, the whiz rootpath is the parent folder
                    _rootPath = pathlib.resolve(p + "/../");
                    break;
                }
            }
            */
        }
        return _rootPath; 
    }
    static getServerBaseUrl(env?: string): string {
        if (env === "production") {
            return AppConst.productionUrl;
        }
        if (env === "development") {
            return ServerBaseUrlDev;
        }
        return EnvUtil.isProduction() ? AppConst.productionUrl : ServerBaseUrlDev;
    }
    static getWebBaseUrl(): string {
        return EnvUtil.isProduction() ? AppConst.productionUrl : AppConst.devWebUrl;
    }
    /**
     * Given a partial path inside the whiz folder, this returns the equivalent absolute path
    */
    static normalizePath(path: string): string {
        return pathlib.join(ServerUtil.getRootPath(), path);
    }
    static normalizeServerPath(path: string): string {        
        return pathlib.join(ServerUtil.getRootPath(), `server/${path}`);
    }
    static normalizeWebPath(path: string): string {
        let webPath = "web";
        if (EnvUtil.isDev()) {
            webPath += "/src";
        }
        return pathlib.join(ServerUtil.getRootPath(), `${webPath}/${path}`);
    }
    /*
    static normalizeWebUrl(uri: string) {
        // the static files are served relative to the web foldder (see express.static in Server.ts)
        let webPath = EnvUtil.isDev() ? "src/" : "/";
        return ServerBaseUrl + "/" + webPath + uri;
    }
    */
    static async fetch(url: string, params: RequestInit, returnJsonResponse = true) {
        const response = await fetch(url, params);
        if (!response.ok) {
            throw new Error(`Failed to fetch url "${url}": ${response.statusText}`, {cause: response});
        }
        return returnJsonResponse ? await response.json() : response;
    }
}