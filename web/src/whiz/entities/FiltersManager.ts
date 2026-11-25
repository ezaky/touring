import { FindQuerySpec } from "shared/whiz/entities/QueryDefs";
import * as _ from "lodash-es";
import FiltersHandler from "./FiltersHandler";

class FiltersManager {
    private _handlers: FiltersHandler[] = [];

    public register(handler: FiltersHandler) {
        if (this._handlers.includes(handler)) {
            throw new Error("handler already registered");
        }
        this._handlers.push(handler);
    }
    public unregister(handler: FiltersHandler) {
        const index = this._handlers.indexOf(handler);
        if (index < 0) {
            throw new Error("elem was not registered");
        }
        this._handlers.splice(index, 1);
    }
    public adjustQuerySpec(querySpec: FindQuerySpec, options: {component: HTMLElement, refreshOnFilters: boolean}): FindQuerySpec {
        if (!options.component || !this._handlers.length) {
            return querySpec;
        }
        for (const handler of this._handlers) {
            const result = handler.adjustQuerySpec(querySpec, options);
            if (result) {
                return result;
            }
        }
        return querySpec;      
    }
}
export default new FiltersManager();