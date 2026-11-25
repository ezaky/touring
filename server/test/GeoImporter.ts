import { ControllerContext } from "../whiz/controllers/ControllerDefs";
import fs from "fs/promises";
import * as _ from "lodash-es";
import DbManager from "../whiz/entities/DbManager";
import GeoPlaceUtil from "shared/util/GeoPlaceUtil";

// https://download.geonames.org/export/dump/
// cities5000.zip
// countryInfo.txt

// see schemas at: https://download.geonames.org/export/dump/readme.txt

const CountriesFilePath = "/Users/essamzaky/dev/touring/geonames/countryInfo.txt";
const PlacesFilePath = "/Users/essamzaky/dev/touring/geonames/cities5000.txt";
const hasAnyNumber = /\p{N}/u;
// keep only cities/villages etc; see http://www.geonames.org/export/codes.html
const KeepFeatureCodes = {
    "PPL": true,
    "PPLC": true,
    "PPLA": true,
    "PPLA2": true,
    "PPLA3": true,
    "PPLA4": true,
    "PPLA5": true
}
const KeepContinents = {
    "EU": true,
    "NA": true
}
const GeoPlaceEntityType = "touring.geoPlace";

export default class GeoImporter {
    private _countryNames: {[countryCode: string]: string} = {};

    async import(context: ControllerContext) {
        await this._parseCountries();

        await this._persistPlaces(context);
    }
    private async _parseCountries() {
        const countriesText: string = await fs.readFile(CountriesFilePath, "utf8");
        const countryLines = countriesText.split("\n");
        for (const countryLine of countryLines) {
            if (countryLine.startsWith("#")) {
                continue;
            }
            const countryEntries = countryLine.split("\t");
            const continent = countryEntries[8];
            if (!KeepContinents[continent]) {
                continue;
            }
            const countryCode = countryEntries[0];
            const countryName = countryEntries[4];
            // console.log(`got countryCode: ${countryEntries[4]} (${countryCode})`);
            this._countryNames[countryCode] = countryName;
        }
    }
    private async _persistPlaces(context: ControllerContext) {
        const placesText: string = await fs.readFile(PlacesFilePath, "utf8");
        const placeLines = placesText.split("\n");
        for (const placeLine of placeLines) {
            const placeEntries = placeLine.split("\t");
            if (!placeEntries[0]) {
                continue;
            }
            await this._persistPlace(placeEntries, context);
        }
    }
    private async _persistPlace(placeEntries, context: ControllerContext) {
        const countryCode = placeEntries[8];
        const countryName = this._countryNames[countryCode];
        if (!countryName) {
            return;
        }
        const name = placeEntries[1];
        const featureClass = placeEntries[6];
        if (featureClass === "P") {
            const featureCode = placeEntries[7];
            if (!KeepFeatureCodes[featureCode] || hasAnyNumber.test(name)) {
                // console.log(`**** skip ${name}`);
                return;
            }
        }
        const usaState = (countryCode === "US" ) ? placeEntries[10] : null;
        await DbManager.getDb().invokeWithConnection(context, (context: ControllerContext) => {
            return context.db.create({
                entityTypeId: GeoPlaceEntityType,
                entity: {
                    id: placeEntries[0],
                    name: name,
                    normalized_name: GeoPlaceUtil.normalizePlaceName(name),
                    country_code: countryCode,
                    country_name: countryName,
                    usa_state: usaState,
                    $latitude: placeEntries[4],
                    $longitude: placeEntries[5],
                    population: placeEntries[14]
                }
            }, context)
        })
    }
}