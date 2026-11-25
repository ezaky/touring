import { RendererParams } from "shared/whiz/entities/EntityField";
import { html } from 'lit-html';  
import * as _ from "lodash-es";

export default class ArrayRenderer {
    render(params: RendererParams) {
        let array = params.value;
        if (_.isEmpty(array)) {
            return;
        }
        return html`${array.join(", ")
        }`
    }
}