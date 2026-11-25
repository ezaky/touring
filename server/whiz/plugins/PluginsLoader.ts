/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */

import { WhizPlugin, ExtensionPoint, Extension, PluginTarget, PluginConst, EntityTypeExtension } 
   from "shared/whiz/plugins/PluginDefs";
import ServerUtil from "../server/ServerUtil";

import fs from "fs/promises";
import * as _ from 'lodash-es';

// plugin files are .ts during dev and js in production build
const PluginFileNames = ["Plugin.ts", "Plugin.js"];
const IgnoreDirs = ["dist", "build", ".git", "node_modules", "lib"];

class PluginsLoader {
    private pluginsByTarget: {[key: string]: WhizPlugin[]} = {};

    async loadPlugins(target:PluginTarget = PluginConst.serverPluginTarget): Promise<WhizPlugin[]> {
         let plugins:WhizPlugin[] = this.pluginsByTarget[target];
         if (plugins) {
            return plugins;
         }
         // see the comment in configInitialized in PluginsLoader.js
         plugins = [];
         await this._loadPlugins(plugins);

         let extensionsById = this._validateExtensionIds(plugins);
         this._applyInheritance(extensionsById);
         let pointsById = this._getPointsById(plugins);
         let serverPlugins = this.pluginsByTarget[PluginConst.serverPluginTarget] = [];
         let uiPlugins = this.pluginsByTarget[PluginConst.webPluginTarget] = [];
         for (let plugin of plugins) {
            let serverPlugin = this._filterPluginExtensions(plugin, PluginConst.serverPluginTarget, pointsById);
            serverPlugin && serverPlugins.push(serverPlugin);

            let uiPlugin = this._filterPluginExtensions(plugin, PluginConst.webPluginTarget, pointsById);
            uiPlugin && uiPlugins.push(uiPlugin);
         }
         return this.pluginsByTarget[target];
      }

      private async _loadPlugins(plugins: WhizPlugin[]) {
         return this._loadPathPlugins(ServerUtil.getRootPath(), plugins);
      }
      private async _loadPathPlugins(pluginsPath: string, plugins: WhizPlugin[]) {
         var files = await fs.readdir(pluginsPath);
         for (let file of files) {
            let fullPath = pluginsPath + "/" + file;
            let stat = await fs.stat(fullPath);
            if (stat.isDirectory()) {
               let loadDir = true;
               for (let ignoreDir of IgnoreDirs) {
                  if (fullPath.endsWith(`/${ignoreDir}`)) {
                     // logger.debug(`--- ignore(${fullPath})`);
                     loadDir = false;
                     break;
                  }
               }
               if (loadDir) {
                  await this._loadPathPlugins(fullPath, plugins);
               }
               continue;
            }
            if (!stat.isFile() || !PluginFileNames.includes(file) ) {
               continue;
            }
            let plugin:WhizPlugin = await this._loadPlugin(fullPath);
            // logger.debug(`*** loaded ${fullPath}`);
            if (plugin && this._filterObject(plugin)) {
               plugins.push(plugin);
            }
         }
      }
      private async _loadPlugin(fullPath: string): Promise<WhizPlugin> {
        let module = require(fullPath);

        let defaultExport = module.default;
        // the node module is not needed anymore
        delete require.cache[fullPath];
        if (!module) {
            throw new Error(`require(${fullPath}) returned null.`);
        }
        if (!defaultExport) {
            throw new Error(`require(${fullPath}).default returned null. Make sure there is a default export.`);
        }
        return <WhizPlugin>defaultExport;
      }
      private _getPointsById(plugins: WhizPlugin[]): {[key: string]: ExtensionPoint} {
         let pointsById = {};
         for (let plugin of plugins) {
            for (let point of plugin.extensionPoints || []) {
               if (pointsById[point.id]) {
                  throw new Error("Duplicate extension point: " + point.id);
               }
               pointsById[point.id] = point;
            }
         }
         return pointsById;
      }
      private _validateExtensionIds(plugins: WhizPlugin[]): {[key: string]: Extension} {
         let extensionsById = {};
         for (let plugin of plugins) {
            for (let extension of plugin.extensions || []) {
               let id = extension.id;
               if (!id) {
                  throw new Error(`Missing extension id in the plugin: ${plugin.id}`);
               }
               if (extensionsById[id]) {
                  throw new Error(`Duplicate extension id: ${id}`);
               }
               extensionsById[id] = extension;
            }
         }
         return extensionsById;
      }   
      private _filterPluginExtensions(plugin: WhizPlugin, target: PluginTarget, pointsById: {[key: string]: ExtensionPoint}) {
         if (!plugin.extensions) {
            return null;
         }
         let extensions = this._filterExtensions(plugin.extensions, target, pointsById);
         if (!extensions.length) {
            return null;
         }
         let resultPlugin = _.clone(plugin);
         delete resultPlugin.extensionPoints; // no need to keep around
         resultPlugin.extensions = extensions;
         return resultPlugin;
      }
      private _filterExtensions(extensions: Extension[], target: PluginTarget, 
         pointsById: {[key: string]: ExtensionPoint}): Extension[] {
         return extensions.filter(extension => {
            if (!this._filterObject(extension)) {
               return false;
            }
            let point = pointsById[extension.pointId];
            if (!point) {
               throw new Error(`Invalid extension point: ${extension.pointId}`);
            }
            let pointTarget = point.target;
            if (!pointTarget) {
               throw new Error(`Missing extension point target: ${extension.pointId}`);
            }
            let match;
            if (_.isArray(pointTarget)) {
               match = pointTarget.indexOf(target) >= 0;
            } else {
               match =  pointTarget === target;
            }
            return match;
         })
      }
      private _applyInheritance(extensionsById: {[key:string]:Extension}) {
         let resolvedExtensionIds = {};
         for (let extensionId in extensionsById) {
            this._inheritExtensions(extensionsById[extensionId], extensionsById, resolvedExtensionIds)
         }
      }
      private _inheritExtensions(extension:Extension, extensionsById:{[key:string]:Extension}, resolvedExtensionIds) {
         let parentExtensionId = extension.inherit;
         if (!parentExtensionId || resolvedExtensionIds[extension.id]) {
            return;
         }
         resolvedExtensionIds[extension.id] = true;
         let parentExtension = extensionsById[parentExtensionId];
         if (!parentExtension) {
            throw new Error(`Invalid inherit: ${parentExtensionId}`);
         }
         this._inheritExtensions(parentExtension, extensionsById, resolvedExtensionIds);
         _.defaultsDeep(extension, parentExtension);

         let entityTypeExtension = <EntityTypeExtension>extension;
         let fieldsOverride = entityTypeExtension.fieldsOverride;
         if (fieldsOverride) {
            entityTypeExtension.fields = this._overrideArray((<EntityTypeExtension>parentExtension).fields, fieldsOverride);
            delete entityTypeExtension.fieldsOverride;
         }
         let relationFieldsOverride = entityTypeExtension.relationFieldsOverride;
         if (relationFieldsOverride) {
            entityTypeExtension.relationFields = this._overrideArray((<EntityTypeExtension>parentExtension).relationFields, relationFieldsOverride);
            delete entityTypeExtension.relationFieldsOverride;
         }
      }
      private _overrideArray(targetArray, srcObjectsByName) {
         let targetObjectsByName = _.keyBy(targetArray, "name");
         _.defaultsDeep(srcObjectsByName, targetObjectsByName);
         return _.values(srcObjectsByName);
      }
      // object is a plugin or extension
      private _filterObject(object) {
         return object.enabled !== false;
      }
  }

  export default new PluginsLoader();