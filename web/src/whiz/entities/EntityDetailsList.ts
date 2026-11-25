import { Entity } from "shared/whiz/entities/QueryDefs";
import BaseComponent from "../components/BaseComponent";
import { EntityType } from "shared/whiz/entities/EntityType";
import { html, render as renderLit } from "lit-html";
import { repeat } from 'lit/directives/repeat.js';
import ArrayUtil from "shared/whiz/util/ArrayUtil";
import { EntityDetailsListProps, EntityDetailsProps } from "./EntityDefs";
import "../entities/EntityDetails";
import '@web.awesome.me/webawesome-pro/dist/components/details/details.js';
import "./EntityDetailsList.css";
import RenderersManager from "../renderers/RenderersManager";
import * as _ from "lodash-es";

const InternalIdName = "_id";

export default class EntityDetailsList extends BaseComponent<EntityDetailsListProps> {
    private _entityType: EntityType;
    private _idField: string;

    initProps(props: EntityDetailsListProps) {
        this._entityType = EntityType.getEntityType(props.entityType);
        this._idField = this.props.idField || this._entityType.idField;
        if (!this._idField) {
            this._idField = InternalIdName;
            for (let entity of this.props.entities) {
                entity[InternalIdName] = _.uniqueId();
            }
        }
        if (!this._entityType.nameField) {
            throw new Error(`nameField should be specified`);
        }
        super.initProps(props);
    }
    async loadData() {
        await RenderersManager.loadFieldRenderer(this._entityType.getField(this._entityType.nameField))
    }
    render(data?, refreshParams?) {
        const entities = this.props.entities;
        renderLit(html`
            <div class="entity-details-list wa-stack wa-gap-xs">
                ${repeat(
                    entities,
                    entity => entity[this._idField],
                    (entity, index) => this._renderEntity(entity)
                )}
            </div>
            `, this);
        const expandId = this.props.expandId;
        if (expandId != null) {
            this.querySelector<any>(`wa-details[open]`)?.hide();
            this.querySelector<any>(`[data-entity-id="${expandId}"]`).show();
        }
    }
    private _renderEntity(entity: Entity) {
        let props = this.props;
        const entityType = this._entityType;
        const summaryFieldName = this._entityType.nameField;
        let summaryFieldValue = RenderersManager.renderFieldValue({
            entity,
            entityType: this._entityType,
            fieldName: summaryFieldName
        });
        if (props.entitySummaryRenderer) {
            summaryFieldValue = props.entitySummaryRenderer(entity, summaryFieldValue);
        }
        let detailsFieldNames = ArrayUtil.mapAndFilter(this._entityType.fields, field => {
            // the name is already in the summary
            if (field.name !== summaryFieldName) {
                return field.name;
            }
        });
        let detailsProps:EntityDetailsProps = {
            entityType: entityType,
            entity: entity,
            fields: detailsFieldNames
        }
        const entityId = entity[this._idField];
        if (!entityId) {
            throw new Error("null entityId not allowed here");
        }
        return html`
            <wa-details name="entity-details-list-item" appearance="plain" data-entity-id="${entityId}">
                <div class="entity-details-list-item-summary" slot="summary">
                    ${summaryFieldValue}
                </div>
                <whiz-entity-details .props=${detailsProps}></whiz-entity-details>
                ${props.extraEntityRender ? html`${props.extraEntityRender(entity)}` : ""}
            </wa-details>
        `
    }
}
customElements.define("whiz-entity-details-list", EntityDetailsList);