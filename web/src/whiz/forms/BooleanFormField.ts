import FormField from "./FormField";
import { html, render as renderLit } from "lit-html";
import RenderingUtil from "../renderers/RenderingUtil";
import "@web.awesome.me/webawesome-pro/dist/components/radio-group/radio-group.js";
import "@web.awesome.me/webawesome-pro/dist/components/radio/radio.js";

export default class BooleanFormField extends FormField {
    render() {
        let field = this.props.field;
        // so this class get value is called; see Dialog.ts
        this.setAttribute("name", field.name);
        renderLit(html`
            <wa-radio-group 
                    value="false" 
                    orientation="horizontal"
                    ${RenderingUtil.spreadAttributes(this.getStdAttributes())}>
                <wa-radio value="true">Yes</wa-radio>
                <wa-radio value="false">No</wa-radio>
            </wa-radio-group>
            `, this);
    }
    get value() {
        let value = this.querySelector("wa-radio-group").value;
        return value === "true";
    }
}
customElements.define("boolean-form-field", BooleanFormField)