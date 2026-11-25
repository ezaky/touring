/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */

import express from "express";
import http from "http";
import pluginsLoader from "../plugins/PluginsLoader";
import PluginsManager from "shared/whiz/plugins/PluginsManager";
import {WhizPlugin, ControllerExtension, ControllersPointId, AppExtension, AppsPointId, ServerInitializersPointId} 
   from "../plugins/ServerPluginDefs";
import {EntityTypesPointId, EntityTypeExtension, PluginConst, InitializerExtension} from "shared/whiz/plugins/PluginDefs";
import ControllersManager from "../controllers/ControllersManager";
import ServerUtil from "./ServerUtil";
import DbManager from "../entities/DbManager";
import ArrayUtil from "shared/whiz/util/ArrayUtil";
import multer from "multer";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import * as _ from "lodash-es";
import ModuleLoader from "shared/whiz/plugins/ModuleLoader";
import SessionsManager from "../sessions/SessionsManager";
import ResponseUtil from "../controllers/ResponseUtil";
import { UnauthorizedStatus } from "shared/whiz/sessions/SessionDefs";
import EnvUtil from "../util/EnvUtil";
import logger, { httpLogger } from "./Logger";

const WebPort = process.env.PORT;
const RootPublicFolder = "public";
// default timeout is 2 minutes which is a problem for some legitimate requests.
const RequestTimeout = 10*60*1000;
const EntitiesControllerModuleSpec = () => import("../entities/EntitiesController.js");

export default class Server {
   private _app;
   private _httpServer;
   private _appExtension: AppExtension;

   constructor() {
      this._app = express();

      this._initialize();
   }
   async _initialize() {
      process.on('unhandledRejection', (reason, promise) => {
         logger.error({err: reason}, "Unhandled Rejection");
      });
      this._app.use(httpLogger);
      if (!process.env.PORT) {
         throw new Error("env variables are not defined.");
      }
      await this._initPlugins();
      // trying this separately so a problem in the db doesn't prevent GCloudRun deployment
      try {
         await DbManager.initialize();
      } catch (error) {
         logger.error({err: error}, 'Db initialization error');
      }
      try {
         this._initMiddleware();
   
         this._initControllers();
         
         await this._initInitializers();

         this._initialized();
      } catch (error) {
         logger.error({err: error}, 'Error initializing the UI server');
      }
   }
   private async _initPlugins() {
      let plugins:WhizPlugin[] = await pluginsLoader.loadPlugins();

      await PluginsManager.setPlugins(plugins);

      this._appExtension = PluginsManager.getSingleExtension(AppsPointId);
      if (!this._appExtension) {
         logger.info(`no ${AppsPointId} extensions`);
      }
   }
   private _initMiddleware() {  
      this._app.use(cookieParser());

      if (this._appExtension) {
         this._app.use(express.static(ServerUtil.normalizeWebPath(this._appExtension.publicPath)));
         this._app.use(express.static(ServerUtil.normalizePath(RootPublicFolder)));
         this._initInitialPage();
      }
      let compression = require("compression");
      this._app.use(compression());

      let bodyParser = require("body-parser");
      // for parsing application/json
      this._app.use(bodyParser.json({
         verify: this._saveRawBody
         // limit: MaxRequestBodySize
      }));
      // for parsing application/x-www-form-urlencoded
      this._app.use(bodyParser.urlencoded({
         extended: true,
         // limit: MaxRequestBodySize
      }));

      this._initFileUploads();

      // should be done before the first addController, which will implicitly cause app.use(app.router) to be called
      // with the first app.get/post etc
      this._app.use(this._checkLogin);

      ControllersManager.initialize(this._app);   
   }
   private _saveRawBody = (req, res, buffer: Buffer) => {
      const extension = ControllersManager.getExtension(req.path);
      if (extension?.needsRawBody) {
         req.rawBody = buffer;
      }
   }
   private _initInitialPage() {
      const sendInitialPage = (req, res) => {
         return res.sendFile(ServerUtil.normalizeWebPath(this._appExtension.initialPagePath))
      };
      let uris = ["/"];
      if (this._appExtension.initialPageUris) {
         uris = uris.concat(this._appExtension.initialPageUris);
      }
      for (const uri of uris) {
         this._app.get(uri, sendInitialPage);
      }
   }
   private _initControllers() {
      let controllerExtensions: ControllerExtension[] = PluginsManager.getExtensions(ControllersPointId) as ControllerExtension[];
      ControllersManager.addControllers(controllerExtensions);

      let entityTypeExtensions = PluginsManager.getExtensions(EntityTypesPointId) as EntityTypeExtension[];
      controllerExtensions = ArrayUtil.mapAndFilter<EntityTypeExtension, ControllerExtension>(entityTypeExtensions, 
            entityTypeExtension => {
         let url = entityTypeExtension.controllerUrl;
         if (url) {
            return {
               module: entityTypeExtension.controller || EntitiesControllerModuleSpec,
               entityTypeId: entityTypeExtension.id,
               url: url,
               method: [PluginConst.getControllerMethod, PluginConst.putControllerMethod, PluginConst.postControllerMethod, PluginConst.deleteControllerMethod]
            } as any // because it is missing pointId, id
         }
      });
      ControllersManager.addControllers(controllerExtensions);
   }
   private async _initInitializers() {
      let extensions = PluginsManager.getExtensions<InitializerExtension>(ServerInitializersPointId);
      for (const extension of extensions) {
         let initializer = await ModuleLoader.load(extension.module);
          // if class definition and does not have a static initialize function
         if (_.isFunction(initializer) && !initializer.initialize) {
            initializer = new initializer();
         }
         await initializer.initialize();
      }
   }
   private _initialized() {
      this._listen();
   }
   _initFileUploads() {
      let storage = multer.diskStorage({
         // the default filename does not keep the extension, which is needed for files like *gz for controllers
         // to uncompress if they want to
         filename: (req, file, callback) => {
            crypto.pseudoRandomBytes(16, function (error, raw) {
               callback(null, raw.toString("hex") + "-" + file.originalname);
            })
         }
      });
      this._app.use(multer({storage: storage}).any());
   }
   private _checkLogin = async (req, res, next) => {
      // console.log(`*** _checkLogin: ${req.path}${ControllersManager.isPublicUri(req.path) ? " (public)" : ""}`);
      if (!ControllersManager.isPublicUri(req.path) && !await SessionsManager.getUserData(req, res)) {
         ResponseUtil.sendError({httpStatus: UnauthorizedStatus}, req, res);
         return;
      }
      next();
   }
   private _listen() {
      let serverOptions = {};

      this._httpServer = http.createServer(serverOptions, this._app);

      this._httpServer.setTimeout(RequestTimeout);

      this._httpServer.listen(WebPort);
      logger.info(`Express listening on port ${WebPort}`);
      if (EnvUtil.isDev()) {
         logger.info("Running in dev mode");
      }
   }  
}