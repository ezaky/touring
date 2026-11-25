import HttpCommand from "../whiz/commands/HttpCommand";
import BaseComponent from "../whiz/components/BaseComponent";
import { html, render as renderLit } from "lit-html";
import '@web.awesome.me/webawesome-pro/dist/components/combobox/combobox.js';
import * as _ from "lodash-es";

export default class TestPage extends BaseComponent {
    render() {
        renderLit(html`
            <wa-button @click=${this._onClick}>Test</wa-button>
            <div class="test-container" style="margin-bottom: 20px">
            </div>
            `, this);
    }
    private _onClick = async () => {         
        let command = new HttpCommand({
            url: "/touring/test",
            method: HttpCommand.Post,
            params: {
            },
            monitorElem: this
        });
        let response = await command.execute();
    }
}
customElements.define("test-page", TestPage);