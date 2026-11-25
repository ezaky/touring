import { EntityType, LabelSelector } from "shared/whiz/entities/EntityType";
import { html } from "lit-html";
import CustomFormField from "./CustomFormField";
import StringUtil from "shared/whiz/util/StringUtil";
import "@web.awesome.me/webawesome-pro/dist/components/button/button.js";
import "@web.awesome.me/webawesome-pro/dist/components/icon/icon.js";
import Dialog from "../components/Dialog";
import { EntitiesFormFieldProps, EntityDetailsListProps, EntityFormBeforeSubmitResponse, EntityFormProps } from "../entities/EntityDefs";
import { DialogSubmitSpec } from "../components/DialogDefs";
import * as _ from "lodash-es";
import "../entities/EntityDetailsList";
import ConfirmationDialog from "../components/ConfirmationDialog";
import { CommandAppearance, CommandSpec, CommandsViewerProps } from "../commands/CommandDefs";
import "./EntitiesFormField.css";
import { Entity } from "shared/whiz/entities/QueryDefs";
import { Sortable } from "sortablejs";
import AppUtil from "../app/AppUtil";

const InternalIdField = "_internalId";
const DefaultFormKey = "whiz/entities/EntityForm";
const AddEntityLabel = "Add {0}";
const EditEntityLabel = "Edit {0}";
const RemoveConfirmation = "Are you sure you want to remove this {0}?";
const EmptyEntitiesTitle = "No {0} have been added.";
const DragHandleClass = "drag-handle";
const DuplicateId = `The {0} "{1}" is already used.`;

export default class EntitiesFormField extends CustomFormField<EntitiesFormFieldProps> {
    private _entityType: EntityType;
    private _entities: Entity[];
    private _expandId;

    initProps(props: EntitiesFormFieldProps): void {
        this._entityType = EntityType.getEntityType(props.entityType);
        if (!this._entityType.nameField) {
            throw new Error(`nameField should be defined in the EntitiesFormField entity type`);
        }
        super.initProps(props);
    }
    customRender() {
        if (this.props.hasSorting && this._entities.length > 1) {
            this.classList.add("has-sorting");
        } else {
            this.classList.remove("has-sorting");
        }
        // add entities-form-field class so the css rules work on subclasses as well
        this.classList.add("entities-form-field");
        let template;
        if (this._entities.length) {
            let listProps:EntityDetailsListProps = {
                entityType: this._entityType,
                idField: InternalIdField,
                entities: this._entities,
                entitySummaryRenderer: this.props.hasSorting ? this._renderSortHandle : null,
                extraEntityRender: this._renderEntityCommands,
                expandId: this._expandId
            }
            template = html`
                <whiz-entity-details-list .props=${listProps}></whiz-entity-details-list>
            `;
        } else {
            template = this._renderEmpty();
        }
        this._expandId = undefined;
        return html`
            ${html`${template}`}
            <wa-button class="add-entity-btn" appearance="plain" variant="neutral" 
                    @click=${this._handleAddEntity}>
                <wa-icon name="plus" variant="light"></wa-icon>
                ${this._getAddEntityLabel()}
            </wa-button>
        `;
    }
    render() {
        super.render();

        _.defer(() => {
            const elem = this.querySelector(".entity-details-list");
            if (!elem) {
                return;
            }
            Sortable.create(this.querySelector(".entity-details-list"), {
                handle: `.${DragHandleClass}`,
                ghostClass: "drag-ghost-invisible",
                onEnd: this._onDragEnd,
                animation: 150
            });
        })
    }
    protected setInternalValue(value: any) {
        this._entities = (value || []).map(entity => {
            if (!entity[InternalIdField]) {
                entity = {...entity, [InternalIdField]: _.uniqueId()};
            }
            return entity;
        });
    }
    get value() {
        const value: any[] = super.value;
        if (_.isEmpty(value)) {
            // for the required validator
            return null;
        }
        return value.map(entity => {
            if (entity[InternalIdField]) {
                entity = {...entity};
                delete entity[InternalIdField];
            }
            return entity;
        });
    }
    set value(value) {
        if (_.isEmpty(value)) {
            // for the required validator
            value = null;
        }
        super.value = value;
    }
    private _renderEntityCommands = (entity) => {
        let commands:CommandSpec[] = [
            {
                label: "Edit",
                icon: "pen",
                handler: this._handleEditEntity
            },
            {
                appearance: CommandAppearance.Divider
            },
            {
                label: "Remove",
                icon: "xmark",
                handler: this._handleRemoveEntity
            }
        ]
        let props:CommandsViewerProps = {
            commands: commands,
            appearance: CommandAppearance.Icon
        }
        return html`<whiz-commands .props=${props}></whiz-commands>`
    }
    private _renderSortHandle = (entity: Entity, defaultSummary: any) => {
        if (this._entities.length === 1) {
            return defaultSummary;
        }
        return html`
                <wa-icon name="grip-vertical" variant="light" class="${DragHandleClass}"></wa-icon> ${defaultSummary}
        `;
    }
    private _renderEmpty() {
        return html`
            <div class="empty-entities wa-align-items-center">
                ${StringUtil.substitute(EmptyEntitiesTitle, this._entityType.getLabel(LabelSelector.PluralLower))}
            </div>
        `;
    }
    private _handleAddEntity = (e) => {
        this._showEntityDialog(this._getAddEntityLabel(), this._onAddEntitySubmit);
    }
    private _handleEditEntity = (e) => {
        let index = this._getIndexForEvent(e);
        let entity = this._entities[index];
        this._showEntityDialog(StringUtil.substitute(EditEntityLabel, this._entityType.getLabel()), 
            this._onEditEntitySubmit.bind(this, index), entity);
    }
    private _handleRemoveEntity = async (e) => {
        await ConfirmationDialog.open({
            message: StringUtil.substitute(RemoveConfirmation, this._entityType.getLabel(LabelSelector.SingularLower))
        });
        let newEntities = this._entities.concat();
        newEntities.splice(this._getIndexForEvent(e), 1);
        this.value = newEntities;
    }
    private _showEntityDialog(title, handler, entity?) {
        let formProps: EntityFormProps = {
            entityType: this._entityType,
            fields: this._entityType.fields,
            entity: entity
        }
        if (this.props.editingFormProps) {
            Object.assign(formProps, this.props.editingFormProps);
        }
        Dialog.showDialog({
            title: title,
            formKey: this._entityType.editingFormKey || DefaultFormKey,
            formProps: formProps,
            dialogHandler: {
                onSubmit: handler
            }
        })
    }
    private _getIndexForEvent(e) {
        const entityId = e.target.closest("[data-entity-id]").getAttribute("data-entity-id");
        return _.findIndex(this._entities, entity => entity[InternalIdField] == entityId);
    }
    private _onAddEntitySubmit = async(spec: DialogSubmitSpec) => {
        const index = this._entities.length;
        this._checkUniques(spec);
        let entity = await this._getDialogEntity(spec);    
        const newId = this._expandId = _.uniqueId();    
        entity = {...entity, [InternalIdField]: newId};
        let newEntities = this._entities.concat();
        newEntities.splice(index, 0, entity);
        this.value = newEntities;
    }
    private async _onEditEntitySubmit(index, spec: DialogSubmitSpec) {
        this._checkUniques(spec, index);
        let newEntities = this._entities.concat();
        let entity = await this._getDialogEntity(spec);    

        newEntities[index] = {...entity, [InternalIdField]: this._entities[index][InternalIdField]};
        this.value = newEntities;
    }
    private async _getDialogEntity(spec: DialogSubmitSpec): Promise<Entity> {
        let entity = spec.values;
        const response: EntityFormBeforeSubmitResponse = await spec.form.beforeSubmit(entity, spec);
        response?.entity && (entity = response.entity);
        return entity;
    } 
    private _onDragEnd = (e) => {
        const oldIndex = e.oldIndex;
        let newIndex = e.newIndex;
        if (oldIndex === newIndex) {
            return;
        }
        const entity = this._entities[oldIndex];
        this._entities.splice(oldIndex, 1);
        if (newIndex > oldIndex) {
            --newIndex;
        }
        let newEntities = this._entities.concat();
        newEntities.splice(newIndex, 0, entity);
        this.value = newEntities;
    }
    private _getAddEntityLabel() {
        return StringUtil.substitute(AddEntityLabel, this._entityType.getLabel());
    }
    private _checkUniques(spec: DialogSubmitSpec, index?) {
        const uniqueFields = this.props.uniqueFields;
        if (_.isEmpty(uniqueFields)) {
            return;
        }
        if (uniqueFields.length > 1) {
            throw new Error("uniqueFields.length should be 1 for now");
        }
        const uniqueField = uniqueFields[0];
        const uniqueFieldValue = spec.values[uniqueField];
        let i = 0;
        for (const entity of this._entities) {
            if (index === i) {
                continue;
            }
            if (entity[uniqueField] == uniqueFieldValue) {
                AppUtil.showError(StringUtil.substitute(DuplicateId, uniqueField, uniqueFieldValue));
                throw null;
            }
            ++i;
        }
    }
}
customElements.define("entities-form-field", EntitiesFormField);