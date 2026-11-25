import BaseComponent from '../whiz/components/BaseComponent';
import { AppExtension, AppsPointId, PluginConst } from 'shared/whiz/plugins/PluginDefs';
import { html, render as renderLit } from 'lit-html';  
import ExtensionHostRenderer from "../whiz/plugins/ExtensionHostRenderer";
import { PageExtension, PageNavSpec } from '../whiz/plugins/WebPluginDefs';
import WebModuleLoader from '../whiz/app/WebModuleLoader';
import '@web.awesome.me/webawesome-pro/dist/components/icon/icon.js';
import '@web.awesome.me/webawesome-pro/dist/components/page/page.js';
import '../whiz/commands/CommandsViewer';
import './MainPage.css';
import * as _ from "lodash-es";
import PluginsManager from 'shared/whiz/plugins/PluginsManager';
import { msg } from '@lit/localize';
import LocalizationManager from '../whiz/app/LocalizationManager';
import { CommandSpec } from '../whiz/commands/CommandDefs';
import Router from '../whiz/app/Router';
import AppUtil from '../whiz/app/AppUtil';
import SessionsManager from '../whiz/app/SessionsManager';
import AppStateManager from '../whiz/app/AppStateManager';

const AppName = "Pepits Touring";
const WebsiteHomePageId = "touring.website.home_page";
const CreationMessageKey = "touring.initial_message";

export default class MainPage extends BaseComponent {
    private _hostRenderer: ExtensionHostRenderer;
    private _urlPath: string;
    private _isApp: boolean;

    initProps(props: any): void {
        super.initProps(props);

        this._urlPath = window.location.pathname;

        this._isApp = this._urlPath === PluginsManager.getSingleExtension<AppExtension>(AppsPointId)?.appUrlPath;
    }

    async loadData() {
        await LocalizationManager.initializeLanguage();
    }
    render() {
        const message = AppStateManager.getValue(CreationMessageKey);
        if (message) {
            AppStateManager.removeValue(CreationMessageKey);
            AppUtil.showSuccesss(message);
        }
        let template = html`<wa-page class="main-page">
            <header slot="header"></header>
            <main class="page-content"></main>
        </wa-page>`;

        renderLit(template, this);
        this._hostRenderer = new ExtensionHostRenderer({
            pointId: PluginConst.rootPagesPointId,
            renderSelectors: this._renderPageSelectors,
            setPageNavSpec: this._setPageNavSpec,
            firstPageId: this._getFirstPageId()
        });
        this._renderHeader();
        this._hostRenderer.render();
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this._hostRenderer.hostDisconnected();
    }
    private _renderHeader = () => {
        const commands: CommandSpec[] = [
            {
                label: msg("Log in"),
                buttonAttrs: {
                    appearance: "plain",
                    variant: "neutral"
                },
                handler: this._handleLoginCommand
            },
            {
                label: msg("Sign up"),
                buttonAttrs: {
                    appearance: "accent",
                    variant: "brand"
                },
                handler: this._handleNewPerformerCommand
            }
        ];
        if (SessionsManager.isDev()) {
            if (this._isApp) {
                commands.push({
                    label: "Test",
                    buttonAttrs: {
                        appearance: "plain",
                        variant: "neutral"
                    },
                    handler: this._handleTestCommand
                });
            }
            commands.push({
                icon: "earth-americas",
                cssClass: "header-icon-btn",
                commandSpecs: LocalizationManager.getLanguageEnumItems().map(item => {
                    return {
                        label: item.label,
                        handler: this._handleLanguageCommand
                    }
                })
            });
        }
        let template = html`
            <div class="main-header">
                <div class="header-title">
                    <div class="logo-container" @click=${this._onLogoClick}>
                        <wa-icon name="gem" variant="light" class="logo-icon"></wa-icon><div class="app-name">${AppName}</div>
                    </div>
                </div>
                <div class="header-right">
                    <whiz-commands .props=${{commands: commands}}></whiz-commands>
                </div>
            </div>
        `;
        renderLit(template, <any>this.querySelector(`.main-page [slot="header"]`));

    }
    private _renderPageSelectors = (extensions: PageExtension[]) => {
    }
    private _setPageNavSpec = async (spec:PageNavSpec) => {
        const extension = PluginsManager.getExtension<PageExtension>(spec.pageId);
        let containerElem = this.querySelector<HTMLElement>(".page-content");
        let props = spec.props;
        if (extension) {
            props = _.extend(props || {}, {extension: extension});
        }
        // this._renderHeader(); // ezez clear the previeous page commands etc
        await WebModuleLoader.loadPage(spec.pageId, props, containerElem);
    }
    private _getFirstPageId() {
        if (this._isApp) {
            return null;
        }
        return WebsiteHomePageId;
    }
    private _handleLanguageCommand = (commandSpec: CommandSpec) => {
        const language = LocalizationManager.getLanguageEnumItems().find(item => item.label === commandSpec.label)?.value;
        if (language) {
            LocalizationManager.setLanguage(language);
            this.refresh();
        }
    }
    private _handleLoginCommand = () => {
        AppUtil.navigateToApp();
    }
    private _handleNewPerformerCommand = () => {
        Router.navigate({
            pageId: "touring.website.new_performer_page"
        });
    }
    private _onLogoClick() {
        window.location.href = "/";
    }
    private _handleTestCommand() {
        Router.navigate({
            pageId: "touring.rootPages.test_page"
        });
    }
}

customElements.define("main-page", MainPage);