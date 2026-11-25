import BaseComponent from "../components/BaseComponent";
import * as _ from "lodash-es";
import { FormFieldProps } from "./FormDefs";
import { html } from "lit-html";
import '@web.awesome.me/webawesome-pro/dist/components/tooltip/tooltip.js';
import RenderingUtil from "../renderers/RenderingUtil";
import ObjectUtil from "shared/whiz/util/ObjectUtil";

export default abstract class FormField<T extends FormFieldProps = FormFieldProps> extends BaseComponent<T> {
    initProps(props: T): void {
        super.initProps(props);
        const field = props.field;
        if (!field.label) {
            ObjectUtil.extendDeep(field, {
                formField: {
                    attributes: {
                        class: "hide-form-field-label",
                    }
                }
            })
        }
    }
    getStdAttributes(): {[name: string]: any} {
        let props = this.props;
        let field = props.field;
        let formField = field.formField || {};
        let attributes = formField.attributes || {};
        let extras: any = {
            class: "entity-form-field"
        };
        if (field.label) {
            extras.label = field.label;
        }
        if (props.hasOwnProperty("value")) {
            extras.value = props.value;
        } else if (formField.defaultValue !== undefined) {
            extras.value = formField.defaultValue;
        }
        // if there is an extra hint then the whole hint is rendered in getSlotsHtml
        if (field.description && attributes.hint === undefined && !props.extraHint) {
            extras.hint = field.description;
        }
        if (field.isRequired) {
            extras.required = true;
        }
        if (!_.isEmpty(extras)) {
            attributes = _.defaults({...attributes}, extras);
        }
        return attributes
    }
    renderSlots() {
        let props = this.props;
        if (!props.extraHint) {
            return;
        }
        let field = props.field;
        let attributes = field.formField?.attributes || {};
        return html`
            <div slot="hint">
                ${attributes.hint || ""}
                ${RenderingUtil.renderTooltipLink(props.extraHint.label, props.extraHint.text, {placement: "top-start"})}
            </div>
        `;
    }
    setError(error: string) {
        const inputElem = this.querySelector<any>(".entity-form-field");
        inputElem.setCustomValidity(error);
        inputElem.reportValidity();
        if (error) {
            inputElem.addEventListener("input", this._clearError);
        }
    }
    private _clearError = (e) => {
        e.target.setCustomValidity("");
        e.target.removeEventListener("change", this._clearError);
    }
}