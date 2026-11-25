/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */

import {WhizPlugin, Extension} from "./PluginDefs"
import * as _ from 'lodash-es';

class PluginsManager {
    private _plugins: WhizPlugin[] = null!;
    private _extensionsByPointId: {[key: string]: Extension[]};

    async setPlugins(plugins: WhizPlugin[]) {
        this._initPlugins();
        for (let plugin of plugins) {
            this._addPlugin(plugin);
        }
     }
     getExtensions<T extends Extension=Extension>(pointId: string): T[] {
        let result = this._getExtensionsByPointId()[pointId];
        if (!result) {
           return [];
        }
        return result as T[];
    }
    getExtension<T extends Extension=Extension>(extensionId: string): T {
      let extensionsByPointId = this._getExtensionsByPointId();
      for (let pointId in extensionsByPointId) {
         let extension = extensionsByPointId[pointId].find(extension => extension.id === extensionId);
         if (extension) {
            return <T>extension;
         }
      }
      return null;
   }
   
   getSingleExtension<T extends Extension=Extension>(pointId: string): T {
      let extensions = this.getExtensions<T>(pointId);
      if (extensions.length > 1) {
         throw new Error(`Expected a single extension for the extension point ${pointId}`);
      }
      return extensions[0];
   }

   findExtension<T extends Extension=Extension>(pointId: string, filterer: (extension: T) => boolean): T {
      let extensionsByPointId = this._getExtensionsByPointId();
      const find = (pointExtensions): T => {
         for (let extension of pointExtensions) {
            if (filterer(<T>extension)) {
               return <T>extension;
            }
         }
      }
      if (pointId) {
         return find(extensionsByPointId[pointId]);
      }
      for (const pointId in extensionsByPointId) {
         const extension = find(extensionsByPointId[pointId]);
         if (extension) {
            return extension;
         }
      }
   }

   _initPlugins() {
        this._plugins = [];
        this._extensionsByPointId = null!;
   }
   _addPlugin(plugin: WhizPlugin) {
        this._plugins.push(plugin);

        this._extensionsByPointId = null!;
   }
   _getExtensionsByPointId(): {[key: string]: Extension[]} {
        if (this._extensionsByPointId) {
           return this._extensionsByPointId;
        }
        this._extensionsByPointId = {};
        let hasInvalid;
        for (let plugin of this._plugins) {
           for (let extension of plugin.extensions || []) {
              let pointId = extension.pointId;
              let pointExtensions: Extension[] = this._extensionsByPointId[pointId]!;
              if (!pointExtensions) {
                 pointExtensions = [];
                 this._extensionsByPointId[pointId] = pointExtensions;
              }
              pointExtensions.push(extension);
           };
        };

        for (let pointId in this._extensionsByPointId) {
           let extensions = this._extensionsByPointId[pointId];
           this._extensionsByPointId[pointId] = this._sortExtensions(extensions);
        };
        return this._extensionsByPointId;
   }
   _sortExtensions(extensions: Extension[]) {
      let sortedExtensions = [];
      let extensionsById: {[key: string]: Extension} = _.keyBy(extensions, "id");
      let sortedExtensionIdsSet: {[key: string]: boolean} = {};
      for (let extension of extensions) {
         this._addSortedExtension(extension, sortedExtensions, extensionsById, sortedExtensionIdsSet);
      }
      return sortedExtensions;
   }

   _addSortedExtension(extension: Extension, sortedExtensions: Extension[], 
      extensionsById: {[key: string]: Extension}, sortedExtensionIdsSet: {[key: string]: boolean}) {
      let extensionId = extension.id;
      if (sortedExtensionIdsSet[extensionId]) {
         return;
      }
      sortedExtensionIdsSet[extensionId] = true;

      let precedingId = extension.precedingId;
      if (precedingId === null) {
         return sortedExtensions.unshift(extension);
      }
      if (!precedingId) {
         return sortedExtensions.push(extension);
      }
      let precedingExtension = extensionsById[precedingId];
      if (!precedingExtension) {
         throw new Error(`Invalid precedingExtension: ${precedingId}`);
      }
      this._addSortedExtension(precedingExtension, sortedExtensions, extensionsById, sortedExtensionIdsSet);
      sortedExtensions.push(extension);
   }
}

export default new PluginsManager();