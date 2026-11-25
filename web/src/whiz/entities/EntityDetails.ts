import { EntityType } from "shared/whiz/entities/EntityType";
import BaseComponent from "../components/BaseComponent";
import RenderersManager from "../renderers/RenderersManager";
import QueryCommand from "./QueryCommand";
import { Entity } from "shared/whiz/entities/QueryDefs";
import { EntityField } from "shared/whiz/entities/EntityField";
import * as _ from "lodash-es";
import { html, render as renderLit } from "lit-html";
import { EntityDetailsProps } from "./EntityDefs";
import ArrayUtil from "shared/whiz/util/ArrayUtil";

export class EntityDetails<T extends EntityDetailsProps=EntityDetailsProps>  extends BaseComponent<T> {
    private _entityType: EntityType;
    private _entity: Entity;

    initProps(props: T) {
        this._entityType = EntityType.getEntityType(props.entityType);
        if (!this._entityType) {
            throw new Error(`Invalid entity type "${props.entityType}"`);
        }
    }
    async loadData() {
        let fields: EntityField[] = this.getFieldsToQuery();
        let neededFields = await RenderersManager.initFieldsRendering(this._entityType, fields);
        let entity = this.props.entity;
        if (!entity) {
            if (!this.props.entityId) {
                throw new Error(`entity or entityId should be specified`);
            }
            let command = new QueryCommand({
                querySpec: {
                    entityTypeId: this._entityType.id,
                    entityId: this.props.entityId,
                    fields: this.getQueryFieldNames(neededFields)
                }
            });
            entity = (await command.execute()).data;
        }
        this._entity = entity;
        return {
            entity: entity,
            fields: fields
        };
    }
    render(data) {
        const fields = this.adjustFieldsToRenderer(data.fields);
        // add a css class because styling using the tag name is not possible for subclasses
        this.classList.add("whiz-entity-details");
        let htmls = ArrayUtil.mapAndFilter(fields, field => {
            let value = RenderersManager.renderFieldValue({
                entity: data.entity,
                entityType: this._entityType,
                field: field
            });
            if (value == null) {
                return;
            }
            return html`
                <div class="entity-field">
                    <dt class="entity-field-label">${field.label}</dt>
                    <dd class="entity-field-value">${value}</dd>
                </div>
            `
        });
        let template = html`
            <wa-scroller orientation="vertical">
                <dl class="entity-fields-list">${htmls}</dl>
            <wa-scroller>
        `;
        renderLit(template, this);
    }
    public getEntityType() {
        return this._entityType;
    }
    public getEntity(): Entity {
        return this._entity;
    }
    protected getFieldsToQuery(): EntityField[] {
        return this._entityType.complementFields(this.props.fields);
    }
    protected adjustFieldsToRenderer(queryFields: EntityField[]): EntityField[] {
        return queryFields;
    }
    protected getQueryFieldNames(fields: EntityField[]): string[] {
        return _.uniq(_.map(fields, "name"));
    }
}
customElements.define("whiz-entity-details", EntityDetails);