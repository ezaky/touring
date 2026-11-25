
import PluginsManager from "../plugins/PluginsManager";
import {EntityTypesPointId, EntityTypeExtension} from "../plugins/PluginDefs";
import { EntityField } from "./EntityField";
import StringUtil from "../util/StringUtil";
import { EntityRelationField, EntityRelationType, JunctionRelation } from "./EntityRelationField";
import { FindQuerySpec } from "./QueryDefs";
import FieldType from "./FieldType";
import * as _ from 'lodash-es';
import EntityUtil from "./EntityUtil";

const DefaultCommandsProviderModuleKey = "whiz/entities/EntityCommandsProvider";

let _entityTypesById: {[id: string]: EntityType} = {};

export enum LabelSelector {
    SingularUpper = "SingularUpper",
    PluralUpper = "PluralUpper",
    SingularLower = "SingularLower",
    PluralLower = "PluralLower"
}

export interface EntityFieldInfo {
    field: EntityField,
    entityType: EntityType,
    relationFields?: EntityRelationField[],
    /**
     * The relation field with source id equal to this field 
     */
    idRelationField?: EntityRelationField,
    /**
     * Contains the full name if relationFields is not empty
     */
    fieldPath?: string,
    /**
     * If the field is a json field then this is the jsonFieldPath part of the full path
     */
    jsonFieldPath?: string
}

// see https://stackoverflow.com/questions/53128744/typescript-automatically-get-interface-properties-in-a-class
// for the interface/class with the same name to merge the EntityTypeExtension fields in EntityType
interface EntityType extends Partial<EntityTypeExtension> {};

class EntityType {
    private _fieldsByName: {[name: string]: EntityField};

    constructor(extension: EntityTypeExtension) {
        Object.assign(this, extension);

        this._fieldsByName = _.keyBy(this.fields, "name");
        // _initialize is called separately; see the comment on the call

        EntityType._initEntityFields(this.fields);
    }
    /**
     * @param entityType string|EntityTypeExtension|EntityType
     */
    static getEntityType(entityType: any): EntityType {
        let result:EntityType;
        if (!_.isString(entityType)) {
            if (entityType) {
                if (entityType.getField) {
                    return entityType;
                }
                result = new EntityType(entityType as EntityTypeExtension);
            }
        } else {
            let entityTypeId = entityType;
            result = _entityTypesById[entityTypeId];
            if (result) {
                return result;
            }
            let extension = PluginsManager.getExtension<EntityTypeExtension>(entityTypeId);
            if (extension) {
                result = _entityTypesById[entityTypeId] = new EntityType(extension);
            }
        }
        if (!result) {
            throw new Error(`Invalid entityTypeId ${entityType}`);
        }
        // _initialize is called after _entityTypesById is updated for cyclic relation fields to work
        result && result._initialize();
        return result;
    }
    static getEntityTypeExtensions(): EntityTypeExtension[] {
        return PluginsManager.getExtensions(EntityTypesPointId) as EntityTypeExtension[];
    }
    getLabel(selector: LabelSelector = LabelSelector.SingularUpper): string {
        return EntityType._getLabel(this, selector);
    }
    getPluralLabel(selector: LabelSelector = LabelSelector.PluralUpper): string {
        return EntityType._getLabel(this, selector);
    }
    getFieldInfo(fieldName: string, required=true): EntityFieldInfo {
        let fieldPath = fieldName.split(".");
        let fieldInfo = EntityType._getFieldInfo(this, fieldPath, [], required);
        if (fieldInfo) {
            fieldInfo.fieldPath = fieldName;
            let relationFields = fieldInfo.relationFields;
            if (relationFields && !relationFields.length) {
                // so callers can just check for null
                fieldInfo.relationFields = null;
            }
        }
        return fieldInfo;
    }
    getField(fieldName: string, required=true): EntityField {
        let fieldInfo = this.getFieldInfo(fieldName, required);
        if (fieldInfo) {
            return fieldInfo.field;
        }
    }
    getFieldLabel(fieldName, selector: LabelSelector = LabelSelector.SingularUpper): string {
        let fieldInfo = this.getFieldInfo(fieldName);
        let label = this._getRelationFieldLabel(fieldInfo.field, fieldInfo, false, selector);
        if (!label) {
            label = EntityType._getLabel(fieldInfo.field, selector); 
        }
        return label;
    }
    getRelationField(fieldName: string, required=true): EntityRelationField {
        let relationField;
        if (this.relationFields) {
            relationField = this.relationFields.find(relationField => relationField.name === fieldName);
        }
        if (!relationField && required) {
            throw new Error(`Invalid relation field name "${fieldName}" for the entity type "${this.id}"`);
        }
        return relationField;
    }
    getRelationFieldForId(fieldName) {
        if (this.relationFields) {
           return this.relationFields.find(relationField => relationField.sourceIdField === fieldName);
        }
     }
    getRelationFieldsForEntityType(entityType: any): EntityRelationField[] {
        if (!this.relationFields) {
            return;
        }
        let entityTypeId = EntityType.getEntityType(entityType).id;
        return this.relationFields.filter(relationField => relationField.entityTypeId === entityTypeId);
    }
    getPersistTableName() {
        return this.persistTableName || this.tableName;
    }
    complementFields(fields: (EntityField|string)[], querySpec?: FindQuerySpec, 
            fieldInitializer?: (field:EntityField, fieldInfo:EntityFieldInfo) => void): EntityField[] {
        return  fields.map(field => this.complementField(field, querySpec, fieldInitializer));
    }
    complementField(fieldOrName: EntityField|string, querySpec?: FindQuerySpec, 
            fieldInitializer?: (field:EntityField, fieldInfo:EntityFieldInfo) => void): EntityField {
        let result: EntityField;
        if (_.isString(fieldOrName)) {
            result = {name: <string>fieldOrName};
        } else {
            result = {...<EntityField>fieldOrName};
        }
        let fieldName = result.name;
        let fieldInfo;
        if (fieldName && (fieldInfo = this.getFieldInfo(fieldName, false))) {
            let field = fieldInfo.field;
            const specifiedLabel = result.label;
            _.defaults(result, field);
            if (specifiedLabel === undefined) {
                let relationFieldLabel = this._getRelationFieldLabel(result, fieldInfo);
                relationFieldLabel && (result.label = relationFieldLabel);
            }

        }
        fieldInitializer && fieldInitializer(result, fieldInfo);
        return result;
    }

    private _getRelationFieldLabel(field: EntityField, fieldInfo: EntityFieldInfo, isRefField: boolean = false, 
            selector: LabelSelector = LabelSelector.SingularUpper) {
        let relationField: EntityRelationField;
        if (isRefField && fieldInfo.idRelationField) {
            relationField = fieldInfo.idRelationField;
        } else if (fieldInfo.relationFields) {
            relationField = _.last(fieldInfo.relationFields);
        }
        let relationLabel;
        if (relationField) {
            relationLabel = EntityType._getLabel(relationField, selector);
            if (!relationLabel && relationField.type !== EntityRelationType.OneToOne) {
                let relationEntityType = EntityType.getEntityType(relationField.entityTypeId);
                if (EntityUtil.isMultipleRelation(relationField)) {
                    relationLabel = EntityType._getLabel(relationEntityType, 
                        selector === LabelSelector.SingularUpper || selector === LabelSelector.PluralUpper ? LabelSelector.PluralUpper : LabelSelector.PluralLower);
                } else {
                    relationLabel = EntityType._getLabel(relationEntityType, selector); 
                }
                 // set it to the id so people see the issue and add the entity type labels
                !relationLabel && (relationLabel = relationEntityType.id);
            }
        }
        if (!relationLabel) {
            return;
        }
        let fieldLabel;
        if (isRefField) {
            fieldLabel = relationLabel;
        } else {
            fieldLabel = `${relationLabel} ${EntityType._getLabel(field, selector)}`;
        }
        return fieldLabel;
    }
    private _computeJunctionRelationFieldName(junctionRelation: JunctionRelation) {
        let computeLabel = (entityType: EntityType, lower=false) => {
            let label = entityType.id;
            let dotIndex = label.lastIndexOf(".");
            if (dotIndex > 0) {
                label = label.substring(dotIndex+1);
            }
            if (!lower) {
                label = StringUtil.capitalize(label);
            }
            return label;
        }
        return `${computeLabel(this, true)}${computeLabel(EntityType.getEntityType(junctionRelation.entityTypeId))}Mapping`;
    }
    private static _getFieldInfo(entityType: EntityType|string, fieldPath: string[], relationFields: EntityRelationField[], 
            required=true): EntityFieldInfo {
        entityType = EntityType.getEntityType(entityType);
        if (fieldPath.length === 1) {
            let fieldName = fieldPath[0];
            let field: EntityField = entityType._fieldsByName[fieldName];
            if (!field) {
                if (required) {
                    throw new Error(`Invalid field "${fieldPath[0]}" for the entity type "${entityType.id}"`);
                }
                return null;
            }
            let refEntityType: EntityType = _.isEmpty(relationFields) ? entityType : EntityType.getEntityType(_.last(relationFields).entityTypeId);
            let fieldInfo: EntityFieldInfo = {
                field: field,
                entityType: entityType,
                relationFields: relationFields
            }
            if (refEntityType.idField !== fieldName) {
                fieldInfo.idRelationField = refEntityType.getRelationFieldForId(fieldName)
            }
            return fieldInfo;
        }
        let name = fieldPath[0];
        let jsonField = entityType._fieldsByName[name];
        if (jsonField && jsonField.type === FieldType.JSON) {
            return EntityType._getJsonFieldInfo(entityType, fieldPath, relationFields, required);
        }
        let relationField = entityType.getRelationField(name, required);
        if (!relationField) {
            return null;
        }
        fieldPath.shift();
        relationFields.push(relationField);
        return EntityType._getFieldInfo(relationField.entityTypeId, fieldPath, relationFields, required);    
    }
    private static _getJsonFieldInfo(entityType: EntityType, fieldPath: string[], relationFields: EntityRelationField[], 
            required=true): EntityFieldInfo {
        let jsonFieldPath = fieldPath.join(".");
        let jsonFields = entityType.fields;
        for (let i = 0; i < fieldPath.length; ++i) {
            let fieldName = fieldPath[i];
            let field = _.find(jsonFields, {name: fieldName});
            if (!field) {
                if (!required) {
                    return null;
                }
                throw new Error(`Invalid json field path ${jsonFieldPath} in ${entityType.id}`);
            }
            if (i === fieldPath.length-1) {
                return {
                    field: field,
                    entityType: entityType,
                    relationFields: relationFields,
                    jsonFieldPath: jsonFieldPath
                }
            }
            jsonFields = field.jsonFields;
        }
    }
    private _initialize() {
        if (this.commandsProviderKey === undefined) {
            this.commandsProviderKey = DefaultCommandsProviderModuleKey;
        }
        this._initRelations();
    }
    private static _initEntityFields(fields: EntityField[]) {
        EntityType._iterateEntityFields(fields, (field: EntityField) => {
            if (!field.label) {
                field.label = StringUtil.getLabelForId(field.name);
            }
            if (!field.type) {
                field.type = FieldType.String
            }
         });
    }
    private static _iterateEntityFields(fields: EntityField[], iteratee: (field: EntityField) => void) {
        for (let field of fields) {
            iteratee(field);
            if (field.jsonFields) {
                EntityType._iterateEntityFields(field.jsonFields, iteratee);
            }
        }
    }
    // object is a EntityField, EntityType,or EntityRelationField 
    private static _getLabel(object, selector: LabelSelector): string {
        let result;
        if (selector === LabelSelector.PluralUpper) {
           result = object.pluralLabel;
        } else if (selector === LabelSelector.SingularLower || selector === LabelSelector.PluralLower) {
           let lowerize = true;
           if (selector === LabelSelector.SingularLower) {
              if (object.lowerLabel) {
                 result = object.lowerLabel;
                 lowerize = false;
              } else {
                 result = object.label
              }
           } else {
              if (object.lowerPluralLabel) {
                 result = object.lowerPluralLabel;
                 lowerize = false;
              } else {
                 result = object.pluralLabel
              }
           }
           if (result && lowerize) {
              result = StringUtil.lowerize(result);
           }
        }
        if (!result) {
            let upperLabel = object.label;
            if (upperLabel && (selector === LabelSelector.SingularLower || selector === LabelSelector.PluralLower)) {
                result = StringUtil.lowerize(upperLabel);
             } else {
                result = upperLabel;
             }
        }
        return result;
     }
     private _initRelations() {
        if (!this.relationFields) {
            return;
        }
        for (let i = 0; i <  this.relationFields.length; ++i) {
            let relationField = this.relationFields[i];
            // validate relationField.entityTypeId
            if (!relationField.entityTypeId || !relationField.type) {
                throw new Error(`entityTypeId and type are required for the relation ${relationField.name} in ${this.id}`);
            }
            if (relationField.parentChild) {
                let relationType = relationField.type;
                if (relationType !== EntityRelationType.OneToMany && relationType !== EntityRelationType.OneToOne) {
                    throw new Error(`Unexpected parentChild for the relation "${relationField.name}" in the entityType "${this.id}".`);
                }
            }
            EntityType.getEntityType(relationField.entityTypeId);
            if (!relationField.sourceIdField) {
                if (!this.idField) {
                    throw new Error(`sourceIdField is null for the relation ${relationField.name} in ${this.id}, but no idField is specified`);
                }
                relationField.sourceIdField = this.idField;
             } else {
                // validate that sourceIdField is vallid
                this.getField(relationField.sourceIdField);
             }
             let targetEntityType = EntityType.getEntityType(relationField.entityTypeId);
             let junctionRelation = relationField.junctionRelation;
             if (junctionRelation) {
                // validate junctionRelation.entityTypeId, and we need it below
                let junctionEntityType = EntityType.getEntityType(junctionRelation.entityTypeId);

                if (!junctionRelation.relationFieldName) {
                    let relationFields = junctionEntityType.getRelationFieldsForEntityType(targetEntityType);
                    if (_.isEmpty(relationFields) || relationFields.length > 1) {
                        throw new Error(`The junctionRelation.relationFieldName for the relation ${relationField.name} in the entity type ${this.id} cannot be computed based the ${junctionRelation.entityTypeId} relation fields.`);
                    }
                    junctionRelation.relationFieldName = relationFields[0].name;
                }
                // validate that junctionRelation.relationFieldName is vallid
                junctionEntityType.getRelationField(junctionRelation.relationFieldName);

                if (!relationField.junctionSourceIdField) {
                    let relationFields = junctionEntityType.getRelationFieldsForEntityType(this.id);
                    if (_.isEmpty(relationFields) || relationFields.length > 1) {
                        throw new Error(`The junctionSourceIdField for the relation ${relationField.name} in the entity type ${this.id} cannot be computed based on the ${junctionRelation.entityTypeId} relation fields.`);
                    }
                    relationField.junctionSourceIdField = relationFields[0].sourceIdField;
                }
                // validate that junctionSourceIdField is vallid
                junctionEntityType.getField(relationField.junctionSourceIdField);

                if (relationField.targetIdField) {
                    // avoid the confusion of targetIdField in this case
                    throw new Error(`targetIdField should not be specified in the relation ${relationField.name} in ${this.id}.`);
                }
                
                // add a relation to the junction entity type so querying can use it in field paths for select/criteria/orderby etc
                let junctionRelationFieldName = this._computeJunctionRelationFieldName(junctionRelation);
                this.relationFields.push({
                    name: junctionRelationFieldName,
                    entityTypeId: junctionRelation.entityTypeId,
                    type: EntityRelationType.OneToMany,
                    sourceIdField: relationField.sourceIdField,
                    targetIdField: relationField.junctionSourceIdField,
                    targetCriteria: relationField.junctionCriteria,
                    autoGeneratedInfo: {
                        junctionRelationName: relationField.name,
                        junctionRelationFieldName: junctionRelation.relationFieldName
                    }
                });
                junctionRelation.relationFieldPath = `${junctionRelationFieldName}.${junctionRelation.relationFieldName}`;
             } else {                
                if (!relationField.targetIdField) {
                    throw new Error(`targetIdField is null for the relation ${relationField.name} in ${this.id}`);
                    // commented out because this is confusing/dangerous to miss (wrong queries)
                    /*
                    if (!targetEntityType.idField) {
                        throw new Error(`targetIdField is null for the relation ${relationField.name} in ${this.id}, but ${targetEntityType.id} does not have an idField`);
                    }
                    relationField.targetIdField = targetEntityType.idField;
                    */
                 } else {
                    // validate that targetIdField is vallid
                    targetEntityType.getField(relationField.targetIdField);
                 } 
             }
        }
    }
}

export { EntityType };
