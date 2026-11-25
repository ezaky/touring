import { Entity } from "shared/whiz/entities/QueryDefs";

export enum EntityCommandId {
    Create = "Create",
    Edit = "Edit",
    Clone = "Clone",
    Delete = "Delete"
}
export enum CommandAppearance {
    Icon = "Icon",
    Button = "Button",
    Divider = "Divider",
    Custom = "Custom"
}
export interface CommandSpec {
    entityCommandId?: EntityCommandId,
    label?: string,
    icon?: string,
    appearance?: CommandAppearance,
    buttonAttrs?: {[key: string]: string},
    cssClass?: string,
    // handler can be omited if commandSpecs is present
    handler?: (commandSpec: CommandSpec) => void,
    commandSpecs?: CommandSpec[],
    // set bu EntityCommandsProvider to be passed to the handlers
    entity?: Entity,
    // render is called if appearance is Custom
    render?: (spec:CommandSpec) => any
}
export interface CommandsViewerProps {
    commands: CommandSpec[],
    appearance?: CommandAppearance
}
