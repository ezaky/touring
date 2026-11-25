/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */

import FieldType from "./FieldType";
import { EntityType } from "./EntityType";
import { Entity } from "./QueryDefs";

export interface RendererSpec {
    moduleKey?: string,
    func?: (params: RendererParams) => any,
    /**
     * options are merged into the RendererParams object passed to the render method
     */
    options?: {[key: string]: any}
}
export enum RendererHost {
    List = "List"
}
export interface RendererParams {
    value?: any,
    entity?: Entity,
    // parentEntity is meaningful if the renderer is for a relation field, where "entity" is the relation entity
    parentEntity?: Entity,
    entityType?: EntityType|string,
    fieldName?: string,
    field?: EntityField,
    rendererHost?: RendererHost,
    renderEmptyValue?: boolean,
    renderedValue?: any
}
export interface UniqueSpec {
    fieldNames: string[]
}
export interface EnumItem {
    value: string,
    label?: string,
    icon?: string,
    iconColor?: string,
    iconAnimation?: string,
    iconFamily?: string,
    disabled?: boolean
}
export interface FormFieldSpec {
    // specify moduleKey/props/attributes, or a render function
    moduleKey?: string,
    props?: {[key: string]: any},
    attributes?: {[key: string]: any},
    defaultValue?: any,
    // render could be async
    render?: (props) => any
} 
export enum SemanticType {
    Password = "Password",
    Email = "Email",
    Decimal = "Decimal"
}
export interface EntityField {
    name: string,
    label?: string,
    /**
     *  Defaults to FieldType.String
     */
    type?: FieldType,
    semanticType?: SemanticType,
    isRequired?: boolean,
    unique?: true | UniqueSpec,
    isArray?: boolean,
    sortable?: boolean, // defaults to true
    maxLen?: number,
    description?: string,
    /**
     * The corresponding column is required or has default value.
     */
    hasDbValue?: boolean,
    isDbGenerated?: boolean,
    /**
     * Set to true id there is a table column with the same name.
     */
    hasDbColumn?: boolean,
    dbType?: String,
    /**
     * If the type is FieldType.JSON then the json fields can be specified here.
     */
    jsonFields?: EntityField[],
    width?: number | "XSmall" | "Small" | "Medium" | "Large" | "XLarge",
    enum?: true | (EnumItem|string)[],
    renderer?: RendererSpec,
    formField?: FormFieldSpec
}