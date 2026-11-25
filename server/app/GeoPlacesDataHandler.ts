import { PersistQuery } from "../whiz/entities/Query";
import * as _ from "lodash-es";
import EntitiesDataHandler from "../whiz/entities/EntitiesDataHandler";
import { CreateQueryResult } from "shared/whiz/entities/QueryDefs";
import SqlDb from "../whiz/sql/SqlDb";
import StringUtil from "shared/whiz/util/StringUtil";

const LocationSql = "UPDATE geo_places SET location=ST_SetSRID(ST_MakePoint({0}, {1}), 4326)::geography WHERE id='{2}'";

export default class GeoPlacesDataHandler extends EntitiesDataHandler {
    private _latitude;
    private _longitude;

    async preCreate(query: PersistQuery) {
        const entity = query.getEntity();
        this._latitude = entity["$latitude"];
        this._longitude = entity["$longitude"];
        if (!this._latitude || !this._longitude) {
            throw new Error("latitude, longitude required");
        }
        delete entity["$latitude"];
        delete entity["$longitude"];
    }
    async postCreate(result: CreateQueryResult, query: PersistQuery) {
        await (<SqlDb>query.getDb()).executeSql(StringUtil.substitute(LocationSql, this._longitude, this._latitude, result.entityId), query.getContext());
    }
}