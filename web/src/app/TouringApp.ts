import BaseComponent from "../whiz/components/BaseComponent";
import { html, render as renderLit } from 'lit-html';  
import '@web.awesome.me/webawesome-pro/dist/components/toast/toast.js';
import '../whiz/components/ConfirmationDialog';

import AppUtil from '../whiz/app/AppUtil';

export default class GemApp extends BaseComponent {
    render() {
        renderLit(html`
            <div class="app-content"></div>
            <wa-toast placement="top-center"></wa-toast>
            <confirmation-dialog></confirmation-dialog>
            `, this);

        AppUtil.appToast = this.querySelector("wa-toast"); 
    }
}
customElements.define("touring-app", GemApp);