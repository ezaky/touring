/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */

import {ControllerExtension, ControllerMethod, PluginConst, ModuleSpec} from "../plugins/ServerPluginDefs";
import {ControllerContext} from "./ControllerDefs";
import {Request as ExpressRequest, Response as ExpressResponse} from "express";
import ModuleLoader from "shared/whiz/plugins/ModuleLoader";
import RequestUtil from "./RequestUtil";
import ResponseUtil from "./ResponseUtil";
import DbManager from "../entities/DbManager";
import Database from "../entities/Database";
import * as _ from 'lodash-es';

const GetOverPostHeader = "get-over-post";
const ExtraFormDataField = "extraFormDataJson";

// PublicUrls can be requested before login
let publicUris = {
   "/favicon.png": true,
   "/favicon.ico": true,
   "/whiz/login": true,
   "/whiz/sessions/init": true,
   "/whiz/sessions/end": true
}

class ControllersManager {
   private _app;
   private _extensionsByUri: {[key: string]: ControllerExtension} = {};
   private _requestHandler;

   public initialize(app) {
      this._app = app;
      this._requestHandler = this._handleRequest.bind(this);
   }
   public addControllers(extensions: ControllerExtension[]) {
      for (let extension of extensions) {
         this.addController(extension);
      };
   }
   public addController(extension: ControllerExtension) {
      let url = extension.url;
      if (!url || _.isEmpty(extension.method)) {
         throw new Error(`The ControllerExtension ${extension.id} should have url and method`);
      }
      if (this._extensionsByUri[url]) {
         throw new Error(`Error adding controller ${extension.id || extension.entityTypeId} because ${url} already has a controller`);
      }
      if (extension.isPublic) {
         publicUris[url] = true;
      }
      this._extensionsByUri[url] = extension;
      let methods = (_.isArray(extension.method) ? [...extension.method] : [extension.method]) as ControllerMethod[];
      // add Post to support GetOverPostHeader
      if (methods.includes(PluginConst.getControllerMethod) && !methods.includes(PluginConst.postControllerMethod)) {
         methods.push(PluginConst.postControllerMethod);
      }
      for (let method of methods) {
         this._app[method.toLowerCase()](url, this._requestHandler);
      }
   }
   public isPublicUri(uri: string) {
      return publicUris[uri];
   }
   public getExtension(uri: string): ControllerExtension {
      return this._extensionsByUri[uri];
   }
   private async _handleRequest(req: ExpressRequest, res: ExpressResponse) {
      let url = req.route.path;
      let method:ControllerMethod = RequestUtil.getMethod(req);
      let requestParams = method === PluginConst.getControllerMethod ? req.query : req.body;
      if (method === PluginConst.postControllerMethod && req.headers[GetOverPostHeader]) {
         method = PluginConst.getControllerMethod;
      }
      // if uploaded files with extra data
      var extraFormDataJson = requestParams[ExtraFormDataField];
      if (extraFormDataJson) {
         delete requestParams.extraFormDataJson;
         requestParams = {...requestParams};
         _.extend(requestParams, JSON.parse(extraFormDataJson));
      }
      let result, error;
      let extension: ControllerExtension = this._extensionsByUri[url];
      if (extension) {
         let methods = (_.isArray(extension.method) ? extension.method : [extension.method]) as ControllerMethod[];
         if (!methods.includes(method)) {
            error = new Error(`Invalid Http method ${method} for ${url}.`);
         }
      } else {
         error = new Error(`Invalid controller url: ${url}.`);
      }
      let context:ControllerContext = {req, res, requestParams};
      if (!error) {
         try {
            result = await this._callControllerForExtension(extension, req, res, context, {method: method});
         } catch(asyncError) {
            error = asyncError;
         }
      }
      ResponseUtil.send(error, result, req, res, context);
   }
   private async _callControllerForExtension(extension: ControllerExtension, req: ExpressRequest, res: ExpressResponse, context:ControllerContext, 
         options) {
      let method = options.method || PluginConst.getControllerMethod;
      let controller;
      if ((<any>extension.module).func) {
         controller = (<any>extension.module).func;
      } else {
         let Controller = await ModuleLoader.load(<ModuleSpec>extension.module);
         // entity controllers contain the extension in entityType
         controller = new Controller({extension: extension});
      }
      let db: Database;
      let connection: any;
      let readonly = method === PluginConst.getControllerMethod;
      if (extension.entityTypeId) {
         db = DbManager.getDbForEntityType(extension.entityTypeId);
      } else if (extension.dbConnection) {
         db = DbManager.getDb();
         if ((<any>extension.dbConnection).readonly === false) {
            readonly = false;
         }
      }
      if (db) {
         connection = context.connection = await db.getConnection(readonly, context);
      }
      context.db = db;
      let result;
      try {
         result = await this._callController(controller, method, req, context);
         if (connection) {
            await db.releaseConnection(connection, readonly, false);
            context.connection = null;
         }
      } catch (error) {
         if (connection) {
            await db.releaseConnection(connection, readonly, true);
            context.connection = null;
         }
         throw(error);
      }
      return result;
   }
   private _callController(controller, method, req: ExpressRequest, context: ControllerContext) {
      var fn;
      switch (method) {
         case PluginConst.getControllerMethod: {
            fn = controller.handleGet;
            break;
         }
         case PluginConst.postControllerMethod: {
            fn = controller.handlePost;
            break;
         }
         case PluginConst.putControllerMethod: {
            fn = controller.handlePut;
            break;
         }
         case PluginConst.deleteControllerMethod: {
            fn = controller.handleDelete;
            break;
         }
      };
      if (!fn) {
         if (_.isFunction(controller)) { // see _callControllerForExtension
            fn = controller;
         } else {
            throw new Error(`Invalid method: ${method} for ${req.route.path}`);
         }
      }
      return fn.call(controller, req, context);
   }
}

export default new ControllersManager();