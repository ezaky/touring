import { html, render as renderLit } from "lit-html";
import QueryCommand from "../whiz/entities/QueryCommand";
import '@web.awesome.me/webawesome-pro/dist/components/combobox/combobox.js';
import '@web.awesome.me/webawesome-pro/dist/components/option/option.js';
import * as _ from "lodash-es";
import { Operator } from "shared/whiz/entities/Operator";
import GeoPlaceUtil from "shared/util/GeoPlaceUtil";
import GeoUtil from "../whiz/util/GeoUtil";
import FormField from "../whiz/forms/FormField";
import { msg } from '@lit/localize';
import RenderingUtil from "../whiz/renderers/RenderingUtil";
import { Criteria, Entity } from "shared/whiz/entities/QueryDefs";

const GeoPlaceEntityType = "touring.geoPlace";
const MinSearchLen = 3;

const SearchLenMessage = msg("Type few characters to search");
const NoResultsMessage = msg("No matching cities");

export default class GeoPlaceFormField extends FormField {
    private _lowerCountryCode: string;
    private _initialOption;

    async loadData() {
        const placeId = this.props.value;
        if (!placeId) {
            return;
        }
        this._initialOption = (await this._queryPlaces(placeId))[0];
    }

    render() {
        this._lowerCountryCode = GeoUtil.getBrowserCountryCode()?.toLowerCase();
        const field = this.props.field;
        renderLit(html`
            <wa-combobox 
                name="${field.name}",
                placeholder="${msg("Type to search...")}" .dataSource=${this._queryComboboxOptions}
                ${RenderingUtil.spreadAttributes(this.getStdAttributes())}
            >
                ${this._initialOption ? html`
                    <wa-option value="${this._initialOption.value}" selected>
                        ${this._initialOption.label}
                    </wa-option>
                    ` : ""}
                <span slot="empty">${SearchLenMessage}</span>
                <span slot="no-results">${NoResultsMessage}</span>
            </wa-combobox>`, this);
    }
    private _queryComboboxOptions = async ({query}) => {
        const combobox = this.querySelector("wa-combobox");
        const setEmptySlotText = text => {
            combobox.querySelector(`span[slot="no-results"]`).textContent = text;
        }
        let searchText = query;
        let placeId;
        if (!searchText) {
            placeId = combobox.value;
        }
        let criteria: Criteria;
        if (!placeId) {
            !searchText && (searchText = combobox.inputValue);
            if (!searchText || searchText.length < MinSearchLen) {
                setEmptySlotText(SearchLenMessage);
                return [];
            }
            searchText = GeoPlaceUtil.normalizePlaceName(searchText);
            criteria = {normalized_name: {[Operator.Like]: `${searchText}*`}}
        }
        const places = await this._queryPlaces(placeId, criteria);
        if (!places.length) {
            setEmptySlotText(NoResultsMessage);
        }
        return places;
    }
    private async _queryPlaces(placeId, criteria?: Criteria) {
        if (placeId) {
            criteria = {"id": placeId};
        }
        const command = new QueryCommand({
            querySpec: {
                entityTypeId: GeoPlaceEntityType,
                criteria,
                fields: ["id", "name", "country_code", "country_name", "usa_state"],
                orderBy: [{field: "name"}, {field: "population", descending: true}]
            }
        });
        let places = (await command.execute()).data;
        // if query by id then a single entity is returned
        placeId && places && (places = [places]);
        if (_.isEmpty(places)) {
            return [];
        }
        const ownCountryPlaces = [];
        const otherCountriesPlaces = []
        // put same country first
        for (let place of places) {
            const lowerCountryCode = place.country_code.toLowerCase();
            if (this._lowerCountryCode && lowerCountryCode === this._lowerCountryCode) {
                ownCountryPlaces.push(place);
            } else {
                otherCountriesPlaces.push(place);
            }
        }
        const rankedPlaces = ownCountryPlaces.concat(otherCountriesPlaces);
        const addCountry = !!otherCountriesPlaces.length;
        return rankedPlaces.map((place) => {
            let name = place.name;
            if (place.usa_state) {
                name += `, ${place.usa_state}`;
            }
            if (addCountry) {
                name += ` - ${place.country_name}`
            }
            return {
                label: name,
                value: place.id
            }
        });
    }
}
customElements.define("geo-place-form-field", GeoPlaceFormField)