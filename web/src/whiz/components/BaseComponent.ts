import CommandMonitor from "../commands/CommandMonitor";
import { PageExtension } from "../plugins/WebPluginDefs";

export interface RefreshParams {
    commandResponse?: any,
    // Dynamic fields
    [key: string]: any;
}

export default abstract class BaseComponent<T=any> extends HTMLElement {
    private _props: T;
    private _onWindowResizeFunc;
    private _intersectionObserver;
    private _isRendered: boolean;

    abstract render(data?: any, refreshParams?: RefreshParams);

    set props(props: T) {
        this._props = {...props};
        this.initProps(this._props);
        if (this.isConnected) {
            // console.log("set props while isConnected");
            this._forceRender();
        }
    }
    get props(): T {
        return this._props;
    }
    initProps(props: T) {
    }
    getExtension():PageExtension {
        // extension is a special props it is set only in MainPage on page extension
        return (<any>this.props).extension;
    }
    async loadData(): Promise<any> {
    }
    async refresh(params?: RefreshParams) {
        return this._forceRender(false, params);
    }
    connectedCallback() {
        // if the props setter has not been invoked
        if (!this._props) {
            this._props = <T>{};
            this.initProps(this._props);
        }
        this._forceRender(true);
    }
    disconnectedCallback() {
        this._removeTrackListener();
    }
    trackElemHeight(options: {elem?: HTMLElement, refElem?: HTMLElement, refSelector?: string}) {
        const elem = options?.elem || this;
        const isHidden = elem.offsetParent === null && elem.offsetWidth === 0 && elem.offsetHeight === 0;
        if (isHidden) {
            if (this._intersectionObserver) {
                return;
            }
            this._intersectionObserver = new IntersectionObserver(entries => {
                const [entry] = entries;
                if (entry.isIntersecting) {
                    this._intersectionObserver.disconnect();
                    this._intersectionObserver = null;
                    this.trackElemHeight(options);
                }
            });
            this._intersectionObserver.observe(elem);
            return;
        }
        this._removeTrackListener();
        this._onWindowResizeFunc = () => this._adjustHeight(options);
        window.addEventListener("resize", this._onWindowResizeFunc);
        this._onWindowResizeFunc();
    }
    public isRendered(): boolean {
        return this._isRendered;
    }
    private _adjustHeight(options) {
        const heightPad = 20;
        const elem = options?.elem || this;
        let top = elem.getBoundingClientRect().top;
        let containerHeight;
        let refElem = options.refElem;
        if (refElem) {
            if (options.refSelector) {
                refElem = refElem.querySelector(options.refSelector);
            }
            const refRect = refElem.getBoundingClientRect();
            containerHeight = refRect.height;
            top -= refRect.top;
        } else {
            containerHeight = window.innerHeight;
        }
        elem.style.height = `${containerHeight - top - heightPad}px`;
    }
    private _removeTrackListener() {
        if (this._onWindowResizeFunc) {
            window.removeEventListener("resize", this._onWindowResizeFunc);
            this._onWindowResizeFunc = null;
        }
    }
    private async _forceRender(isFirstRender?: boolean, refreshParams?: RefreshParams) {
        const promise = this.loadData();
        new CommandMonitor({
            promise: promise,
            elem: this
        });
        this.render(await promise, refreshParams);
        this._isRendered = true;
        this.dispatchEvent(new CustomEvent("whiz-rendered", {
            bubbles: false, 
            composed: true,
            detail: {
                isFirstRender: isFirstRender
            }
        }));
    }
}