import BaseComponent from "../whiz/components/BaseComponent"
import { html, render as renderLit } from 'lit-html';
import "./LoginPage.css";
import { FormProps } from "../whiz/forms/FormDefs";
import { DialogButtonCancel, DialogButtonOk, DialogProps, DialogSubmitSpec } from "../whiz/components/DialogDefs";
import "../whiz/components/Dialog";
import HttpCommand from "../whiz/commands/HttpCommand";
import '@web.awesome.me/webawesome-pro/dist/components/icon/icon.js';
import AppUtil from "../whiz/app/AppUtil";
import { SessionUserData, UnauthorizedStatus } from "shared/whiz/sessions/SessionDefs";
import { SemanticType } from "shared/whiz/entities/EntityField";
import SessionsManager from "../whiz/app/SessionsManager";

const LoginTitle = "Log in to Pepits Touring";
const SubmitButtonLabel = "Log in";
const InvalidCredentialsError = "The email or password you entered are not recognized.";

export default class LoginPage extends BaseComponent {
    render() {
        let formProps:FormProps = {
            fields: [
                {
                    name: "email",
                    label: "Email",
                    isRequired: true
                },
                {
                    name: "password",
                    label: "Password",
                    semanticType: SemanticType.Password,
                    isRequired: true
                }
            ]
        }
        let dialogProps:DialogProps = {
            formProps: formProps,
            buttons: [
                {id: DialogButtonOk, label: SubmitButtonLabel},
                {id: DialogButtonCancel, label: null} // no cancel
            ],
            dialogHandler: {
                onSubmit: this._handleSubmit
            }
        }
        // <wa-icon name="gem" variant="light" class="logo-icon"></wa-icon>
        renderLit(html`
            <wa-icon name="gem" variant="light" class="logo-icon"></wa-icon>
            <div class="login-title">${LoginTitle}</div>
            <whiz-dialog .props=${dialogProps}></whiz-dialog>            
        `, this);
    }
    promise() {
        return this.querySelector<any>("whiz-dialog").promise();
    }
    private _handleSubmit = async (spec: DialogSubmitSpec) => {
        let command = new HttpCommand({
            url: "/whiz/login",
            params: {
                email: spec.values.email,
                password: spec.values.password
            },
            monitorElem: this,
            errorHandler: this._handleError
        });
        const userData: SessionUserData = await command.execute();
        // setUserData should be set before non-public urls are invoked
        SessionsManager.setUserData(userData);
        return userData;
    }
    private _handleError = (error) => {
        if (error.httpStatus !== UnauthorizedStatus) {
            return false;
        }
        AppUtil.showError(InvalidCredentialsError);
        return true;
    }
}
customElements.define("login-page", LoginPage);