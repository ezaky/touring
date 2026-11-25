/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */

import {Extension, ControllerMethod, ModuleSpec}  from "shared/whiz/plugins/PluginDefs";

export const ControllersPointId = "whiz.server.controllers";
export interface ControllerExtension extends Extension {
    pointId: "whiz.server.controllers",
    module: ModuleSpec | {func},
    url: string,
    method: ControllerMethod | ControllerMethod[],
    isPublic?: boolean,
    // populated for the controller extensions auto created for entity types 
    entityTypeId?: string,
    dbConnection?: true | {readonly: boolean},
    instanceProps?: {[key: string]: any},
    needsRawBody?: true
}
export interface ControllerProps {
    extension: ControllerExtension
}
export const DbPointId = "whiz.server.databases";
export interface DbOptions {
    uri?: string,

    database?: string,
    host?: string,
    port?: number,
    socketPath?: string,
    user?: string,
    password?: string,
    
    poolSize?: number
}
export interface DbExtension extends Extension {
    pointId: "whiz.server.databases",
    module: ModuleSpec,
    label: string,
    /**
     * The default db is used for entity types that do not specify dbId
     */
    isDefault?: boolean,
    /**
     * The db used to retrieve the tables/columns metadata for entity types that do not specify dbId
     */
    isDefaultMetadataDb?: boolean;
    dbOptions: DbOptions
}
export const LoginProvidersPointId = "whiz.server.loginProviders";
export interface LoginProviderExtension extends Extension {
    pointId: "whiz.server.loginProviders",
    module: ModuleSpec
}
export interface SoftDeleteOptions {
    /**
     * The field name indicating whether an entity is deleted
     */
    fieldName: string,
    /**
     * The field value indicating an entity is deleted
     */
    deletedFieldValue: string|number|boolean
}
export interface SqlDbExtension extends DbExtension {
    softDelete?: SoftDeleteOptions
}
export const EntitiesDataHandlerPointId = "whiz.server.entitiesDataHandlers";
export interface EntitiesDataHandlerExtension extends Extension {
    module: ModuleSpec,
    entityTypeIds: string[] | "*"
}

export const ServerInitializersPointId = "whiz.server.initializers";

export * from "shared/whiz/plugins/PluginDefs";