import FormField from "./FormField";
import { html, render as renderLit } from "lit-html";
import "@web.awesome.me/webawesome-pro/dist/components/input/input.js";
import "@web.awesome.me/webawesome-pro/dist/components/textarea/textarea.js";
import RenderingUtil from "../renderers/RenderingUtil";
import * as _ from "lodash-es";
import { TextFormFieldProps } from "./FormDefs";
import { SemanticType } from "shared/whiz/entities/EntityField";
import ArrayUtil from "shared/whiz/util/ArrayUtil";

const ArrayHint = "Enter each value in a new line.";

export default class TextFormField extends FormField<TextFormFieldProps> {
    private _tagName;
    render() {
        let field = this.props.field;
        // so this class get value is called; see Dialog.ts
        this.setAttribute("name", field.name);
        let isArray = field.isArray;
        let isTextarea = this.props.useTextarea || isArray;
        this._tagName = isTextarea ? "wa-textarea" : "wa-input";
        let attributes: any = {}
        if (isTextarea) {
            Object.assign(attributes, {
                resize: "auto",
                rows: 2
            });
        }
        if (field.semanticType === SemanticType.Password) {
            Object.assign(attributes, {
                "type": "password",
                "password-toggle": "true"
            });
        }
        let stdAttributes = this.getStdAttributes();
        if (isArray) {
            let hint = ArrayHint;
            if (stdAttributes.hint) {
                hint = `${stdAttributes.hint} ${hint}`;
                delete stdAttributes.hint; // see extend below
            }
            attributes.hint = hint;
        }
        _.extend(attributes, stdAttributes);
        if (isArray && this.props.value) {
            attributes.value = this.props.value.join("\n");
        }
        renderLit(html`${RenderingUtil.renderTagByNameVar(this._tagName, null, attributes, this.renderSlots())}`, this);
        if (isTextarea && this.props.hasLinefeeds === false) {
            this.querySelector("wa-textarea").addEventListener("keydown", this._filteroutLinefeed);
        }
    }
    get value() {
        let value = this.querySelector(this._tagName).value;
        value && (value = value.trim());
        if (!value) {
            return null;
        }
        if (this.props.field.isArray) {
            value = value.split("\n");
            value = ArrayUtil.mapAndFilter(value, item => {
                item = item.trim();
                if (item) {
                    return item;
                }
            });
        }
        return value;
    }
    private _filteroutLinefeed = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            e.target.closest("form")?.requestSubmit();
        }
    }
}
customElements.define("text-form-field", TextFormField)