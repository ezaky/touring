
import { Request as ExpressRequest } from "express";
import { ControllerContext } from "../whiz/controllers/ControllerDefs";
import * as _ from "lodash-es";
import argon2 from 'argon2';
import DbManager from "../whiz/entities/DbManager";
import LoginManager from "../whiz/sessions/LoginManager";

const PerformerEntityType = "touring.performer";

export default class NewPerformerController {
    async handlePost(req: ExpressRequest, context: ControllerContext) {
        const params = context.requestParams;
        if (!params.name || !params.email || !params.password) {
            throw new Error("Invalid params");
        }
        // persist first because the separate connections used in the login process wouldn't find the user
        const response = await DbManager.getDb().invokeWithConnection(context, async context => {
           const users = (await context.db.find({
                    entityTypeId: PerformerEntityType,
                    fields: ["id"],
                    criteria: {email: params.email}
                }, context)).data;

            if (users.length) {
                return {errors: {userExists: true}};
            }
            return {performerId: await this._persistNewPerformer(params, context)};
        });
        if (response.errors) {
            return {errors: response.errors}
        }
        await LoginManager.login(req, {...context, requestParams: {
            email: params.email,
            password: params.password
        }});
        /* ezez
        if (EnvUtil.isProduction()) {
            new EmailSender().send({
                    resendOptions: {
                        subject: "Tenant Created",
                        to: [ServerAppConst.adminEmail]
                    },
                    text: `The following tenant has been created:\n\n${JSON.stringify(tenant)}`,
                    senderType: EmailSenderType.Admin,
                    isPlainText: true
                });
        }
        */
        return {performerId: response.performerId}
    }
    private async _persistNewPerformer(params, context: ControllerContext) {
        const response = await context.db.create({
            entityTypeId: PerformerEntityType,
            entity: {
                name: params.name,
                email: params.email,
                password: await argon2.hash(params.password)
            }
        }, context);
        return {entityId: response.entityId}
    }
}