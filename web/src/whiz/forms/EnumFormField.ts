import FormField from "./FormField";
import { html, render as renderLit } from "lit-html";
import RenderingUtil from "../renderers/RenderingUtil";
import "@web.awesome.me/webawesome-pro/dist/components/select/select.js";
import "@web.awesome.me/webawesome-pro/dist/components/combobox/combobox.js";
import "@web.awesome.me/webawesome-pro/dist/components/option/option.js";
import "@web.awesome.me/webawesome-pro/dist/components/icon/icon.js";
import { EnumItem } from "shared/whiz/entities/EntityField";
import * as _ from "lodash-es";
import RenderersManager from "../renderers/RenderersManager";
import { EnumFormFieldProps } from "./FormDefs";

const Placeholder = "Select a value";
const ComboPlaceholder = "Select or search a value";

export default class EnumFormField extends FormField<EnumFormFieldProps> {
    private _tagName;
    private _enumItems;
    
    public async loadData(): Promise<EnumItem[]> {
        let field = this.props.field;
        if (_.isArray(field.enum)) {
            return RenderingUtil.normalizeEnumItems(<any>field.enum);
        } 
        if (!field.renderer) {
            throw new Error("Expected an enum renderer");
        }
        return RenderersManager.getFieldRenderer(field).getItems();
    }
    public render(enumItems: EnumItem[]) {
        this._enumItems = enumItems;

        let field = this.props.field;
        const hasSearch = this.props.hasSearch;

        // so this class get value is called; see Dialog.ts
        this.setAttribute("name", field.name);
        if (this.props.isValueEnumItem && this.props.hasOwnProperty("value")) {
            this.props.value = (<EnumItem>this.props.value)?.value;
        }
        const attributes = this.getStdAttributes();
        if (attributes.value === undefined) {
            attributes.placeholder = hasSearch ? ComboPlaceholder : Placeholder;
        }
        this._tagName = hasSearch ? "wa-combobox" : "wa-select";
        let selectedItem;
        if (enumItems[0]?.icon) {
            const value = this.isRendered() ? this.querySelector(this._tagName).value : this.props.value;
            selectedItem = value ? enumItems.find(enumItem => enumItem.value === value) : {icon: "link"}
        }
        let optionsTemplate: any = enumItems.map(enumItem => html`
            <wa-option value="${enumItem.value}" ?disabled=${enumItem.disabled}>
                ${enumItem.icon ? this._renderItemIcon(enumItem) : ""} ${enumItem.label}
            </wa-option>
        `);
        if (selectedItem) {
            optionsTemplate = html`${this._renderItemIcon(selectedItem, {class: "label-icon", slot: "start"})} ${optionsTemplate}`
        }
        renderLit(html`${RenderingUtil.renderTagByNameVar(this._tagName, null, attributes, optionsTemplate)}`, this);

        // redispatch the change event so the event target is this class so the name attribute is retrieved properly
        this.querySelector(this._tagName).addEventListener("change", this._onChange);
    }
    // so things like "e.target.name" work
    public get name() {
        return this.getAttribute("name");
    }
    public get value() {
        let value = this.querySelector(this._tagName).value;
        if (!value || !this.props.isValueEnumItem) {
            return value;
        }        
        return {
            value: value,
            label: this._enumItems.find(item => item.value === value)?.label
        };
    }
    private _renderItemIcon(enumItem: EnumItem, attributes?) {
        if (!enumItem.icon) {
            return "";
        }
        return html`<wa-icon 
                name="${enumItem.icon}" 
                family="${enumItem.iconFamily || "regular"}" 
                variant="light"
                ${RenderingUtil.spreadAttributes(attributes)}
                >
            </wa-icon>`
    }
    private _onChange = (e) => {        
        e.stopPropagation();
        this.dispatchEvent(new CustomEvent("change", {
            bubbles: true, 
            composed: true 
        }));
    }
}
customElements.define("enum-form-field", EnumFormField)