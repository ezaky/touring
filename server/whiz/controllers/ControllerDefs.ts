/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */

import Database from "../entities/Database";
import {Request as ExpressRequest, Response as ExpressResponse} from "express";

export interface ControllerContext {
    req?: ExpressRequest,
    res?: ExpressResponse,
    /**
     * The request params regardless of the controller method
     */
    requestParams?: {[key: string]: any},
    /**
     * Set by ControllersManager when the controller extension specifies an entity type.
     */
    db?: Database,
    /**
     * Set by ControllersManager when the controller extension specifies an entity type, and the method is not GET.
     */
    connection?: any,

    [key: string]: any
}