/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */

import { ModuleSpec } from "./PluginDefs";

export default class ModuleLoader {
    static async load(moduleSpec: ModuleSpec) {
        let module = await moduleSpec();
        if (!module) {
            return;
        }
        // the return result is different whether using ts-node-dev or node
        let defaultExport = module.default?.default || module.default || module;
        if (!defaultExport) {
            throw new Error(`The module ${moduleSpec} should have a default export.`);
        }
        return defaultExport;
    }
}