export const DialogButtonOk = "OK";
export const DialogButtonCancel = "Cancel";

export interface DialogButtonSpec {
    id?: string,
    label?: string,
    attributes?: {[key:string]:string}
}
export interface DialogSubmitSpec {
    values: {[key: string]: any},
    formData: FormData,
    form: any,
    monitorElem: HTMLElement
}
export interface DialogChangeSpec {
    event: any
}
export interface DialogProps {
    title?: string,
    /**
     * The web modulekey of a class that implements DialogFormHandler, 
     * unless the dialogHandler property is passed.
     * Defaults to "whiz/forms/Form"
     */
    formKey?: string,
    formProps?: {[key: string]: any},
    buttons?: DialogButtonSpec[],
    isModal?: boolean,
    dialogHandler?: DialogFormHandler
}
export interface DialogFormHandler {
    onSubmit(spec: DialogSubmitSpec): any,
    onCancel?: (e) => void,
    onChange?: (e) => any
}
