/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */

import {Request as ExpressRequest, Response as ExpressResponse} from "express";
import * as _ from 'lodash-es';
import { ControllerContext } from "./ControllerDefs";
import logger from "../server/Logger";

const DefaultHttpErrorStatus = 500;

export default class ResponseUtil {
    static send(error, result, req:ExpressRequest, res:ExpressResponse, context:ControllerContext) {
        if (error) {
           return ResponseUtil.sendError(error, req, res, context);
        }
        // if result is number (e.g. insert id from a database create call) then express will interpret it as status code
        if (_.isNumber(result)) {
           return res.json(result);
        }
        if (_.isFunction(result)) {
           return result(res);
        }
        if (result === undefined) { // not sure what undefined sends
           result = null;
        }
        // if result is string (e.g. html computed from a controller) then express will set the type to html
        res.send(result);
     }

      static sendError(error, req:ExpressRequest, res:ExpressResponse, context?:ControllerContext) {
         if (_.isString(error)) {
            error = {
               message: error
            }
         }
         // clone because the Error object message is not enumerable (i.e not received by the client
         // if we directly return the error)
         let resError = _.clone(error);
         resError.message = error.message;
         let logStr;
         // see UserError and IdError; these are handled on the client
         if (!error.isUserError && !error.httpStatus) {
            logStr = "";
            if (req) {
               logStr = "Error from " + req.path;
               logStr += "\n" + JSON.stringify(resError);
               if (req.route && !_.isEmpty(context?.requestParams)) {
                  logStr += "\nParameters: " + JSON.stringify(context.requestParams)
               }
               logStr += "\n"
            }
            if (true /* !req || sessionsManager.isBrowserRequest(req) */) {
               let errorDetails = logStr;
               if (error.stack) { // was only for debug
                  errorDetails += error.stack;
               }
               resError.details = errorDetails;
            }
            logStr += error.stack ? error.stack + "\n" : ""; // avoid having "undefined" printed out
      }
      if (logStr) {
         logger.error(logStr);
      }
      let httpStatus = error.httpStatus || DefaultHttpErrorStatus;
      res.status(httpStatus).json(resError);
   }  
}
