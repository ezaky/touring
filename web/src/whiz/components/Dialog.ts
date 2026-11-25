import BaseComponent from "../components/BaseComponent";
import { html, render as renderLit } from "lit-html";
import { keyed } from 'lit/directives/keyed.js';
import { DialogButtonCancel, DialogButtonOk, DialogButtonSpec, DialogFormHandler, DialogProps } from "./DialogDefs";
import "@web.awesome.me/webawesome-pro/dist/components/button/button.js";
import "@web.awesome.me/webawesome-pro/dist/components/dialog/dialog.js";
import * as _ from "lodash-es";
import "./Dialog.css";
import RenderingUtil from "../renderers/RenderingUtil";
import AppUtil from "../app/AppUtil";
import ObjectUtil from "shared/whiz/util/ObjectUtil";

const DefaultOkLabel = "OK";
const DefaultCancelLabel = "Cancel";

export default class Dialog extends BaseComponent<DialogProps> {
    private _form;
    private _formHandler: DialogFormHandler;
    private _promise;
    private _promiseResolve;
    private _promiseReject;
    private _submitted:boolean;
    private _isChanged:boolean;

static showDialog(props: DialogProps, cssClass?: string): Dialog {
        let dialog = <Dialog>document.createElement("whiz-dialog");
        if (cssClass) {
           dialog.classList.add(cssClass); 
        }
        dialog.props = {
            ...props,
            isModal: true
        };
        document.body.append(dialog);
        return dialog;
    }
    initProps(props: DialogProps) {
        _.defaults(props, {
            formKey: "whiz/forms/Form"
        });
        super.initProps(props);
    }
    async loadData(): Promise<any> {
        return RenderingUtil.renderTagByModuleKey(this.props.formKey, this.props.formProps);
    }
    render(data) {
        let props = this.props;
        let okButtonSpec = ObjectUtil.extendDeep({
                label: DefaultOkLabel,
                attributes: {
                    variant: "brand",
                    appearance: "accent"
                }
            }, _.find(props.buttons, {id: DialogButtonOk}));
        let cancelButtonSpec = ObjectUtil.extendDeep({
                label: DefaultCancelLabel,
                attributes: {
                    variant: "neutral",
                    appearance: "plain"
                }
            }, _.find(props.buttons, {id: DialogButtonCancel}));
        let formId = _.uniqueId("form");
        // keyed is used to always create new form items regardless of old submitted or cancelled values
        let contentTemplate = keyed(_.uniqueId(), html`
            <wa-scroller orientation="vertical">
                <form id="${formId}" class="dialog-content" 
                        @submit=${this._handleSubmit} 
                        @change=${this._handleFormChange}>      
                    ${data.template}        
                </form>
            </wa-scroller>
            <div class="dialog-footer">
                ${cancelButtonSpec.label ? html`
                    <wa-button @click=${this.close} ${RenderingUtil.spreadAttributes(cancelButtonSpec.attributes)}>
                        ${cancelButtonSpec.label}
                    </wa-button>
                    ` : ""}
                ${okButtonSpec.label ? html`
                    <wa-button type="submit" form=${formId} ${RenderingUtil.spreadAttributes(okButtonSpec.attributes)}>
                        ${okButtonSpec.label}
                    </wa-button>
                    ` : ""}
            <div>
        `);
        let template;
        if (props.isModal) {
            template = html`
                <wa-dialog label="${props.title}" @wa-hide=${this._onDialogHidden}>
                    ${html`${contentTemplate}`}
                </wa-dialog>`
        } else {
            template = contentTemplate;
        }
        renderLit(template, this);
        this._form = this.querySelector(data.tagName);
        // this._form may be implementing DialogFormHandler
        this._formHandler = this.props.dialogHandler || <any>this._form;

        props.isModal && (this.querySelector("wa-dialog").open = true);
    }
    promise() {
        if (!this._promise) {
            this._promise = new Promise((resolve, reject) => {
                this._promiseResolve = resolve;
                this._promiseReject = reject;
            });
        }
        return this._promise;
    }
    isChanged():boolean {
        return this._isChanged;
    }
    close = (e) => {
        this._formHandler.onCancel && this._formHandler.onCancel(e);
        if (this.props.isModal) {
            this.querySelector("wa-dialog").open = false;
        } else if (this._promiseReject) {
            this._promiseReject();
            this._promiseReject = null;
        }
        this._promise = null;
    }
    private _onDialogHidden = (e) => {
        // wa-hide could be triggered by other components (e.e. wa-select), only proceed if the event actually came from the dialog
        if (e.target !== e.currentTarget) {
            return;
        }
        this.remove();
        if (!this._submitted && this._promiseReject) {
            this._promiseReject();
            this._promiseReject = null;
        }
    }
    private _handleFormChange = (e) => {
        this._isChanged = true;
        let handler;
        if (this._formHandler.onChange) {
            handler = this._formHandler;
        } else if (this._form.onChange) {
            handler = this._form;
        }
        if (!handler) {
            return;
        }
        // defer so the form field value is updated
        _.defer(() => {
            handler.onChange(e);
        });
    }
    private _handleSubmit = async (e) => {
         AppUtil.removeAllMessages();
        e.preventDefault();
        const formData = new FormData(e.target);
        let filesFormData: FormData;
        formData.forEach((value, name) => {
            if (value instanceof File) {
                if (!filesFormData) {
                    filesFormData = new FormData();
                }
                filesFormData.append(name, value);
            }
        });
        const values = {};
        let elems = this.querySelectorAll("[name]");
        for (let elem of elems) {
            const name = elem.getAttribute("name");
            // wa-select could have empty name if the name attribute is not set
            if (!name || elem.tagName.toLowerCase() === "wa-file-input" || !("value" in elem)) {
                continue;
            }
            let value = (<any>elem).value;
            if (value !== "") {
                values[name] = value;
            }
        }
        let response = await this._formHandler.onSubmit({
            values: values,
            formData: filesFormData,
            form: this._form,
            monitorElem: this.props.isModal ? this.querySelector("wa-dialog") : this
        });
        this._submitted = true;
        this.props.isModal && (this.querySelector("wa-dialog").open = false);
        if (this._promiseResolve) {
            this._promiseResolve(response);
            this._promiseResolve = null;
        }
        this._promise = null;
    }
}
customElements.define("whiz-dialog", Dialog);