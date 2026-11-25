import { EntityField, EnumItem, RendererParams, RendererSpec, SemanticType } from "shared/whiz/entities/EntityField";
import FieldType from "shared/whiz/entities/FieldType"
import { EntityFieldInfo, EntityType } from "shared/whiz/entities/EntityType";
import EntityUtil from "shared/whiz/entities/EntityUtil";
import ObjectUtil from "shared/whiz/util/ObjectUtil";
import * as _ from 'lodash-es';
import WebModuleLoader from "../app/WebModuleLoader";
import { html } from "lit-html";  
import EnumRenderer from "./EnumRenderer";

let rendererModuleKeysByType = {
    [FieldType.Date]: "whiz/renderers/DateRenderer",
    [FieldType.Boolean]: "whiz/renderers/BooleanRenderer"
 };

class RenderersManager {
    private renderersByKey: {[id: string]: any} = {};

    async initFieldsRendering(entityType: EntityType, 
        fieldsOrNames: (EntityField|string)[]): Promise<EntityField[]> {
        let fields: EntityField[] = fieldsOrNames.map<EntityField>(
            fieldOrName => entityType.complementField(fieldOrName));
        let fieldsMap: {[name: string]: EntityField} = {};
        let promises = [];
        for (let field of fields) {
            fieldsMap[field.name] = field;
            promises.push(this.loadFieldRenderer(field));
        }
        await Promise.all(promises);
        
        promises = fields.map(field => this.addExtraFields(field, entityType, fieldsMap));
        await Promise.all(promises);
        
        return _.values(fieldsMap);
    }
    async loadFieldRenderer(field: EntityField) {
        let rendererSpec: RendererSpec = this.getFieldRendererSpec(field);
        let moduleKey = rendererSpec.moduleKey;
        if (!moduleKey) {
            return;
        }
        let renderer = this.renderersByKey[moduleKey];
        if (!renderer) {
            renderer = await WebModuleLoader.load(moduleKey);
            this.renderersByKey[moduleKey] = renderer;
        }
        return renderer;
    }
    getFieldRendererSpec(field: EntityField) {
        let rendererSpec: RendererSpec = field.renderer;
        if (!rendererSpec) {
            if (_.isArray(field.enum)) {
                let renderer = new EnumRenderer(<EnumItem[]>field.enum);
                rendererSpec = {func: renderer.render.bind(renderer)} 
            } else {
                let moduleKey = rendererModuleKeysByType[field.type];
                if (!moduleKey && field.isArray) {
                    moduleKey = "whiz/renderers/ArrayRenderer";
                }
                if (moduleKey) {
                    rendererSpec = {moduleKey}
                } else {
                    rendererSpec = {func: this.unknownTypeRender.bind(this)} 
                }
            }
        }
        return rendererSpec;
    }
    getFieldRenderer(field: EntityField) {
        let rendererSpec: RendererSpec = this.getFieldRendererSpec(field);
        let moduleKey = rendererSpec.moduleKey;
        if (moduleKey) {
            return this.renderersByKey[moduleKey];
        }
    }
    renderFieldValue(rendererParams: RendererParams): any {
        rendererParams = {...rendererParams};
        let entityType = EntityType.getEntityType(rendererParams.entityType);
        let field: EntityField = rendererParams.field;
        if (!field) {
            if (!rendererParams.fieldName) {
                throw new Error("Expected rendererParams.fieldName");
            }
            field = rendererParams.field = entityType.getField(rendererParams.fieldName);
        }
        this.adjustRendererParams(rendererParams);
        const fieldName = rendererParams.fieldName || field.name;
        if (fieldName && !rendererParams.hasOwnProperty("value")) {
            rendererParams.value = _.get(rendererParams.entity, fieldName);
            if (!rendererParams.renderEmptyValue && ObjectUtil.isEmptyValue(rendererParams.value)) {
                return null;
            }
        }
        let rendererSpec: RendererSpec = this.getFieldRendererSpec(field);
        let func = rendererSpec.func;
        if (!func) {
            let renderer = this.renderersByKey[rendererSpec.moduleKey];
            if (!renderer) {
                throw new Error(`Expected the field renderer module to be loaded: ${rendererSpec.moduleKey}`);
            }
            func = renderer.render.bind(renderer);
        }
        let fieldInfo = entityType.getFieldInfo(fieldName, false);
        let html;
        if (fieldInfo) {
            rendererParams.parentEntity = rendererParams.entity;
            let relationsPath = EntityUtil.getRelationsPath(fieldInfo.relationFields);
            if (relationsPath) {
                rendererParams.entity = _.get(rendererParams.entity, relationsPath);
            }
            html = this.renderMultiValueField(fieldInfo, func, rendererParams);
        }
        if (!html) {
            html = func(rendererParams);
        }
        return html;
    }
    
    private adjustRendererParams(rendererParams: RendererParams): RendererParams {
        let entityType = EntityType.getEntityType(rendererParams.entityType);
        let field = rendererParams.field;
        let fieldInfo = entityType.getFieldInfo(field.name, false);
        rendererParams.entityType = fieldInfo?.entityType || entityType;
        rendererParams.field = fieldInfo?.field || field;
        let rendererSpec = field.renderer;
        if (rendererSpec?.options) {
            Object.assign(rendererParams, rendererSpec.options);
        }
        return rendererParams;
    }
    private unknownTypeRender(rendererParams: RendererParams) {
        const field = rendererParams.field;
        if (field?.semanticType === SemanticType.Password) {
            return null;
        }
        let value = rendererParams.value;
        value && (value = value.toString());
        return html`<div>${value}</div>`;
    }
    private renderMultiValueField(fieldInfo: EntityFieldInfo, rendererFunc, rendererParams: RendererParams): any {
        let isMultiRelation = !!EntityUtil.getMultiRelationForField(fieldInfo);
        if (!isMultiRelation) {
            return null;
        }
        let field = fieldInfo.field;
        let multiEntities;
        if (isMultiRelation) {
            // rendererParams.entity has been set to the relation entity by the caller, which is the multi entities in this case
            multiEntities = rendererParams.entity || [];
        } else {
            multiEntities = [rendererParams.entity];
        }
        let htmls = [];
        for (let i = 0; i < multiEntities.length; ++i) {
            let entity = multiEntities[i];
            rendererParams.entity = entity;
            let value = _.get(entity, field.name);
            if (!value) {
                value = [value]
            }
            for (let j = 0; j < value.length; ++j) {
                rendererParams.value = value[j];
                rendererParams.entity = entity;
                let html = rendererFunc(rendererParams);
                 htmls.push(html);
            }
        }
        return html`${htmls}`;
    }
    private async addExtraFields(field: EntityField, entityType: EntityType, fieldsMap: {[name: string]: EntityField}) {        
        let rendererSpec = field.renderer;
        let moduleKey;
        if (!rendererSpec || !(moduleKey = rendererSpec.moduleKey)) {
            return;
        }
        let renderer = this.renderersByKey[moduleKey];
        if (!renderer.getExtraFieldNames) {
            return;
        }
        let rendererParams: RendererParams = this.adjustRendererParams({entityType: entityType.id, field, value: null});
        let extraFieldNames = await renderer.getExtraFieldNames(rendererParams);
        if (_.isEmpty(extraFieldNames)) {
            return;
        }
        let relationsPath = EntityUtil.getRelationsPath(entityType.getFieldInfo(field.name).relationFields);
        for (let extraFieldName of extraFieldNames) {
            relationsPath && (extraFieldName = `${relationsPath}.${extraFieldName}`);
            if (!fieldsMap[extraFieldName]) {
                fieldsMap[extraFieldName] = {name: extraFieldName}
            }
        }
    }
}

export default new RenderersManager();