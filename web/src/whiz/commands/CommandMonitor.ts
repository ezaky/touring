import AppUtil from "../app/AppUtil";
import * as _ from "lodash-es";
import '@web.awesome.me/webawesome-pro/dist/components/spinner/spinner.js';
import './CommandMonitor.css';
import { UnauthorizedStatus } from "shared/whiz/sessions/SessionDefs";
import RenderingUtil from "../renderers/RenderingUtil";

export interface CommandMonitorProps {
    promise: Promise<any>,
    successMessage?: string,
    elem?: HTMLElement,
    hasProgress?: boolean,
    progressLabel?: string,
    errorHandler?: (error) => boolean
}
const DefaultProgressDelay = 150;
const GenericError = "Sorry, the operation could not be completed because an error occurred.";
const SpinnerSize = "2.5rem";

export default class CommandMonitor {
    private _props: CommandMonitorProps;
    private _progressTimer;
    private _progressElem: HTMLElement;
    private _savedCss;
    
    constructor(props: CommandMonitorProps) {
        this._props = {...props};
        _.defaults(this._props, {
            hasProgress: true
        });
        this._start();
    }
    private _start() {
        let props = this._props;
        if (props.elem && props.hasProgress) {
            this._progressTimer = _.delay(this._onProgressTimer, DefaultProgressDelay);
        }
        this._props.promise.then(this._onSuccess, this._onError);
    }
    private _onProgressTimer = () => {
         if (!this._progressTimer) { // promise ended before the progress delay
            return;
         }
         this._progressTimer = null;
         this._showProgress();
    }
    private _onSuccess = () => {
        this._hideProgress();
        let successMessage = this._props.successMessage;
        if (successMessage) {
            AppUtil.showSuccesss(successMessage);
        }
    }
    private _onError = (error) => {
        this._hideProgress();
        // e.g. cancel dialogs
        if (!error) {
            return;
        }
        let errorHandler = this._props.errorHandler;
        if (errorHandler && errorHandler(error)) {
            return;
        }
        if (error.httpStatus === UnauthorizedStatus) {
            // e.g. cookie timeout
            AppUtil.logout(true);
            return;
        }
        if (error.isUserError) {
            return AppUtil.showError(error.message);
        }
        console.error(error);
        AppUtil.showError(GenericError);
    }
    private _showProgress() {
        let props = this._props;
        let commandElem = props.elem;
        this._savedCss = {};
        let inlineStyle = commandElem.style;
        const display = window.getComputedStyle(commandElem).display;
        if (display !== "flex") {
            this._savedCss["display"] = inlineStyle["display"];
            // so progress works properly with inline custom elements
            inlineStyle["display"] = "block";
        }
        const positionCss = window.getComputedStyle(commandElem).position;
        if (positionCss !== "absolute" && positionCss !== "fixed") {
            this._savedCss["position"] = inlineStyle["position"];
            inlineStyle["position"] = "relative"; // required for the overlay absolute position
        }
        this._progressElem = RenderingUtil.createElement({
            cssClasses: ["progress-overlay"],
            html: `
                <wa-spinner style="font-size: ${SpinnerSize};"></wa-spinner>
                ${props.progressLabel ? `<p>${props.progressLabel}</p>`: ""}
            `
        });
        commandElem.append(this._progressElem);
    }
    private _hideProgress() {
         if (this._progressTimer) {
            clearTimeout(this._progressTimer);
            this._progressTimer = null;
            return;
         }
         if (this._progressElem) {
            if (!_.isEmpty(this._savedCss)) {
                Object.assign(this._props.elem.style, this._savedCss);
                this._savedCss = null;
            }
            this._progressElem.remove();
            this._progressElem = null;
         }
    }
}