import { Request as ExpressRequest } from "express";
import { ControllerContext } from "../whiz/controllers/ControllerDefs";
import { LoginUserData } from "../whiz/sessions/ServerSessionDefs";
import argon2 from 'argon2';
import DbManager from "../whiz/entities/DbManager";
import { Entity } from "shared/whiz/entities/QueryDefs";
import * as _ from "lodash-es";
import UserRole from "shared/whiz/tenants/UserRole";

const PerformerEntityType = "touring.performer";

class LoginProvider {
   async handleLocalLogin(req: ExpressRequest, context: ControllerContext): Promise<LoginUserData> {
      const params = context.requestParams;
      if (!params.email || !params.password) {
         throw new Error(`email and password required`);
      }
      const performer: Entity = await DbManager.getDb().invokeWithConnection({}, async (context) => {
         return (await context.db.findOne({
            entityTypeId: PerformerEntityType,
            fields: ["id", "name", "password"],
            criteria: {email: params.email}
         }, context)).data;
      }, true);
      if (!performer || !await argon2.verify(performer.password, params.password)) {
         return;
      }
      return {
         userEmail: params.email,
         tenantId: null,
         role: UserRole.User
      };
   }
}
export default new LoginProvider();