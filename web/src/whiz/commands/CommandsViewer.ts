import BaseComponent from "../components/BaseComponent";
import { CommandAppearance, CommandSpec, CommandsViewerProps } from "./CommandDefs";
import { html, render as renderLit } from "lit-html";
import '@web.awesome.me/webawesome-pro/dist/components/button/button.js';
import '@web.awesome.me/webawesome-pro/dist/components/icon/icon.js';
import '@web.awesome.me/webawesome-pro/dist/components/tooltip/tooltip.js';
import '@web.awesome.me/webawesome-pro/dist/components/divider/divider.js';
import '@web.awesome.me/webawesome-pro/dist/components/dropdown/dropdown.js';
import '@web.awesome.me/webawesome-pro/dist/components/dropdown-item/dropdown-item.js';
import * as _ from "lodash-es";
import RenderingUtil from "../renderers/RenderingUtil";
import "./CommandsViewer.css";

const DefaultDropdownIcon = "ellipsis";
const NestedCommandsLabel = "Actions";

export default class CommandsViewer extends BaseComponent<CommandsViewerProps> {
    render() {
        let props = this.props;
        if (_.isEmpty(props.commands)) {
            renderLit("" , this);
            return;
        }
        let components = props.commands.map((commandSpec: CommandSpec) => {
            let appearance = commandSpec.appearance || props.appearance;
            if (appearance === CommandAppearance.Divider) {
                return html`<wa-divider orientation="vertical"></wa-divider>`;
            }
            if (commandSpec.commandSpecs) {
                return this._renderDropdownCommands(commandSpec);
            }
            if (appearance === CommandAppearance.Icon || !commandSpec.label) {
                let buttonId = _.uniqueId("button");
                return html`
                    <wa-button id="${buttonId}" variant="neutral" appearance="plain" class="icon-button"
                            @click=${commandSpec.handler} ${RenderingUtil.spreadAttributes(commandSpec.buttonAttrs)}>
                        <wa-icon name="${commandSpec.icon}" variant="light" label="${commandSpec.label}"></wa-icon>
                        ${commandSpec.label ? html`<wa-tooltip for="${buttonId}">${commandSpec.label}</wa-tooltip>` : ""} 
                    </wa-button>
                `
            }
            return html`
                <wa-button appearance="outlined" variant="plain" class="btn-s ${commandSpec.cssClass || ""}"
                    @click =${() => this._handleCommand(commandSpec)}
                    ${RenderingUtil.spreadAttributes(commandSpec.buttonAttrs)}>
                        ${commandSpec.icon ? html`<wa-icon slot="start" name="${commandSpec.icon}" variant="light"></wa-icon>` : ""}
                        ${commandSpec.label}
                </wa-button>`
        });
        renderLit(html`
            <div class="wa-cluster wa-gap-s">
                ${components}
            </div>` , this);
    }
    private _renderDropdownCommands(commandSpec) {
        let triggerhtml;
        if (commandSpec.icon || commandSpec.appearance === CommandAppearance.Icon) {
            triggerhtml = html`
                <wa-button slot="trigger" appearance="plain" variant="neutral" size="xs" class="trigger-button ${commandSpec.cssClass || ""}">
                    <wa-icon name="${commandSpec.icon || DefaultDropdownIcon}" ></wa-icon>
                </wa-button>
            `
        } else {
            triggerhtml = html`
                <wa-button slot="trigger" appearance="outlined" variant="neutral" size="s" with-caret>
                    ${NestedCommandsLabel}
                </wa-button>
            `
        }
        return html`
            <wa-dropdown @wa-select=${(e) => this._handleDropdownCommand(e, commandSpec.commandSpecs)}>
                ${triggerhtml}
                ${this._getNestedDropdownItems(commandSpec.commandSpecs)}
            </wa-dropdown>
            `
    }
    private _handleCommand(commandSpec: CommandSpec) {
        commandSpec.handler && commandSpec.handler(commandSpec);
    }
    private _handleDropdownCommand(e, commandSpecs) {
        let index = e.detail.item.value;
        let commandSpec = commandSpecs[index];
        return this._handleCommand(commandSpec);
    }
    private _getNestedDropdownItems(commandSpecs: CommandSpec[]) {
        let index = -1;
        return commandSpecs.map(commandSpec => {
            ++index;
            if (commandSpec.appearance === CommandAppearance.Divider) {
                return html`<wa-divider></wa-divider>`;
            }
            if (commandSpec.appearance === CommandAppearance.Custom) {
                return html`${commandSpec.render(commandSpec)}`;
            }
            return html`
                <wa-dropdown-item value="${index}">
                    ${commandSpec.icon ? html`<wa-icon name="${commandSpec.icon}" variant="light"></wa-icon>` : ""}
                    ${commandSpec.label}
                </wa-dropdown-item>
            `
        })
    }
}
customElements.define("whiz-commands", CommandsViewer);