import { Criteria, FindQuerySpec } from "shared/whiz/entities/QueryDefs";
import * as _ from "lodash-es";
import FiltersManager from "./FiltersManager";
import EntityUtil from "shared/whiz/entities/EntityUtil";

export interface FiltersHandlerParams {
    elem: HTMLElement,
    entityTypeId?: string
}

export default class FiltersHandler {
    private _elem: HTMLElement;
    private _entityTypeId: string;
    private _criteriaByEntityType: {[entityTypeId: string]: Criteria};    

    constructor(params: FiltersHandlerParams) {
        this._elem = params.elem;
        this._entityTypeId = params.entityTypeId;
        FiltersManager.register(this);
    }
    public elemDisconnected() {
        FiltersManager.unregister(this);
    }
    public setEntityTypesCriteria(criteriaByEntityType: {[entityTypeId: string]: Criteria}, refresh=true) {
        this._criteriaByEntityType = criteriaByEntityType;
        if (refresh) {
            this._refresh();
        }
    }
    public setCriteria(criteria: Criteria, refresh=true) {
        if (!this._entityTypeId) {
            throw new Error("setCriteria should only be called if an entityTypeId param was passed.");
        }
        this._criteriaByEntityType = {[this._entityTypeId]: criteria};
        if (refresh) {
            this._refresh();
        }
    }
    public getCriteria(entityTypeId?) {
        return this._criteriaByEntityType[entityTypeId || this._entityTypeId];
    }
    public adjustQuerySpec(querySpec: FindQuerySpec, options: {component: HTMLElement, refreshOnFilters: boolean}): FindQuerySpec {
        if (!this._criteriaByEntityType) {
            return querySpec;
        }
        const component = options.component;
        const criteria = this.getCriteria(querySpec.entityTypeId);
        if (!criteria || !this._elem.contains(component)) {
            return querySpec;
        }
        component.dataset.isQuerySource = "true";
        if (options.refreshOnFilters === false) {
            component.dataset.refreshOnFilters = "false"
        }
        return {
            ...querySpec,
            criteria: EntityUtil.addCriteria({...querySpec.criteria}, criteria)
        }
    }
    private _refresh() {
        const traverse = (elem) => {
            if (elem.dataset?.isQuerySource === "true") {
                if (elem.dataset.refreshOnFilters !== "false") {
                    elem.refresh();
                }
                // assuming components performing filtered queries do not contain other querying components
                return;
            }
            let child = elem.firstElementChild;
            while (child) {
                traverse(child);
                child = child.nextElementSibling;
            }
        }
        traverse(this._elem);
    }
}
