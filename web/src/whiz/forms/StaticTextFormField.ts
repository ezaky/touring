import FormField from "./FormField";
import { html, render as renderLit } from "lit-html";
import { StaticTextFieldProps } from "./FormDefs";

export default class StaticTextFormField extends FormField<StaticTextFieldProps> {
    render() {
        const field = this.props.field;
        renderLit(html`
            <div class="entity-form-field ${this.props.cssClass || ""}">
                ${field.label ? html`
                    <label class="entity-field-label">
                        ${field.label}
                    </label>
                ` : ""}
                <div>${this.props.text}</div>
            </div>
            `, this);
    }
}
customElements.define("static-text-field", StaticTextFormField)