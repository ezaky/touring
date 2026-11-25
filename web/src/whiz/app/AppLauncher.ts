import UrlUtil from "../util/UrlUtil";
import StringUtil from "shared/whiz/util/StringUtil";
import HttpCommand from "../commands/HttpCommand";
import SessionsManager from "./SessionsManager";
import PluginsManager from "shared/whiz/plugins/PluginsManager";
import {SessionInitData, SessionUserData} from "shared/whiz/sessions/SessionDefs";
import { AppExtension, AppsPointId, ModuleSpec } from "../plugins/WebPluginDefs";
import WebModuleLoader from "../app/WebModuleLoader";
import BaseComponent from "../components/BaseComponent";
import { html, render as renderLit } from "lit-html";
import AppUtil from "./AppUtil";
import AppStateManager from "./AppStateManager";

const DefaultContent = "<h2>Welcome to Whiz!</h2>";
const TimeoutKey = "whiz.launcher.timeout";
const SessionTimeoutError = "Your session has expired. Please login again.";

interface LaunchProps {
    app: BaseComponent,
    elem: HTMLElement,
    webModulesMap: {[key: string]: ModuleSpec}
}

const AuthorizationHeader = "authorization";
const OAuthTokenUrlParam = "token";
const OAuthTokenHeader = "Bearer {0}";

export default class AppLauncher {
    private props: LaunchProps;

    async launch(props: LaunchProps) {
        this.props = props;
        WebModuleLoader.webModulesMap = props.webModulesMap;
        AppUtil.logoutHandler = this._logout;
        // this works only in Chrome as of 09/28/17
        window.addEventListener("unhandledrejection", function(e) {
            // see DOMException error name: https://developer.mozilla.org/en-US/docs/Web/API/DOMException
            let error = e.reason;
            // error can be null for examople in ConfirmationDialog rejection
            if (!error || error === "AbortError") {
               e.preventDefault();
            }
        });
        let headers;
        let accessToken = UrlUtil.getBrowserUrlParam(OAuthTokenUrlParam);
        if (accessToken) {
           headers = {[AuthorizationHeader]: StringUtil.substitute(OAuthTokenHeader, accessToken)};
        }
        let command = new HttpCommand({
           url: "/whiz/sessions/init",
           params: {
               origUrl: window.location.href
           },
           headers: headers,
           monitorElem: props.elem
        });
        let initData:SessionInitData = <SessionInitData>(await command.execute());
        let appConfig = initData.configProps || {};
        SessionsManager.setConfigData(appConfig);
       
        await PluginsManager.setPlugins(initData.plugins);
        
        let userData = initData.userData;
        if (!userData) {
            userData = await this._login(initData);
        }
        SessionsManager.setUserData(userData);
        SessionsManager.setDev(initData.isDev);
        return this._renderMainPage();
    }
    async _login(initData:SessionInitData): Promise<SessionUserData> {
        let appExtension = PluginsManager.getSingleExtension<AppExtension>(AppsPointId);
        if (!appExtension.loginPageId) {
            return;
        }
        const appUrlPath = appExtension.appUrlPath;
        if (appUrlPath && window.location.pathname !== appUrlPath) {
            return;
        }
        const timeoutTime = AppStateManager.getIntValue(TimeoutKey);
        if (timeoutTime) {
            AppStateManager.removeValue(TimeoutKey);
            // avoid showing the error if the app is launched later 
            if (Date.now() - timeoutTime < 5*60*1000) {
                AppUtil.showError(SessionTimeoutError);
            }
        }
        let page = await WebModuleLoader.loadPage(appExtension.loginPageId, null, this.props.elem);
        // assume the login page has a promise method
        return page.promise();
    }
    private async _renderMainPage() {
        new AutoLogoutHandler();
        // to remove the Session Expired message
        AppUtil.removeAllMessages();

        let appExtension = PluginsManager.getSingleExtension<AppExtension>(AppsPointId);
        if (!appExtension) {
            return renderLit(html`${DefaultContent}`, this.props.elem); 
        }
        WebModuleLoader.loadPage(appExtension.mainPageId, null, this.props.elem);
    }
    private _logout = async (timeout: boolean) => {
        if (timeout) {
            AppStateManager.setValue(TimeoutKey, Date.now());
        }
        if (SessionsManager.getUserData()) {
            let command = new HttpCommand({
                url: "/whiz/sessions/end"
            });
            await command.execute();
        }
        let appUrlPath = PluginsManager.getSingleExtension<AppExtension>(AppsPointId).appUrlPath;
        if (timeout || !appUrlPath) {
            // show the login page after timeout
            window.location.reload();
        } else {
            window.location.href = appUrlPath;
        }
    }
}

const SessionExpiryKey = "whiz.launcher.session_expiry";
const SessionExpiryTime = 30 * 60 * 1000;
const SessionExpiryThrottle = 5 * 1000;
const CheckExpiryInterval = 20 * 1000;

class AutoLogoutHandler {
    private _lastUpdate = 0;

    constructor() {
        window.addEventListener("keydown", this._updateActivity);
        window.addEventListener("click", this._updateActivity);
        AppStateManager.setValue(SessionExpiryKey, Date.now() + SessionExpiryTime);
        setInterval(this._checkExpiry, CheckExpiryInterval); 
    }
    private _updateActivity = () => {
        const now = Date.now();
        // Only write to localStorage if at least 5 seconds have passed since the last write
        if (now - this._lastUpdate > SessionExpiryThrottle) {
            AppStateManager.setValue(SessionExpiryKey, now + SessionExpiryTime);
            this._lastUpdate = now;
        }
    }
    private _checkExpiry = () => {
        const time = AppStateManager.getIntValue(SessionExpiryKey);
        if (time && Date.now() > time) {
            AppUtil.logout(true);
        }
    }
}