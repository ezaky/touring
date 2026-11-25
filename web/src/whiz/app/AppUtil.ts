import WaToast, { ToastCreateOptions } from "@web.awesome.me/webawesome-pro/dist/components/toast/toast.js";
import { AppConst } from "./AppDefs";
import PluginsManager from "shared/whiz/plugins/PluginsManager";
import { AppExtension, AppsPointId } from "../plugins/WebPluginDefs";

export default class AppUtil {
    static appToast: WaToast;
    static logoutHandler: (byUser:boolean) => void;
    private static _toastItem;

    static async showMessage(message: string, options?: ToastCreateOptions) {
        const defaultOptions = {
            duration: 10*1000
        }
        // stacking the messages is weired
        if (this._toastItem) {
            this._toastItem.remove();
            this._toastItem = null;
        }
        this._toastItem = await this.appToast.create(message, {...defaultOptions, ...options});
        this._toastItem.addEventListener("wa-hide", () => {this._toastItem = null});
    }
    static removeAllMessages() {
        if (this._toastItem) {
            this._toastItem.remove();
            this._toastItem = null;
        }
    }
    static showSuccesss(message: string, options?: ToastCreateOptions) {
        const defaultOptions: ToastCreateOptions = {
            variant: "success",
            icon: AppConst.successIcon
        }
        this.showMessage(message, {...defaultOptions, ...options});
    }
    static showError(message: string) {
        this.showMessage(message, {
            variant: "danger",
            icon: AppConst.errorIcon,
            duration: 0 // until dismissed
        });
    }
    static showWarning(message: string) {
        this.showMessage(message, {
            variant: "warning",
            icon: AppConst.warningIcon,
            duration: 0 // until dismissed
        });
    }
    static logout(timeout: boolean) {
        if (this.logoutHandler) {
            this.logoutHandler(timeout);
        } else {
            throw new Error("logoutHandler has not been set");
        }
    }
    static getOAuthRedirectUrl(stateId: string): string {
        const redirectUrl:URL = new URL(window.location.href);
        // remove old state/code/error from previous errors (e.g. the user copied the wrinf value) from the url 
        // otherwise it may confuse Slack and makes it complain invalid redirection url
        let newParams = {};
        redirectUrl.searchParams.forEach((value, key) => {
            if (key !== "code" && key !== "state" && key !== "error" && key !== "error_description") {
                newParams[key] = value;
            }
        });
        redirectUrl.search = "";
        for (let key in newParams) {
            redirectUrl.searchParams.set(key, newParams[key]);
        }
        redirectUrl.searchParams.set("state", stateId);
         // Slack doesn't want hash in the redirect url
        redirectUrl.hash = "";
        return redirectUrl.toString();
    }
    static navigateToApp() {
        window.location.href = PluginsManager.getSingleExtension<AppExtension>(AppsPointId).appUrlPath;
    }
}