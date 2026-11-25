import { EnumItem } from "shared/whiz/entities/EntityField";
import StringUtil from "shared/whiz/util/StringUtil";
import { html } from "lit-html";
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { spread } from '@open-wc/lit-helpers';
import WebModuleLoader from "../app/WebModuleLoader";
import * as _ from "lodash-es";
import '@web.awesome.me/webawesome-pro/dist/components/tooltip/tooltip.js';

let _numberFormatter;

export default class RenderingUtil {
    static normalizeEnumItems(enumItems: (EnumItem|string)[]): EnumItem[] {
        return enumItems.map(enumItem => {
            let normalized: EnumItem;
            if (_.isString(enumItem)) {
                normalized = {value: <string>enumItem}
            } else {
                normalized = <EnumItem>enumItem;
            }
            if (normalized.value === undefined) {
                throw new Error("enumItem should have a value");
            }
            if (!normalized.label) {
                normalized = {
                    ...normalized,
                    label: StringUtil.getLabelForId(normalized.value)
                };
            }
            return normalized;
        })
    }
    static escapeHtml(str): string {
        const p = document.createElement("p");
        p.textContent = str;
        return p.innerHTML;
    }
    static getTextForHtml(html:string): string {
        const p = document.createElement("p");
        p.innerHTML = html;
        return p.textContent;
    }
    static createElement(options: {tagName?: string, html?: string, cssClasses?: [string]}) {
        let element = document.createElement(options.tagName || "div");
        options.html && (element.innerHTML = options.html);
        if (options.cssClasses) {
            for (let cssClass of options.cssClasses) {
                element.classList.add(cssClass);
            }
        }
        return element;
    }
    static renderTooltipLink(text, tooltip, options?: {placement}) {
        const uid = _.uniqueId();
        return html`
            <span id=${uid} class="whiz-tooltip-link">${text}</span>
            <wa-tooltip for="${uid}" placement="${options?.placement|| "top"}" class="large">${unsafeHTML(tooltip)}</wa-tooltip>
        `
    }
    static renderTruncated(text: string, maxLen: number = 45, options?: {placement}) {
        if (text.length <= maxLen) {
            return text;
        }
        const uid = _.uniqueId();
        return html`
            <span id=${uid} class="whiz-truncated-text">${StringUtil.truncateMiddle(text, maxLen)}</span>
            <wa-tooltip for="${uid}" placement="${options?.placement|| "top"}">${text}</wa-tooltip>
        `
    }
    static formatPercent(value: number) {
        return Math.round(value*100) + "%";
    }
    static renderTagByNameVar(tagName, props?, attributes?, contentHtml?) {
        let staticTagName = unsafeStatic(tagName);
        return html`
            ${staticHtml`<${staticTagName} .props=${props} ${this.spreadAttributes(attributes)}>
                ${contentHtml || ""}
            </${staticTagName}>`}`;
    }
    static async renderTagByModuleKey(moduleKey, props?, attributes?) {
        let module = await WebModuleLoader.load(moduleKey);
        let tagName = customElements.getName(<any>module.constructor);
        return {
            tagName: tagName,
            template: this.renderTagByNameVar(tagName, props, attributes)
         }
    }
    static spreadAttributes(attributes) {
        if (!attributes) {
            return "";
        }
        return spread(attributes);
    }
    static formatNumber(n) {
        if (n == null) {
            return ""
        }
        if (!_numberFormatter) {
            _numberFormatter = new Intl.NumberFormat();
        }
        return _numberFormatter.format(n);
    }
}