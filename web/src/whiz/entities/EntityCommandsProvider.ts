import { EntityType, LabelSelector } from "shared/whiz/entities/EntityType";
import { CommandAppearance, CommandSpec, EntityCommandId } from "../commands/CommandDefs";
import * as _ from "lodash-es";
import AppUtil from "../app/AppUtil";
import StringUtil from "shared/whiz/util/StringUtil";
import QueryCommand, { QueryCommandProps } from "./QueryCommand";
import { QueryType } from "shared/whiz/entities/QueryDefs";
import BaseComponent, { RefreshParams } from "../components/BaseComponent";
import { DialogProps } from "../components/DialogDefs";
import WebEntityUtil from "./WebEntityUtil";
import ObjectUtil from "shared/whiz/util/ObjectUtil";

const NewEntityLabel = "New {0}";
const EditEntityLabel = "Edit {0}";
const DeleteSelectedLabel = "Delete Selected";
const NoSelectedEntitiesMessage = "Please select one or more {0} in the grid.";

export interface EntityCommandsProviderProps {
    /* entityType is optional because it could be set by subclasses */ 
    entityType?: string|EntityType,
    isDynamic?: boolean,
    component?: BaseComponent,
    monitorElem?: HTMLElement,
    getSelectedEntityIds?: () => any[],
    refresh?: (refreshParams?:RefreshParams) => any,
    renderDialog?: (props: DialogProps) => void
}

export default class EntityCommandsProvider {
    protected props: EntityCommandsProviderProps;
    protected entityType: EntityType;
    private _entitiesCommandSpecs: CommandSpec[];
    private _batchCommandSpecs: CommandSpec[];
    private _entityCommandSpecs: CommandSpec[];
    private _monitorElem;
    
    constructor(props: EntityCommandsProviderProps) {
        this.props = {...props};
        this.initProps(props);
        this.entityType = EntityType.getEntityType(props.entityType);
        if (!this.entityType) {
            throw new Error(`props.entityType ${props.entityType} is invalid`);
        }
        this._monitorElem = props.monitorElem || props.component;
    }
    protected initProps(props: EntityCommandsProviderProps) {
    }
    isDynamic() {
        return this.props.isDynamic;
    }
    getCommandsForEntities(): CommandSpec[] {
        if (this._entitiesCommandSpecs) {
            return this._entitiesCommandSpecs;
        }
        let commandSpecs:CommandSpec[] = this.getCustomCommandsForEntities() || [];
        if (this.canCreateEntity()) {
            this._addCommand({
               label: StringUtil.substitute(NewEntityLabel, this.entityType.getLabel()),
               icon: this.entityType.icon,
               handler: this.handleCreationCommand
            }, EntityCommandId.Create, commandSpecs, true)
        }

        let batchCommandSpecs = this.getBatchCommands();
        if (!_.isEmpty(batchCommandSpecs)) {
            commandSpecs = [...commandSpecs];
            commandSpecs.push({
                commandSpecs: batchCommandSpecs
            });
        }
        this._entitiesCommandSpecs = commandSpecs;
        return commandSpecs;
    }
    getBatchCommands(): CommandSpec[] {
        if (this._batchCommandSpecs || !this.props.getSelectedEntityIds) {
            return this._batchCommandSpecs;
        }
        let commandSpecs = [];
        if (this.canDeleteEntity(null)) {
            commandSpecs.push({
                label: DeleteSelectedLabel,
                handler: this._handleBatchDeleteCommand,
            });
        }
        this._batchCommandSpecs = commandSpecs;
        return commandSpecs;
    }
    /* entity not needed if props.isDynamic is false */
    getCommandsForEntity(entity?): CommandSpec[] {
        let isFixed = !this.isDynamic();
        let commandSpecs: CommandSpec[];
        if (isFixed && this._entityCommandSpecs) {
           commandSpecs = this._entityCommandSpecs;
        } else {
            commandSpecs = this._getCommandsForEntity(entity);
            if (isFixed) {
                this._entityCommandSpecs = commandSpecs || [];
            }
        }
        return this._initEntityCommands(commandSpecs, entity, isFixed);
    }
    canCreateEntity() {
        return !!WebEntityUtil.getCreationFormKey(this.entityType)
    }
    canEditEntity(entity) {
        return !!WebEntityUtil.getEditingFormKey(this.entityType)
    }
    canDeleteEntity(entity) {
        return this.entityType.isDeletable;
    }
    handleCreationCommand = async(commandSpec: CommandSpec) => {
        return this.handleDialogCommand({
            title: commandSpec.label,
            formKey: WebEntityUtil.getCreationFormKey(this.entityType)
        })
    }
    handleEditingCommand = async(commandSpec: CommandSpec) => {
        let entityId = commandSpec.entity[this.entityType.idField];
         if (!entityId) {
            throw new Error("Expected entityId");
         }
        return this.handleDialogCommand({
            title: StringUtil.substitute(EditEntityLabel, this.entityType.getLabel()),
            formKey: WebEntityUtil.getEditingFormKey(this.entityType),
            formProps: {
                entityId: entityId
            }
        })
    }
    async handleDeletionCommand(entityIds: any[], commandSpec: CommandSpec, commandProps?: Partial<QueryCommandProps>) {
        let command = new QueryCommand<QueryType.Delete>(ObjectUtil.extendDeep({}, commandProps, {
            queryType: QueryType.Delete,
            querySpec: {
                entityTypeId: this.entityType.id,
                criteria: {[this.entityType.idField]: entityIds}
            },
            monitorElem: this._monitorElem
        }));
        await command.execute();
        this.refreshComponent();
    }
    protected getCustomCommandsForEntities(): CommandSpec[] {
        return null;
    }
    protected getCustomCommandsForEntity(entity): CommandSpec[] {
        return null;
    }
    protected handleDialogCommand  = async (props: DialogProps) => {
        let response = await this.props.renderDialog(props);
        this.refreshComponent({commandResponse: response});
    }
    protected getMonitorElem() {
        return this._monitorElem;
    }
    protected refreshComponent(params?:RefreshParams) {
        let props = this.props;
        if (props.refresh) {
            return props.refresh(params);
        }
        if (props.component) {
            props.component.refresh(params);
        }
    }
    private _getCommandsForEntity(entity): CommandSpec[] {
        let commandSpecs:CommandSpec[] = [];
        if (this.canEditEntity(entity)) {
            this._addCommand({
                label: "Edit",
                icon: "pen",
                handler: this.handleEditingCommand
           }, EntityCommandId.Edit, commandSpecs)
        }
        let customCommands = this.getCustomCommandsForEntity(entity);
        if (!_.isEmpty(customCommands)) {
            if (commandSpecs.length) {
                commandSpecs.push({
                    appearance: CommandAppearance.Divider
                });
            }
            commandSpecs = commandSpecs.concat(customCommands);
        }
        if (this.canDeleteEntity(entity)) {
            if (commandSpecs.length) {
                commandSpecs.push({appearance: CommandAppearance.Divider});
            }
            this._addCommand({
                label: "Delete",
                icon: "trash-can",
                handler: this._handleDeletionCommand
           }, EntityCommandId.Delete, commandSpecs)
        }
        return commandSpecs;
    }
    private _handleBatchDeleteCommand = (commandSpec: CommandSpec) => {
        let entityIds = this.props.getSelectedEntityIds();
        if (_.isEmpty(entityIds)) {
            AppUtil.showWarning(StringUtil.substitute(NoSelectedEntitiesMessage, 
                this.entityType.getLabel(LabelSelector.SingularLower)));
            return;
        }
        return this.handleDeletionCommand(entityIds, commandSpec, {
            entitiesCount: entityIds.length
        });
    }
     _handleDeletionCommand = (commandSpec: CommandSpec) => {
        let entity = commandSpec.entity;
        return this.handleDeletionCommand([entity[this.entityType.idField]], commandSpec, {
            entityName: entity[this.entityType.nameField]
        })
    }
    private _initEntityCommands(commandSpecs: CommandSpec[], entity, isFixed): CommandSpec[] {
        if (!commandSpecs) {
            return;
        }
        if (isFixed) {
           commandSpecs = [...commandSpecs];
        }
        for (let i = 0; i < commandSpecs.length; ++i) {
            let commandSpec = commandSpecs[i];
            if (isFixed) {
                commandSpec = commandSpecs[i] = {...commandSpec};
             }
             if (_.isArray(commandSpec.commandSpecs)) { 
                commandSpec.commandSpecs = this._initEntityCommands(commandSpec.commandSpecs, entity, isFixed);
             } else {
                commandSpec.entity = entity;
             }
        }
        return commandSpecs;
    }
    private _addCommand(commandSpec: CommandSpec, commandId: EntityCommandId, commandSpecs:CommandSpec[], unshift=false) {
        let existingCommandSpec = this._getCommandSpecById(commandSpecs, commandId)
        if (existingCommandSpec) {
           _.defaults(existingCommandSpec, commandSpec);
        } else if (unshift) {
           commandSpecs.unshift(commandSpec);
        } else {
           commandSpecs.push(commandSpec);
        }
     }
     private _getCommandSpecById(commandSpecs: CommandSpec[], commandId: EntityCommandId) {
        for (let commandSpec of commandSpecs) {
           if (commandSpec.commandSpecs) {
              let nestedCommandSpec = this._getCommandSpecById(commandSpec.commandSpecs, commandId);
              if (nestedCommandSpec) {
                 return nestedCommandSpec;
              }
           } else if (commandSpec.entityCommandId === commandId) {
              return commandSpec;
           }
        }
     }
}