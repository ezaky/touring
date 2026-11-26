import BaseComponent from "../whiz/components/BaseComponent";
import { html, render as renderLit } from "lit-html";
import "../whiz/components/Dialog";
import '@web.awesome.me/webawesome-pro/dist/components/divider/divider.js';
import '@web.awesome.me/webawesome-pro/dist/components/icon/icon.js';
import { DialogButtonCancel, DialogButtonOk, DialogProps, DialogSubmitSpec } from "../whiz/components/DialogDefs";
import HttpCommand from "../whiz/commands/HttpCommand";
import * as _ from "lodash-es";
import { EntityField, SemanticType } from "shared/whiz/entities/EntityField";
import AppUtil from "../whiz/app/AppUtil";
import { msg, str } from '@lit/localize';
import AppStateManager from "../whiz/app/AppStateManager";

const UserExistsError = msg("There is already a performer with this email. Use the login link if you already have an account.");
const NewAccountSuccess = msg("Your account has been created successfully. Welcome to Pepits Touring!");

const MinPasswordLength = 8;
const PasswordLengthError = msg(str`Must be at least ${MinPasswordLength} characters`);
const PasswordRepeatError = msg("Password and Confirm Password should be the same");
const CreationMessageKey = "touring.initial_message";

export default class NewPerformerPage extends BaseComponent {
    render() {
        this.classList.add("gem-page");
        let fields: EntityField[] = [
            {
                name: "name",
                label: msg("Name"),
                isRequired: true
            },
            {
                name: "email",
                label: msg("Email"),
                isRequired: true
            },
            {
                name: "password",
                label: msg("Password"),
                semanticType: SemanticType.Password,
                formField: {
                    attributes: {
                        hint: msg(str`At least ${MinPasswordLength} charactrers`), // ezez test
                        autocomplete: "new-password"
                    }
                },
                isRequired: true
            },
            {
                name: "confirm-password",
                label: msg("Confirm Password"),
                semanticType: SemanticType.Password,
                formField: {
                    attributes: {
                        autocomplete: "new-password"
                    }
                },
                isRequired: true
            }
        ];
        const title = msg("Performer Sign Up");
        const subTitle = msg("Free to use. Full access to all features.");
        const submitLabel = msg("Create Account");
        let dialogProps:DialogProps = {
            formProps: {fields},
            buttons: [
                {id: DialogButtonOk, label: submitLabel},
                {id: DialogButtonCancel, label: null} // no cancel
            ],
            dialogHandler: {
                onSubmit: this._handleSubmit
            }
        }
        renderLit(html`
            <main class="gem-section">
                <header class="page-header">
                    <h1 class="page-title">${title}</h1>
                    <p class="page-subtitle">${subTitle}</p>
                </header>
                <whiz-dialog .props=${dialogProps}></whiz-dialog>
                <p class="gem-muted-text" style="text-align: center; padding-top: var(--wa-space-l)">
                    ${msg("Already have an account?")} <a href="#" @click=${this._onLoginClick}>${msg("Log in")}</a>
                </p>
            </main>

        `, this);
    }
    private _handleSubmit = async (spec: DialogSubmitSpec) => {   
        if (!this._validateCreationFields(spec)) {
            return;
        }
        const formValues = spec.values;
        let command = new HttpCommand({
            url: "/touring/performers/new",
            method: HttpCommand.Post,
            params: {
                name: formValues.name,
                email: formValues.email,
                password: formValues.password
            },
            monitorElem: spec.monitorElem
        });
        const response = await command.execute();
        const errors = response.errors;
        if (!_.isEmpty(errors)) {
            this._handleCreationErrors(errors, spec.form);
            return;
        }
        AppStateManager.setValue(CreationMessageKey, NewAccountSuccess);
        // NewPerformerController did a login
        AppUtil.navigateToApp();
    }
    private _handleCreationErrors(errors, form) {
        // populate the errors in reverse order because the last is reported first.
        if (errors.userExists) {
            form.setFieldError("email", UserExistsError);
        }
    }
    private _validateCreationFields(spec: DialogSubmitSpec) {   
        const formValues = spec.values;
        const password = formValues["password"];
        if (password.length < MinPasswordLength) {
           spec.form.setFieldError("password", PasswordLengthError);
           return false;
        }
        if (password !== formValues["confirm-password"]) {
            spec.form.setFieldError("confirm-password", PasswordRepeatError);
            return false;
        }
        return true;
    }
    private _onLoginClick = () => {
        AppUtil.navigateToApp();
    }
}
customElements.define("new-performer-page", NewPerformerPage);