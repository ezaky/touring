/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */

import Database from "./Database";
import PluginsManager from "shared/whiz/plugins/PluginsManager";
import { EntityType } from "shared/whiz/entities/EntityType";
import { DbPointId, DbExtension } from "../plugins/ServerPluginDefs";
import { EntityTypeExtension } from "shared/whiz/plugins/PluginDefs";
import ModuleLoader from "shared/whiz/plugins/ModuleLoader";
import { EntityField } from "shared/whiz/entities/EntityField";
import FieldType from "shared/whiz/entities/FieldType";
import * as _ from 'lodash-es';

const DefaultNameField = "name";

class DbManager {
    private _dbsById: {[key: string]: Database} = {};
    private _defaultDbId: string;
    private _defaultMetadataDbId;

    async initialize() {
      let dbExtensions = PluginsManager.getExtensions(DbPointId) as DbExtension[];
      if (!dbExtensions.length) {
         return;
      }
      let defaultDbExtension, defaultMetadataDbExtension;
      for (let dbExtension of dbExtensions) {
         if (dbExtension.isDefault || dbExtensions.length === 1) {
            if (defaultDbExtension) {
               throw new Error(`The db extensions "${defaultDbExtension.id}" and "${dbExtension.id}" have isDefault true, there should be only 1.`);
            }
            defaultDbExtension = dbExtension;
         }
         if (dbExtension.isDefaultMetadataDb) {
            if (defaultMetadataDbExtension) {
               throw new Error(`The db extensions "${defaultMetadataDbExtension.id}" and "${defaultMetadataDbExtension.id}" have isDefaultMetadataDb true, there should be only 1.`);
            }
            defaultMetadataDbExtension = dbExtension;
         }
         let DatabaseType = await ModuleLoader.load(dbExtension.module);
         this._dbsById[dbExtension.id] = new DatabaseType(dbExtension);
      }
      if (!defaultDbExtension) {
         throw new Error("A database should have isDefault true");
      }
      !defaultMetadataDbExtension && (defaultMetadataDbExtension = defaultDbExtension);
      this._defaultDbId = defaultDbExtension.id;
      this._defaultMetadataDbId = defaultMetadataDbExtension.id;

      return this._initEntityTypes();
    }
    getDb(dbId?): Database {
      if (dbId === null) {
         return null;
      }
      !dbId && (dbId = this._defaultDbId);
      let db = this._dbsById[dbId];
      if (!db) {
         throw new Error(`Invalid dbId : ${dbId}`);
      }
      return db;
   }
   getDbForEntityType(entityType) {
      entityType = EntityType.getEntityType(entityType);
      return this.getDb(entityType.dbId);
   }

   private async _initEntityTypes() {
      // EntityType.getEntityType cannot be used before the extensions are initialized with idField etc
      let entityTypeExtensions = EntityType.getEntityTypeExtensions();
      if (!entityTypeExtensions.length) {
         return;
      }
      let extensionsByDbId: {[key: string]: EntityTypeExtension[]} = _.groupBy(entityTypeExtensions, 
         extension => extension.dbId || this._defaultMetadataDbId);
      let promises: any = [];
      for (let dbId in extensionsByDbId) {
         const db = this.getDb(dbId);
         const dbPromises = extensionsByDbId[dbId].map(extension => this._initEntityType(extension, db));
         promises = promises.concat(dbPromises);
      }
      return Promise.all(promises);
   }
   private async _initEntityType(extension: EntityTypeExtension, db: Database) {
      let tableName = extension.tableName;
      if (!tableName) {
         return;
      }
      let fields = extension.fields;
      if (_.isEmpty(fields)) {
         return;
      }
      const dbInfo = await db.invokeWithConnection({}, context => {
         return db.getDbFields(tableName, context);
      }, true);
      if (!dbInfo) {
         return;
      }
      if (dbInfo.idField && !extension.idField) {
         extension.idField = dbInfo.idField;
      }
      let dbFields = dbInfo.fields;
      // columns is empty when materialized view, but the hasDbColumn flag needs to be set
      if (_.isEmpty(dbFields)) {
         for (let field of fields) {
            if (field.hasDbColumn !== false) {
               field.hasDbColumn = true;
            }
         }
         return;
      }
      let dbFieldsByName: {[name: string]: EntityField} = _.keyBy(dbFields, "name");
      let foundIdField;
      for (let field of fields) {
         let dbField = dbFieldsByName[field.name];
         if (!dbField) {
            // if custom field
            continue;
         }
         if (!extension.nameField && field.name === DefaultNameField) {
            extension.nameField = DefaultNameField
         }
         _.defaults(field, dbField);
         field.hasDbColumn = true;
         if (field.type === FieldType.JSON) {
            // set hasDbColumn so, for example, they are sortable
            this._iterateJsonFields(field, jsonField => {
               jsonField.hasDbColumn = true;
               !jsonField.type && (jsonField.type = FieldType.String);
            });
         }
         if (!foundIdField && extension.idField) {
            foundIdField = field.name === extension.idField;
         }
      }
      // avoid the unclear error of "entityTypeId and type are required for the relation .."
      if (!foundIdField && extension.idField && !_.isEmpty(extension.relationFields)) {
         throw new Error(`The id field ${extension.idField} should be added in the ${extension.id} entity type fields`);
      }
      // logger.debug(JSON.stringify(extension));
   }
   private _iterateJsonFields(field: EntityField, iteratee: (jsonField: EntityField) => void) {
      let jsonFields = field.jsonFields;
      if (!jsonFields) {
         return;
      }
      for (let jsonField of jsonFields) {
         iteratee(jsonField);
         this._iterateJsonFields(jsonField, iteratee);
      }
   }
}

export default new DbManager();
