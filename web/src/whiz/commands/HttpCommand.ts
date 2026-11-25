/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */

import * as _ from 'lodash-es';
import BaseCommand, { CommandProps } from './BaseCommand';
import SessionsManager from '../app/SessionsManager';

const UseGetOverPost = true;
const GetOverPostHeader = "get-over-post";
const ExtraFormDataField = "extraFormDataJson";

export interface HttpCommandProps extends CommandProps {
    // url made optional because it could be set by sub classes, e.g. QueryCommand
    url?: string,
    method?: string,
    params?: {[key: string] : any},
    formData?: FormData,
    headers?:  {[key: string] : any},
    needsRawResponse?: true
}
export default class HttpCommand extends BaseCommand<HttpCommandProps> {
    // upper case to match the fetch api
    static Get = "GET";
    static Post = "POST";
    static Put = "PUT";
    static Delete = "DELETE";

    private _method:string;
    private _abortController;

    constructor(props:HttpCommandProps) {
        super(props);
        this._method = props.method || HttpCommand.Get;

    }
    abort() {
        if (this._abortController) {
            // see DOMException error name: https://developer.mozilla.org/en-US/docs/Web/API/DOMException
            this._abortController.abort("AbortError");
            this._abortController = null;
        }
    }
    protected async customExecute(): Promise<any> {
        let props = this.props;
        let method = this._method;
        let isGet = method === HttpCommand.Get;
        let headers = {
            ...props.headers,
            ...SessionsManager.getHttpHeader()
        };
        let formData = props.formData;
        if (formData && props.params) {
            formData.append(ExtraFormDataField, JSON.stringify(props.params));
        }
        !formData && (headers["Content-Type"] = "application/json"); // relevant for POST and PUT
        if (UseGetOverPost && isGet) {
           method = HttpCommand.Post;
           headers[GetOverPostHeader] = true;
        }
        this._abortController = new AbortController();   
        // console.log(`fetch`, props);
        let response = await fetch(props.url, { 
            method: method,
            body: formData || (!_.isEmpty(props.params) ? JSON.stringify(props.params) : null),
            headers: headers,
            cache: "no-cache",
            signal: this._abortController.signal
        });
        const getResponseResult = async () => {
            let result = await response.text();
            if (result) {
                if (result.startsWith("{") || result.startsWith("[")) {
                    result = JSON.parse(result);
                } else {
                    console.log("result not json: ", result);
                }
            }
            return result;
        }
        if (!response.ok) {
            throw await getResponseResult();
        }
        if (props.needsRawResponse) {
            return response;
        }
        return getResponseResult();
     }
}