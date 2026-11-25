import FormField from "./FormField";
import "./CustomFormField.css";
import { html, render as renderLit } from "lit-html";
import { FormFieldProps } from "./FormDefs";

const RequiredError = "Please fill out this field.";

export default abstract class CustomFormField<T extends FormFieldProps = FormFieldProps> extends FormField<T> {
     // tells the browser it's a form element, required for validation
    static formAssociated = true;

    private _value: any;
    private _internals: ElementInternals;
    private _isFirstRender = true;
    
    abstract customRender(data?);

    constructor() {
        super();
        // required to handle validation states
        this._internals = this.attachInternals();
    }
    public initProps(props: T): void {
        this._value = props.value;
        this.setInternalValue(props.value);
        super.initProps(props);
    }
    public render(data?) {
        let field = this.props.field;
        this.setAttribute("name", field.name);
        renderLit(html`
            <div class="custom-form-field entity-form-field">
                <label class="entity-field-label ${field.isRequired ? "field-required-indicator" : ""}">
                    ${field.label}
                </label>
                <div class="field-container" tabindex="0">
                    ${this.customRender(data)}
                </div>
                ${field.description ? html`<div class="field-hint">${field.description}</div>` : ""}
            </div>
            `, this);
        if (this._isFirstRender) {
            this._isFirstRender = false;
            this._updateValidity();
        }
    }
    protected setInternalValue(value) {
    }
    /**
     * Dialog._handleSubmit assumes a value getter exists. 
     */
    public get value() {
        return this._value;
    }
    public set value(value) {
        this._value = value;
        this.setInternalValue(value);
        this._internals.setFormValue(value);
        this.refresh();
        this.dispatchEvent(new CustomEvent("change", {
            bubbles: true, 
            composed: true 
        }));
        this._updateValidity();
    }
    private _updateValidity() {
        if (this.props.field.isRequired && !this._value) {
            // the element should be focusable
            this._internals.setValidity({valueMissing: true}, RequiredError, this.querySelector(".field-container"));
        }  else {
            this._internals.setValidity(null);
        }
    }
}