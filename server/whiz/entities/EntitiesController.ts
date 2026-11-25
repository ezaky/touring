/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */

import { EntityType } from "shared/whiz/entities/EntityType";
import { ControllerContext } from "../controllers/ControllerDefs";
import { Request as ExpressRequest } from "express";
import { CreateQueryResult, DeleteQueryResult, FindQueryResult, FindQuerySpec, UpdateQueryResult } from "shared/whiz/entities/QueryDefs";
import { ControllerProps } from "../plugins/ServerPluginDefs";

export default class EntitiesController {
   private entityType;

   constructor(props: ControllerProps) {
      this.entityType = EntityType.getEntityType(props.extension.entityTypeId);
   }
   getEntityType() {
      return this.entityType;
   }
   async handleGet(req: ExpressRequest, context: ControllerContext): Promise<FindQueryResult> {
      let requestParams = context.requestParams;
      this.validateParams(requestParams);
      return context.db.find(requestParams.querySpec, context);
   }
   async handlePost(req: ExpressRequest, context: ControllerContext): Promise<CreateQueryResult> {
      let requestParams = context.requestParams;
      this.validateParams(requestParams);
      return context.db.create(requestParams.querySpec, context);
   }
   async handlePut(req: ExpressRequest, context: ControllerContext): Promise<UpdateQueryResult> {
      let requestParams = context.requestParams;
      this.validateParams(requestParams);
      return context.db.update(requestParams.querySpec, context);
   }
   async handleDelete(req: ExpressRequest, context: ControllerContext): Promise<DeleteQueryResult> {
      let requestParams = context.requestParams;
      this.validateParams(requestParams);
      return context.db.delete(requestParams.querySpec, context);
   }

   private validateParams(requestParams) {
      let querySpec: FindQuerySpec = requestParams.querySpec;
      if (!querySpec) {
         throw new Error("querySpec required");
      }
   }
}
