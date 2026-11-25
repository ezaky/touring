import FormField from "./FormField";
import { html, render as renderLit } from "lit-html";
import RenderingUtil from "../renderers/RenderingUtil";
import * as _ from "lodash-es";
import '@web.awesome.me/webawesome-pro/dist/components/date-input/date-input.js';

export default class DateFormField extends FormField {
    render() {
        let field = this.props.field;
        renderLit(html`
            <wa-date-input
                name="${field.name}"
                ${RenderingUtil.spreadAttributes(this.getStdAttributes())}
                >
            </wa-date-input>
            `, this);
    }
}
customElements.define("date-form-field", DateFormField)