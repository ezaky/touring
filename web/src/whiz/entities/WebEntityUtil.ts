import { EntityType, LabelSelector } from "shared/whiz/entities/EntityType";
import Router from "../app/Router";
import StringUtil from "shared/whiz/util/StringUtil";
import { PageNavSpec } from "../plugins/WebPluginDefs";
import ArrayUtil from "shared/whiz/util/ArrayUtil";
import * as _ from "lodash-es";
import { EntityField } from "shared/whiz/entities/EntityField";

const EntityCommandConfirm = "Are you sure you want to {0} this {1}?";
const EntityCommandConfirmWithName = "Are you sure you want to {0} \"{2}\"?";
const EntitiesCommandConfirm = "Are you sure you want to {0} the {3} selected {1}?";
const EntityCommandSuccess = "The {1} has been {0} successfully.";
const EntityCommandSuccessWithName = "The {1} \"{2}\" has been {0} successfully.";
const EntitiesCommandSuccess = "The {1} have been {0} successfully.";

export default class WebEntityUtil {
   static showEntitiesPage(entityType, navSpec: Omit<PageNavSpec, "pageId">=null) {
      entityType = EntityType.getEntityType(entityType);
      var entitiesPageId = entityType.entitiesPageId;
      if (entitiesPageId) {
         Router.navigate({
            pageId: entitiesPageId,
            ...navSpec
         })
      }
   }
   static getCreationFormKey(entityType: EntityType|string): string {
      entityType = EntityType.getEntityType(entityType);
      let formKey = entityType.creationFormKey;
      if (formKey === undefined) {
         formKey = entityType.editingFormKey;
      }
      return formKey;
   }
   static getEditingFormKey(entityType: EntityType|string): string {
      return EntityType.getEntityType(entityType).editingFormKey;
   }
   static getCommandMessages(entityType: EntityType|string, 
         {verb, pastParticiple, entitiesCount = 1, entityName = null, extraConfirmationMessage = null})
      : {confirmationMessage: string, successMessage: string} {

      entityType = EntityType.getEntityType(entityType);
      let entityTypeLabel, confirmationTemplate, successTemplate;
      if (entitiesCount === 1) {
         entityTypeLabel = entityType.getLabel(LabelSelector.SingularLower);
         confirmationTemplate = entityName ? EntityCommandConfirmWithName : EntityCommandConfirm;
         successTemplate = entityName ? EntityCommandSuccessWithName : EntityCommandSuccess;
      } else {
         entityTypeLabel = entityType.getLabel(LabelSelector.PluralLower);
         confirmationTemplate = EntitiesCommandConfirm;
         successTemplate = EntitiesCommandSuccess;
      }
      let confirmationMessage = StringUtil.substitute(confirmationTemplate, verb, entityTypeLabel, entityName, entitiesCount);
      if (extraConfirmationMessage) {
         confirmationMessage += "\n" + extraConfirmationMessage;
      }
      return {
         confirmationMessage: confirmationMessage,
         // count is not shown in the successMessage because it could be passed as any number > 1,
         // e.g. for criteria based commands
         successMessage: StringUtil.substitute(successTemplate, pastParticiple, entityTypeLabel, entityName)
      }
   }
    static getRootFieldNames(fields: (EntityField | string)[]): string[] {
        // convert nested json fields to the top level field name
        let addedJsonFields = new Set();
        return ArrayUtil.mapAndFilter(fields, fieldOrFieldName => {
            let name: string = _.isString(fieldOrFieldName) ? <string>fieldOrFieldName : (<EntityField>fieldOrFieldName).name;
            if (name.indexOf(".") > 0) {
                let jsonFieldName = name.split(".")[0];
                if (addedJsonFields.has(jsonFieldName)) {
                    return null;
                }
                addedJsonFields.add(jsonFieldName);
                name = jsonFieldName;
            }
            return name;
        });
    }
    static filterEntityTypeFields(entityType: EntityType, fields: (EntityField | string)[]): (EntityField | string)[] {
      return fields.filter((fieldOrFieldName: EntityField | string) => {
            let name: string = _.isString(fieldOrFieldName) ? <string>fieldOrFieldName : (<EntityField>fieldOrFieldName).name;
            return !!entityType.getField(name, false)
      });
    }
}