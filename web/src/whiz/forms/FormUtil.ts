import { EntityField } from "shared/whiz/entities/EntityField";
import { StaticTextFieldProps } from "./FormDefs";

const ErrorEmoji = "❌";

export default class FormUtil {
    public static getErrorFields(error: string): EntityField[] {
        // a field that prevents submission. Assumeing the error is already displayed in the form
        return [
            {
                name: "_unused",
                formField: {
                    moduleKey: "whiz/forms/StaticTextFormField",
                    props: <StaticTextFieldProps> {
                        text: `${ErrorEmoji} ${error}`
                    }
                }
            },
            {
                name: "_hidden_error_field",
                isRequired: true,
                formField: {
                    attributes: {
                        style: "position: fixed; top: 0; left: 0; width: 1px; height: 1px; opacity: 0; pointer-events: none; margin: 0; padding: 0;",
                        tabindex: "-1"
                    }
                }
            }
        ];
    }
}