import { EntityField } from "shared/whiz/entities/EntityField";
import BaseComponent from "../components/BaseComponent";
import { EntityType } from "shared/whiz/entities/EntityType";
import { html, render as renderLit } from "lit-html";
import { DialogFormHandler, DialogSubmitSpec } from "../components/DialogDefs";
import QueryCommand from "./QueryCommand";
import { Entity, QueryType } from "shared/whiz/entities/QueryDefs";
import * as _ from "lodash-es";
import { EntityFormBeforeSubmitResponse, EntityFormProps } from "./EntityDefs";
import ObjectUtil from "shared/whiz/util/ObjectUtil";
import ArrayUtil from "shared/whiz/util/ArrayUtil";
import "../forms/Form";
import Form  from "../forms/Form";
import { FormProps } from "../forms/FormDefs";
import RenderersManager from "../renderers/RenderersManager";
import WebEntityUtil from "./WebEntityUtil";

export default class EntityForm<T extends EntityFormProps = EntityFormProps>  extends BaseComponent<T> implements DialogFormHandler {
    protected entityType: EntityType;
    private _entity: Entity;
    private _form: Form;

    initProps(props:EntityFormProps): void {
        this.entityType = EntityType.getEntityType(props.entityType);
        this._entity = props.entity;
    }
    async loadData(): Promise<any> {
        let props: EntityFormProps = this.props;
        const fields = this.getFieldsToQuery();
        if (!this._entity && props.entityId) {
            let command = new QueryCommand({
                querySpec: {
                    entityTypeId: this.entityType.id,
                    entityId: props.entityId,
                    fields: this.getQueryFieldNames(fields)
                },
                monitorElem: this
            });
            this._entity = (await command.execute()).data;
        }
        // load enum renderers for EnumFormField
        let promises = ArrayUtil.mapAndFilter(fields, field => {
            if (field.enum === true && field.renderer) {
                return RenderersManager.loadFieldRenderer(field);
            }
        });
        if (promises.length) {
            await Promise.all(promises);
        }
        return {fields}
    }
    render(data) {
        const fields = this.adjustFieldsToRenderer(data.fields);
        this.classList.add("entity-form");
        if (this.props.entityId) {
            // this attribute could be used to display the details when editing is cancelled 
            this.setAttribute("data-entity-id", this.props.entityId);
        }
        let formProps:FormProps = {
            fields: fields,
            values: this._entity
        }
        renderLit(html`<whiz-form .props=${formProps}></whiz-form>`, this);
        this._form = this.querySelector("whiz-form");
    }
    getEntityType() {
        return this.entityType;
    }
    getEntity() {
        return this._entity;
    }
    isForEditing() {
        return !!this.props.entity || !!this.props.entityId;
    }
    getFieldValue(fieldName: string): any {
       return this._form.getFieldValue(fieldName);
    }
    setFieldError(fieldName: string, error: string) {
        this._form.setFieldError(fieldName, error);
    }
    protected getFieldsToQuery(): EntityField[] {
        return this.entityType.complementFields(this.props.fields);
    }
    protected adjustFieldsToRenderer(queryFields: EntityField[]): EntityField[] {
        return queryFields;
    }
    protected getQueryFieldNames(fields: EntityField[]): string[] {
        // convert nested json fields to the top level field name because the update will happen on the full object
        const rootFieldNames: string[] = WebEntityUtil.getRootFieldNames(fields);
        return WebEntityUtil.filterEntityTypeFields(this.entityType, rootFieldNames) as string[];
    }
    protected getUpdateEntity(newEntity:Entity): Entity {
        let result = {};
        for (let key in newEntity) {
            let newValue = newEntity[key];
            if (!_.isEqual(newValue, this._entity[key])) {
                result[key] = newValue;
            }
        }
        return result;
    }
    protected getCreationEntity(newEntity:Entity): Entity {
        return newEntity;
    }
    protected async beforeSubmit(entity: Entity, submitSpec: DialogSubmitSpec): Promise<EntityFormBeforeSubmitResponse> {
        return null;
    }
    async onSubmit(submitSpec: DialogSubmitSpec) {
        let newEntity = ObjectUtil.unflatten(submitSpec.values);
        let entityId = this.props.entityId;
        if (entityId) {
            return this._updateEntity(entityId, newEntity, submitSpec);
        } else {
            return this._createEntity(newEntity, submitSpec);
        }
    }
    private async _createEntity(newEntity: Entity, submitSpec: DialogSubmitSpec) {
        newEntity = this.getCreationEntity(newEntity);
        const response = (await this.beforeSubmit(newEntity, submitSpec)) || {};
        response.entity && (newEntity = response.entity);
        let command = new QueryCommand<QueryType.Create>({
            queryType: QueryType.Create,
            querySpec: {
                entityTypeId: this.entityType.id,
                entity: newEntity
            },
            monitorElem: submitSpec.monitorElem,
            successMessage: response.successMessage
        });
        return command.execute(); // e.g. {entityId: 9} for entity creation
    }
    private async _updateEntity(entityId, newEntity: Entity, submitSpec: DialogSubmitSpec) {
        newEntity = this.getUpdateEntity(newEntity);
        const response = (await this.beforeSubmit(newEntity, submitSpec)) || {};
        response.entity && (newEntity = response.entity);
        let command = new QueryCommand<QueryType.Update>({
            queryType: QueryType.Update,
            querySpec: {
                entityTypeId: this.entityType.id,
                entityId: entityId,
                entity: newEntity
            },
            entityName: this._entity[this.entityType.nameField],
            monitorElem: submitSpec.monitorElem,
            successMessage: response.successMessage
        });
        return command.execute(); // e.g. {entityId: 9} for entity creation
    }
}
customElements.define("entity-form", EntityForm)