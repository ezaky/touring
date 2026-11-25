import BaseComponent from "./BaseComponent";
import { html, render as renderLit } from "lit-html";
import "@web.awesome.me/webawesome-pro/dist/components/dialog/dialog.js";
import "@web.awesome.me/webawesome-pro/dist/components/button/button.js";
import WaDialog from "@web.awesome.me/webawesome-pro/dist/components/dialog/dialog.js";
import * as _ from "lodash-es";

export type MessageType = (() => any) | string;

export interface ConfirmationDialogProps {
    message?: MessageType,
    okButtonLabel?: string,
    cancelButtonLabel?: string
}

let instance: ConfirmationDialog;
const OkButtonLabel = "Yes";
const CancelButtonLabel = "No";

export default class ConfirmationDialog extends BaseComponent<ConfirmationDialogProps> {
    private _promiseResolve;
    private _promiseReject;

    constructor() {
        super();
        instance = this;
    }
    render(data: any) {
    }
    static async open(props?: ConfirmationDialogProps): Promise<ConfirmationDialog> {
        return instance.open(props);
    }
    private async open(props?: ConfirmationDialogProps): Promise<ConfirmationDialog> {
        props && (this.props = props);
        props = this.props;
        let template = html`
            <wa-dialog 
                @wa-hide=${this._onDialogHidden}
                without-header
            >
                ${_.isFunction(props.message) ? html`${(<any>props.message)()}` : props.message}
                <wa-button slot="footer" variant="neutral" appearance="plain" data-dialog="close">
                    ${props.cancelButtonLabel || CancelButtonLabel}
                </wa-button>
                <wa-button slot="footer" variant="brand" appearance="accent" data-dialog="close" data-ok>
                    ${props.okButtonLabel || OkButtonLabel}
                </wa-button>
            </wa-dialog>`;
        renderLit(template, this);

        let dialog = this.querySelector<WaDialog>("wa-dialog");
        dialog.open = true;
        dialog.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                this.querySelector<HTMLElement>("wa-button[data-ok]").click();
            }
        });
        let promise = new Promise<ConfirmationDialog>((resolve, reject) => {
            this._promiseResolve = resolve;
            this._promiseReject = reject;
        });
        return promise;
    }
    private _onDialogHidden = (e) => {
        let source = <HTMLElement>e.detail.source;
        if (source && source.getAttribute("data-ok") != null) {
            this._promiseResolve(this);
        } else {
            this._promiseReject();
        }
    }
}

customElements.define("confirmation-dialog", ConfirmationDialog);