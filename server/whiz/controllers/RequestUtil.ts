/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */

import {ControllerMethod, PluginConst} from "shared/whiz/plugins/PluginDefs";

import {Request as ExpressRequest} from "express";

export default class RequestUtil {
   static getMethod(req: ExpressRequest): ControllerMethod {
      let methods = req.route.methods;
      for (let method of [PluginConst.getControllerMethod, PluginConst.postControllerMethod, PluginConst.putControllerMethod, PluginConst.deleteControllerMethod]) {
         if (methods[method.toLowerCase()] === true) {
            return method as ControllerMethod;
         }
      }
      throw new Error("Could not find the request method.");
   }
}
