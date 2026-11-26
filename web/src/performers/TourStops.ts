import BaseComponent from "../whiz/components/BaseComponent";
import { html, render as renderLit } from "lit-html";
import { repeat } from 'lit/directives/repeat.js';
import { msg } from '@lit/localize';
import QueryCommand from "../whiz/entities/QueryCommand";
import * as _ from "lodash-es";
import "./PerformerPage.css";
import Dialog from "../whiz/components/Dialog";
import { Entity, QueryType } from "shared/whiz/entities/QueryDefs";
import GeoUtil from "../whiz/util/GeoUtil";
import DateUtil from "../whiz/util/DateUtil";
import { DialogProps } from "../whiz/components/DialogDefs";
import '@web.awesome.me/webawesome-pro/dist/components/icon/icon.js';
import "./TourStops.css";
import { Operator } from "shared/whiz/entities/Operator";

const TourStopEntityType = "touring.tourStop";

export interface TourStopsProps {
    performerId
}
export default class TourStops extends BaseComponent<TourStopsProps> {
    private _tourStops: Entity[];
    
    async loadData() {
        const performerId = this.props.performerId;
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`
        const command = new QueryCommand({
            querySpec: {
                entityTypeId: TourStopEntityType,
                criteria: {
                    performer_id: performerId,
                    end_date: {[Operator.GEq]: todayStr}
                },
                fields: ["id", "start_date", "end_date", "place.name", "place.country_code", "place.country_name", "place.usa_state"],
                orderBy: [{field: "start_date"}]
            }
        });
        this._tourStops = (await command.execute()).data;
    }
    render() {        
        renderLit(html`
            <section class="gem-section tour-dates-section">
                <div class="section-header">
                    <h2 class="section-title">${msg("Tour Dates")}</h2>
                    <wa-button appearance="plain" variant="brand" @click=${this._handleAddStopCommand}>
                        <wa-icon name="plus" variant="light"></wa-icon> ${msg("Add Date")}
                    </wa-button>
                </div>
                ${_.isEmpty(this._tourStops) 
                    ? html`${msg("No tour dates added yet — Click Add Date to let fans know where you are.")}` 
                    : html`
                        <div class="tour-stops-list wa-stack wa-gap-xs">
                            ${repeat(
                                this._tourStops,
                                (entity: Entity) => entity.id,
                                (entity, index) => this._renderTourStop(entity)
                            )}
                        </div>
                    `
                }
            </section>
        `, this);
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
    private _handleAddStopCommand = async () => {
        return this._handleDialogCommand({
            title: msg("Add Date"),
            formProps: {performerId: this.props.performerId}
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
}
customElements.define("tour-stops", TourStops);