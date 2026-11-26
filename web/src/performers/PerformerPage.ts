import BaseComponent from "../whiz/components/BaseComponent";
import { html, render as renderLit } from "lit-html";
import { msg } from '@lit/localize';
import SessionsManager from "../whiz/app/SessionsManager";
import QueryCommand from "../whiz/entities/QueryCommand";
import { AppConst } from "shared/app/AppDefs";
import * as _ from "lodash-es";
import AsyncUtil from "shared/whiz/util/AsyncUtil";
import "./PerformerPage.css";
import { Entity } from "shared/whiz/entities/QueryDefs";
import "./TourStops";
import "./PerformerProfile";
import '@web.awesome.me/webawesome-pro/dist/components/icon/icon.js';
import '@web.awesome.me/webawesome-pro/dist/components/tooltip/tooltip.js';

const PerformerEntityType = "touring.performer";

export default class PerformerPage extends BaseComponent {
    private _performer: Entity;
    
    async loadData() {
        let command = new QueryCommand({
            querySpec: {
                entityTypeId: PerformerEntityType,
                criteria: {
                    email: SessionsManager.getUserData().userEmail
                },
                fields: ["id", "name", "slug"],
            }
        });
        this._performer = (await command.execute()).data[0];
    }
    render() {        
        if (!this._performer) {
            return;
        }
        this.classList.add("gem-page");
        renderLit(html`
            <main>
                ${this._renderHeader()}
                <tour-stops .props=${{performerId: this._performer.id}}></tour-stops>
                <performer-profile .props=${{performerId: this._performer.id}}></performer-profile>
            </main>
        `, this);
    }
    private _renderHeader() {
        let url = this._getPerformerUrl();
        const buttonId = _.uniqueId();
        return html`
            <header class="page-header">
                <h1 class="page-title">${this._performer.name}</h1>
                <div class="performer-link page-subtitle">
                    <a href="${url.toString()}" target="_blank">${url.host}${url.pathname}</a>
                    <wa-button id="${buttonId}" variant="neutral" appearance="plain" @click=${this._onCopyUrl} size="s">
                        <wa-icon name="copy" variant="light" label="Copy"></wa-icon>
                    </wa-button>
                    <wa-tooltip for="${buttonId}" trigger="manual">${msg("Copied")}</wa-tooltip>
                </div>
            </header>
        `;
    }
    private _onCopyUrl = async () => {
        await navigator.clipboard.writeText(this._getPerformerUrl().toString());
        const tooltip = this.querySelector<any>(".page-header wa-tooltip");
        tooltip.show();
        await AsyncUtil.sleep(1*1000);
        tooltip.hide();
    }
    private _getPerformerUrl(): URL {
        return new URL(`${SessionsManager.isDev() ? AppConst.devWebUrl : AppConst.productionUrl}/${this._performer.slug}`);
    }
}
customElements.define("performer-page", PerformerPage);