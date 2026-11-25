import { EntityField } from "shared/whiz/entities/EntityField";

export interface FormProps {
    fields: EntityField[],
    values?: {[key:string]: any}
}
export interface FormFieldProps {
    field: EntityField,
    value?: any,
    cssClass?: string,
    extraHint?: {label: string, text: string}
}
export interface TextFormFieldProps extends FormFieldProps {
    useTextarea?: boolean,
    // used if useTextarea is true, defaults to true
    hasLinefeeds?: boolean
}
export interface EnumFormFieldProps extends FormFieldProps {
    // If true then the for field value is the value/label enum item instead of just the id
    isValueEnumItem?: boolean,
    hasSearch?: true
}
export interface FileFormFieldProps extends FormFieldProps {
    fileExtensions?: string[],
    autoClick?: boolean
}
export interface StaticTextFieldProps extends FormFieldProps {
    text: any // string or html-lit template
}



