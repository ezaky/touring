import BaseComponent from "../components/BaseComponent";
import QueryCommand from "../entities/QueryCommand";
import { Grid } from "gridjs";
import { EntityType } from "shared/whiz/entities/EntityType";
import "gridjs/dist/theme/mermaid.css";
import "./EntitiesGrid.css";
import { FindQuerySpec, SelectField } from "shared/whiz/entities/QueryDefs";
import RenderersManager from "../renderers/RenderersManager";
import { EntityField } from "shared/whiz/entities/EntityField";
import * as _ from 'lodash-es';
import { h } from "gridjs";
import { html, render as renderLit } from "lit-html";
import '@web.awesome.me/webawesome-pro/dist/components/checkbox/checkbox.js';
import { EntitiesGridProps } from "./EntityDefs";
import StringUtil from "shared/whiz/util/StringUtil";
import EntityUtil from "shared/whiz/entities/EntityUtil";
import FieldType from "shared/whiz/entities/FieldType";
import { TColumn } from "gridjs/dist/src/types.js";

const SelectColumnLabel = "Select";
const SelectColumnWidth = "100px";
const RowIdField = "$row_id";

export default class EntitiesGrid extends BaseComponent<EntitiesGridProps> {
    private _querySpec: FindQuerySpec;
    private _entityType: EntityType;
    private _columns: EntityField[];
    private _grid: Grid;
    private _neededFields: EntityField[];
    private _entitiesById: {[key: string]: any};
    private _selectedEntityIds = new Set();

    initProps(props: EntitiesGridProps) {
        this._querySpec = props.querySpec;
        this._entityType = EntityType.getEntityType(this._querySpec.entityTypeId);
        if (props.columns) {
            this._columns = props.columns;
        } else {
            this._columns = this._querySpec.fields.map(selectFieldOrString => {
                let column: EntityField;
                if (_.isString(selectFieldOrString)) {
                    column = {name: <string>selectFieldOrString}
                } else {
                    const selectField = <SelectField>selectFieldOrString;
                    column = {name: selectField.field};
                    if (selectField.alias) {
                        column.label = StringUtil.getLabelForId(selectField.alias);
                    }
                }
                return column;
            });
        }
        this._columns = this._entityType.complementFields(this._columns);
        this.removeEventListener("change", this._onGridChange);
        this.addEventListener("change", this._onGridChange);
        if (this.props.hasHeader === false) {
            this.classList.add("no-header");
        }
    }
    render() {
        if (this._grid) {
            this._grid.destroy();
        }
        let formatter = this._renderCell;
        let gridColumns: any = this._columns.map(column => {
            let gridColumn: TColumn = {
                id: column.name,
                name: column.label,
                formatter: formatter,
                sort: <any>column.sortable
            }
            if (column.type === FieldType.Number) {
                gridColumn.attributes = {
                    style: "text-align: right"
                }
            }
            return gridColumn;
        });
        if (this.props.hasMultiRowSelect) {
            gridColumns.unshift({
                name: SelectColumnLabel,
                formatter: this._renderRowSelector,
                width: SelectColumnWidth
            });
        }
        gridColumns.unshift({
            id: RowIdField,
            hidden: true // to use it in _renderCell
        });
        this._grid = new Grid({
            columns: gridColumns,
            data: this._queryData,
            sort: true
        });
        this._grid.render(this);
        if (this.props.trackHeightOptions) {
            // give it a chance to render
            _.delay(() => {
                this.trackElemHeight({
                    ...this.props.trackHeightOptions,
                    elem: this.querySelector(".gridjs-wrapper")
                });
            }, 10);
        }
    }
    async refresh() {
        if (this.props.handleRefresh) {
            this._grid.forceRender(); 
        }
    }
    getSelectedEntityIds(): any [] {
        if (!this.props.hasMultiRowSelect) {
            throw new Error("props.hasMultiRowSelect should be true to call this method");
        }
        return [...this._selectedEntityIds];
    }
    private _renderCell = (cell, row, gridColumn) => {
        let entityId = this._getEntityIdForRow(row);
        let template = RenderersManager.renderFieldValue({
            entityType: this._entityType.id,
            entity: this._entitiesById[entityId],
            field: this._columns.find(column => column.name === gridColumn.id)
        });
        return this._renderCellTemplate(template);
    }
    private _renderRowSelector = (cell, row, column) => {
        return this._renderCellTemplate(html`<wa-checkbox 
            class="wa-align-items-center" 
            data-entity-id="${this._getEntityIdForRow(row)}"
            ${this._selectedEntityIds.has(this._getEntityIdForRow(row)) ? "checked" : ""}
            >
        </wa-checkbox>`);
    }
    private _getEntityIdForRow(row) {
        return row.cells[0].data;
    }
    private _renderCellTemplate(template) {
        return h('div', {
            ref: (container) => {
                if (container) {
                    renderLit(template, container);
                }
            }
        });
    }
    private _onGridChange = (e) => {
        const entityId = e.target.getAttribute("data-entity-id");
        if (!entityId) {
            return;
        }
        if (e.target.checked) {
            this._selectedEntityIds.add(entityId);
        } else {
            this._selectedEntityIds.delete(entityId);
        }
    }
    private _queryData = async () => {
        if (!this._neededFields) {
            this._neededFields = await RenderersManager.initFieldsRendering(this._entityType, _.map(this._querySpec.fields, "field"));
        }
        let queryFields = [...EntityUtil.normalize(this._querySpec.fields)];
        const queryFieldsByName = _.keyBy(queryFields, "field");
        for (const neededField of this._neededFields) {
            if (!queryFieldsByName[neededField.name]) {
                queryFields.push({field: neededField.name});
            }
        }
        let querySpec:FindQuerySpec = {
            ...this._querySpec,
            fields: queryFields
        }
        let command = new QueryCommand({
            querySpec: querySpec,
            component: this,
            monitorElem: this,
            hasProgress: false // using Grid.js progress
        });
        let response =  command.execute();
        let entities = (await response).data;
        if (this.props.adjustEntities) {
            entities = this.props.adjustEntities(entities);
        }
        this._entitiesById = {};
        for (const entity of entities) {
            const rowId = _.uniqueId();
            entity[RowIdField] = rowId;
            this._entitiesById[rowId] = entity;
        }
        return entities;
    }
}
customElements.define("entities-grid", EntitiesGrid);