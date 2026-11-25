import WebModuleLoader from "../app/WebModuleLoader";
import BaseComponent from "../components/BaseComponent";
import "./EntitiesGrid";
import EntitiesGrid from "./EntitiesGrid";
import { html, render as renderLit } from 'lit-html';  
import { EntityType } from "shared/whiz/entities/EntityType";
import "../commands/CommandsViewer";
import * as _ from "lodash-es";
import { EntityCommandsProviderProps } from "./EntityCommandsProvider";
import { EntitiesGridProps } from "./EntityDefs";

export interface EntitiesPageProps {
    gridProps: EntitiesGridProps
}

export default class EntitiesPage extends BaseComponent<EntitiesPageProps> {
    private entityType: EntityType;

    initProps(props: EntitiesPageProps) {
        this.entityType = EntityType.getEntityType(props.gridProps.querySpec.entityTypeId);
    }
    async loadData() {
        let commandsProviderKey = this.entityType.commandsProviderKey;
        if (!commandsProviderKey) {
            return;
        }
        let commandsProvider = await WebModuleLoader.load(commandsProviderKey, <EntityCommandsProviderProps>{
            entityType: this.entityType,
            component: this,
            getSelectedEntityIds: this._getSelectedEntityIds,
            refresh: this._refreshGrid
        });
        return {
            commands: commandsProvider.getCommandsForEntities()
        }
    }
    render(data) {
        let commands = data?.commands;
        return renderLit(html`
            <div slot="mainheader" class="wa-split wa-align-items-center">
                <div class="main-page-title">${this.entityType.getPluralLabel()}</div>
                ${!_.isEmpty(commands) && html`<whiz-commands .props=${{commands: commands}}></whiz-commands>`}
            </div>
            <entities-grid .props=${this.props.gridProps}></entities-grid>`, this);
    }
    private _getSelectedEntityIds = (): any[] => {
        return this._getGrid().getSelectedEntityIds();
    }
    private _refreshGrid = () => {
        this._getGrid().refresh();
    }
    private _getGrid(): EntitiesGrid {
        return this.querySelector<EntitiesGrid>("entities-grid");
    }
}
customElements.define("whiz-entities-page", EntitiesPage);