import BaseComponent from "../whiz/components/BaseComponent";
import { html, render as renderLit } from "lit-html";
import { repeat } from 'lit/directives/repeat.js';
import { msg } from '@lit/localize';
import SessionsManager from "../whiz/app/SessionsManager";
import QueryCommand from "../whiz/entities/QueryCommand";
import { AppConst } from "shared/app/AppDefs";
import * as _ from "lodash-es";
import '@web.awesome.me/webawesome-pro/dist/components/icon/icon.js';
import '@web.awesome.me/webawesome-pro/dist/components/tooltip/tooltip.js';
import AsyncUtil from "shared/whiz/util/AsyncUtil";
import "./PerformerPage.css";
import Dialog from "../whiz/components/Dialog";
import { Entity, QueryType } from "shared/whiz/entities/QueryDefs";
import GeoUtil from "../whiz/util/GeoUtil";
import DateUtil from "../whiz/util/DateUtil";
import { DialogProps } from "../whiz/components/DialogDefs";

const PerformerEntityType = "touring.performer";
const TourStopEntityType = "touring.tourStop";

export default class PerformerPage extends BaseComponent {
    private _performer: Entity;
    private _tourStops: Entity[];
    
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
        if (!this._performer) {
            return;
        }
        command = new QueryCommand({
            querySpec: {
                entityTypeId: TourStopEntityType,
                criteria: {
                    performer_id: this._performer.id
                    // ezez add only the future dates
                },
                fields: ["id", "start_date", "end_date", "place.name", "place.country_code", "place.country_name", "place.usa_state"],
                orderBy: [{field: "start_date"}]
            }
        });
        this._tourStops = (await command.execute()).data;
    }
    render() {        
        if (!this._performer) {
            return;
        }
        this.classList.add("performer-page");
        this.classList.add("gem-page");
        renderLit(html`
            <main class="gem-section">
                <div class="container">
                    ${this._renderHeader()}
                    ${this._renderTourStops()}
                </div>
            </main>
        `, this);
    }
    private _renderHeader() {
        let url = this._getPerformerUrl();
        const buttonId = _.uniqueId();
        return html`
            <header class="page-header">
                <h1 class="page-title">${this._performer.name}</h1>
                <a href="${url.toString()}" target="_blank">${url.host}${url.pathname}</a>
                <wa-button id="${buttonId}" variant="neutral" appearance="plain" @click=${this._onCopyUrl}>
                    <wa-icon name="copy" variant="light" label="Copy"></wa-icon>
                </wa-button>
                <wa-tooltip for="${buttonId}" trigger="manual">${msg("Copied")}</wa-tooltip>
            </header>
        `;
    }
    private _renderTourStops() {
        return html`
            <section class="tour-dates-section">
                <div class="container">
                    <div class="section-header">
                        <h2 class="section-title">${msg("Tour Dates")}</h2>
                        <wa-button appearance="plain" variant="brand" @click=${this._handleAddStopCommand}>
                            <wa-icon name="plus" variant="light"></wa-icon> ${msg("Add Date")}
                        </wa-button>
                    </div>
                    ${_.isEmpty(this._tourStops) 
                        ? html`${msg("No tour dates added yet — Click Add Date to let fans know where you are.")}` 
                        : html`
                            <div class="tour-stops wa-stack wa-gap-xs">
                                ${repeat(
                                    this._tourStops,
                                    (entity: Entity) => entity.id,
                                    (entity, index) => this._renderTourStop(entity)
                                )}
                            </div>
                        `
                    }
                </div>
            </section>
        `;
    }
    private _renderTourStop(tourStop: Entity) {
        return html`
            <div class="tour-stop" data-id=${tourStop.id}>
                <div class="tour-info">
                    <div class="tour-city">${this._renderPlace(tourStop.place)}</div>
                    <div class="tour-dates">${DateUtil.formatDateRange(tourStop.start_date, tourStop.end_date)}</div>
                </div>
                <div class="tour-actions">
                    <wa-button variant="neutral" appearance="plain" @click=${this._handleEditStopCommand}>
                        <wa-icon name="pen" variant="light" label="Edit"></wa-icon>
                    </wa-button>
                    <wa-button variant="neutral" appearance="plain" @click=${this._handleDeleteStopCommand} >
                        <wa-icon name="trash-can" variant="light" label="Delete"></wa-icon>
                    </wa-button>
                </div>
            </div>
        `
    }
    private _renderPlace(place: Entity) {
        let name = place.name;
        if (place.usa_state) {
            name += `, ${place.usa_state}`;
        }
        if (place.country_code.toLowerCase() !== GeoUtil.getBrowserCountryCode()?.toLowerCase()) {
            name += ` - ${place.country_name}`;
        }
        return name;
    }
    private _onCopyUrl = async () => {
        await navigator.clipboard.writeText(this._getPerformerUrl().toString());
        const tooltip = this.querySelector<any>(".page-header wa-tooltip");
        tooltip.show();
        await AsyncUtil.sleep(1*1000);
        tooltip.hide();
    }
    private _handleAddStopCommand = async () => {
        return this._handleDialogCommand({
            title: msg("Add Date"),
            formProps: {performerId: this._performer.id}
        });
    }
    private _handleEditStopCommand = (e) => {
        const entityId = e.target.closest("[data-id]").getAttribute("data-id");
        return this._handleDialogCommand({
            title: msg("Edit Date"),
            formProps: {entityId: entityId}
        });
    }
    private _handleDeleteStopCommand = async (e) => {
        const entityId = e.target.closest("[data-id]").getAttribute("data-id");
        const tourStop = this._tourStops.find(entity => entity.id == entityId);
        let command = new QueryCommand<QueryType.Delete>({
            queryType: QueryType.Delete,
            querySpec: {
                entityTypeId: TourStopEntityType,
                criteria: {id: entityId}
            },
            monitorElem: this.querySelector(".tour-dates-section"),
            entityName: tourStop.place.name
        });
        await command.execute();
        this.refresh();
    }
    private async _handleDialogCommand(dialogProps: DialogProps) {
        dialogProps.formKey = "performers/TourStopForm";
        dialogProps.formProps.tourStops = this._tourStops;
        const dialog = Dialog.showDialog(dialogProps);
        await dialog.promise();
        this.refresh();
    }
    private _getPerformerUrl(): URL {
        return new URL(`${SessionsManager.isDev() ? AppConst.devWebUrl : AppConst.productionUrl}/${this._performer.slug}`);
    }
}
customElements.define("performer-page", PerformerPage);