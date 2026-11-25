import FormField from "./FormField";
import { html, render as renderLit } from "lit-html";
import RenderingUtil from "../renderers/RenderingUtil";
import * as _ from "lodash-es";
import '@web.awesome.me/webawesome-pro/dist/components/date-input/date-input.js';
import DateUtil from "shared/whiz/util/DateUtil";

export default class DateRangeFormField extends FormField {
    render() {
        let field = this.props.field;
        // so this class get value is called; see Dialog.ts
        this.setAttribute("name", field.name);
        const stdAttrs = this.getStdAttributes();
        if (stdAttrs.value) {
            stdAttrs.value = `${stdAttrs.value.from}/${stdAttrs.value.to}`;
        }
        renderLit(html`
            <wa-date-input mode="range" months="2"
                ${RenderingUtil.spreadAttributes(stdAttrs)}
                >
            </wa-date-input>
            `, this);
    }
    get value() {
        let value: any = this.querySelector("wa-date-input").value;
        // value is YYYY-MM-DD/YYYY-MM-DD. Convert to a from/to object
        if (value) {
            value = value.split("/");
            value = {
                from: value[0],
                to: value[1]
            }
        }
        return value;
    }
}
customElements.define("date-range-form-field", DateRangeFormField)