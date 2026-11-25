import FormField from "./FormField";
import { html, render as renderLit } from "lit-html";
import RenderingUtil from "../renderers/RenderingUtil";
import * as _ from "lodash-es";
import '@web.awesome.me/webawesome-pro/dist/components/number-input/number-input.js';
import { SemanticType } from "shared/whiz/entities/EntityField";

export default class NumberFormField extends FormField {
    render() {
        let field = this.props.field;
        let attributes = this.getStdAttributes();
        attributes["without-steppers"] = true;
        attributes["step"] = "any"; // otherwise decimal fields give error because step defaults to 1
        const isDecimal = field.semanticType === SemanticType.Decimal
        if (isDecimal) {
            attributes.inputmode = "decimal";
        }
        renderLit(html`
            <wa-number-input
                name="${field.name}"
                ${RenderingUtil.spreadAttributes(attributes)}
                >
            </wa-number-input>
            `, this);
        if (!isDecimal) {
            this.addEventListener("keydown", this._onIntKeydown);
        }
    }
    _onIntKeydown(e) {
        if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) {
            e.preventDefault();
        }
    }
}
customElements.define("number-form-field", NumberFormField)