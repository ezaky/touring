import { PersistQuery } from "../whiz/entities/Query";
import * as _ from "lodash-es";
import EntitiesDataHandler from "../whiz/entities/EntitiesDataHandler";
import { ControllerContext } from "../whiz/controllers/ControllerDefs";
import { Operator } from "shared/whiz/entities/Operator";

const PerformerEntityType = "touring.performer";

export default class GeoPlacesDataHandler extends EntitiesDataHandler {
    async preCreate(query: PersistQuery) {
        const entity = query.getEntity();
        entity["slug"] = await this._ensureUniqueSlug(this._getSlugForName(entity.name), query.getContext());
    }
    private async _ensureUniqueSlug(slug, context: ControllerContext) {
        const {data} = await context.db.find({
            entityTypeId: PerformerEntityType,
            fields: ["slug"],
            criteria: {slug: {[Operator.Like]: `${slug}*`}}
        }, context);
        const existingSlugs = new Set(_.map(data, "slug"));
        if (!existingSlugs.has(slug)) {
            return slug;
        }
        let counter = 2;
        while (existingSlugs.has(`${slug}-${counter}`)) {
            counter++;
        }
        return `${slug}-${counter}`;
    }
    private _getSlugForName(name: string): string {
        return name
            .normalize("NFKD")                   // Split accented characters into base + diacritic
            .replace(/[\u0300-\u036f]/g, "")     // Remove diacritical marks (é -> e, ç -> c)
            .toLowerCase()
            .replace(/&/g, " and ")              // Preserve "&" cleanly as "and"
            .replace(/[^a-z0-9]+/g, "-")         // Replace any non-alphanumeric sequence with "-"
            .replace(/^-+|-+$/g, "");            // Trim leading and trailing hyphens
    }
}