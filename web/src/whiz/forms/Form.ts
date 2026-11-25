import BaseComponent from "../components/BaseComponent";
import { FormFieldProps, FormProps } from "./FormDefs";
import * as _ from "lodash-es";
import RenderingUtil from "../renderers/RenderingUtil";
import FieldType from "shared/whiz/entities/FieldType";
import { EntityField } from "shared/whiz/entities/EntityField";
import AsyncUtil from "shared/whiz/util/AsyncUtil";
import { html, render as renderLit } from "lit-html";
import FormField from "./FormField";

export default class Form extends BaseComponent<FormProps> {
    private _formFieldsByName;
    private _isFirstRender = true;

    async loadData() {
        let values = this.props.values;
        let promisesByName = {};
        let i = 0;
        let foundFocus;
        for (let field of this.props.fields) {
            if (!foundFocus && field.name) {
                let attributes = _.clone(field.formField?.attributes || {});
                attributes["data-initial-focus"] = true
                field = {
                    ...field,
                    formField: {
                        ...field.formField,
                        attributes
                    }
                }
                foundFocus = true;
            }
            let props: FormFieldProps = {
                field: field,
                ...field.formField?.props
            }
            if (values) {
                props.value = _.get(values, field.name)
            }
            const renderer = field.formField?.render;
            if (renderer) {
                promisesByName[field.name] = renderer(props);
            } else {
                promisesByName[field.name] = RenderingUtil.renderTagByModuleKey(this._getFormFieldKey(field), props);
            }
            ++i;
        }
        this._formFieldsByName = await AsyncUtil.all(promisesByName)      
    }
    render() {
        let templates = this.props.fields.map(field => {
            // the value in _formFieldsByName could be the result of RenderingUtil.renderTagByModuleKey or a from field renderer
            const value = this._formFieldsByName[field.name];
            return value && value.template ? html`${value.template}` : value;
        });
        renderLit(templates, this);
        if (this._isFirstRender) {
            this._isFirstRender = false;
            _.defer(() => {
                const firstField: any = this.querySelector("[data-initial-focus]");
                firstField?.focus && firstField.focus();
            });
        }
    }
    getFieldValue(fieldName: string): any {
        const field = this.querySelector(`[name='${fieldName}']`);
        return (<any>field)?.value;
    }
    setFieldError(fieldName: string, error: string) {
        const field = this.querySelector<FormField>(`[name='${fieldName}']`);
        field.setError(error);
    }
    private _getFormFieldKey(field: EntityField) {
        let type = field.type;
        let key = field.formField?.moduleKey;
        if (key) {
            return key;
        }
        if (field.enum) {
            return "whiz/forms/EnumFormField"
        }
        if (!type || type === FieldType.String) {
            return "whiz/forms/TextFormField"
        }
        switch (type) {
            case FieldType.Boolean: {
                return "whiz/forms/BooleanFormField"
            }
            case FieldType.Number: {
                return "whiz/forms/NumberFormField"
            }
            case FieldType.Date: {
                return "whiz/forms/DateFormField"
            }
            case FieldType.File: {
                return "whiz/forms/FileFormField"
            }
        }
        throw new Error(`unsupported field type ${type}`);
    }
}
customElements.define("whiz-form", Form);