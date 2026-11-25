/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */

import { EntityField } from "../entities/EntityField";
import { OrderByField } from "../entities/QueryDefs";
import { EntityRelationField } from "../entities/EntityRelationField";

export type PluginTarget = "Server" | "UI";
export type ControllerMethod = "Get" | "Post" | "Put" | "Delete";
export const PluginConst = {
    serverPluginTarget: <PluginTarget>"Server",
    webPluginTarget: <PluginTarget>"UI",
    getControllerMethod: <ControllerMethod>"Get",
    postControllerMethod: <ControllerMethod>"Post",
    putControllerMethod: <ControllerMethod>"Put",
    deleteControllerMethod: <ControllerMethod>"Delete",
    rootPagesPointId: "whiz.rootPages"
}


export type ModuleSpec = () => Promise<{ default: any }>;

export interface ExtensionPoint {
    id: string,
    target: PluginTarget | PluginTarget[]
}
export interface Extension {
    id: string,
    pointId: string,
    inherit?: string,
    enabled?:boolean,
    precedingId?: string
}

export interface WhizPlugin {
    id: string,
    extensionPoints?: ExtensionPoint[],
    extensions?: Extension[],
    enabled?:boolean
}

export const AppsPointId = "whiz.applications";
export interface AppExtension extends Extension {
    pointId: "whiz.applications",
    mainPageId: string,
    loginPageId?: string,
    loginParam?: string,
    /**
     * The path to the directory containing public files relative to the web directory
     */
    publicPath: string,
    /**
     * The path to the initial html path relative to the web directory
     */
    initialPagePath: string,
    initialPageUris?: string[],
    appUrlPath?: string
}
export const EntityTypesPointId = "whiz.entityTypes";
export interface EntityTypeExtension extends Extension {
    pointId: "whiz.entityTypes",
    /**
     * The db extension id. If null then the default db is used.
     */
    dbId?: string,
    tableName?: string,
    persistTableName?: string,
    controllerUrl?: string,
    controller?: ModuleSpec,
    dataHandler?: ModuleSpec,
    isSoftDelete?: boolean,
    /* fields could be unspecified when inheriting from another entity type */
    fields?: EntityField[],
    relationFields?: EntityRelationField[],
    fieldsOverride?: {[name:string]:Partial<EntityField>},
    relationFieldsOverride?: {[name:string]:Partial<EntityRelationField>},
    /**
     * The primary key field name. Defaults to the table's primary key column name if any.
     */
    idField?: string,
    /**
     * The display name field name. Defaults to "name" if the corresponding table has a name column.
     */
    nameField?: string,
    defaultOrderBy?: OrderByField[],
    label?: string,
    pluralLabel?: string,
    icon?: string,
    entitiesPageId?: string,
    commandsProviderKey?: string,
    creationFormKey?: string,
    editingFormKey?: string,
    isDeletable?: boolean
}
export interface PageExtension extends Extension {
    label: string,
    componentKey: string,
    icon?: string,
    hostedPointId?: string
}

export interface InitializerExtension extends Extension {
    module: ModuleSpec
} 

export const MainPagePointId = "whiz.mainPage"; 
export const UnhostedPagesPointId = "whiz.unhostedPages"; 

