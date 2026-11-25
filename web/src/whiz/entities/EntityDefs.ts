import { EntityField, RendererParams } from "shared/whiz/entities/EntityField";
import { EntityType } from "shared/whiz/entities/EntityType";
import { Entity, FindQuerySpec } from "shared/whiz/entities/QueryDefs";
import { FormFieldProps } from "../forms/FormDefs";

export interface EntityFormProps {
    entityType: EntityType|string,
    fields: (EntityField|string)[],
    // one of entityId and entity should be specified
    entityId?: any,
    entity?: Entity
}
export interface EntityDetailsProps {
    entityType: EntityType|string,
    // one of entityId and entity should be specified
    entityId?: any,
    entity?: Entity,
    fields: (EntityField|string)[]
}
export interface EntityFormBeforeSubmitResponse {
    entity?: Entity,
    successMessage?: string
}
export interface EntityDetailsListProps {
    entityType: EntityType|string,
    idField?: string,
    entities: Entity[],
    entitySummaryRenderer?: (entity: Entity, defaultSummary: string) => any,
    extraEntityRender?: (entity: Entity) => any,
    expandId?: any
}
export interface EntitiesFormFieldProps extends FormFieldProps {
    entityType: any, // id, EntityTypeExtension or EntityType
    entities?: Entity[],
    uniqueFields?: string[],
    hasSorting?: boolean,
    editingFormProps?
}
export interface EntitiesGridProps {
    querySpec: FindQuerySpec,
    // if not specified then querySpec.fields are used
    columns?: EntityField[],
    handleRefresh?: true,
    adjustEntities?: (entities: Entity[]) => Entity[]
    hasMultiRowSelect?: true,
    hasHeader?: false,
    trackHeightOptions?
}
