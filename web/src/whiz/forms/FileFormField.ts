import FormField from "./FormField";
import { html, render as renderLit } from "lit-html";
import RenderingUtil from "../renderers/RenderingUtil";
import StringUtil from "shared/whiz/util/StringUtil";
import '@web.awesome.me/webawesome-pro/dist/components/file-input/file-input.js';
import * as _ from "lodash-es";
import { FileFormFieldProps } from "./FormDefs";

const Hint = "You can upload the following file types: {0}.";

export default class FileFormField extends FormField<FileFormFieldProps> {
    render() {
        let field = this.props.field;
        let attributes = this.getStdAttributes();
        _.defaults(attributes, {
            multiple: "true",
            size: "small"
        });
        let extensions = this.props.fileExtensions;
        if (!_.isEmpty(extensions)) {
            let fileTypes = [];
            extensions = extensions.map(extension => {
                let fileType;
                if (extension.startsWith(".")) {
                    fileType = extension.substring(1);
                } else {
                    fileType = extension;
                    extension = `.${extension}`;
                }
                fileTypes.push(fileType.toUpperCase());
                return extension;
            });
            attributes.accept = extensions.join(",");
            let hint = StringUtil.substitute(Hint, fileTypes.join(", "));
            if (attributes.hint) {
                hint = `${attributes.hint} ${hint}`;
            }
            attributes.hint = hint;
        }
        renderLit(html`
            <wa-file-input
                name="${field.name}"
                ${RenderingUtil.spreadAttributes(attributes)}
                >
            </wa-file-input>
            `, this);
        if (this.props.autoClick) {
            // simulate a click so the file selector opens without an additional click
            _.defer(() => {
                const fileInput = this.querySelector("wa-file-input");
                const inputElem = (<any>fileInput)?.shadowRoot?.querySelector("input");
                inputElem?.click();
            });
        }
    }
}
customElements.define("file-form-field", FileFormField)