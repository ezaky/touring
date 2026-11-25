/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */

import fs from "fs/promises";
import { tmpdir } from "os"; 
import * as _ from 'lodash-es';
import ServerUtil from "../server/ServerUtil";

export default class FileUtil {
    static async readFile(relativePath, encoding: BufferEncoding = "utf8"):Promise<string> {        
        return fs.readFile(ServerUtil.normalizeServerPath(relativePath), encoding);
    }
    static async writeTempTextFile(text: string): Promise<string> {
        const path = this.getTempFilePath();
        await fs.writeFile(path, text);
        return path;
    }
    static async deleteFile(filePath) {
        return fs.unlink(filePath);
    }
    static getTempDir() {
        return tmpdir();
    }
    static getTempFilePath(ext?: string): string {
        let fileName = _.random(1, 1*1000*1000*1000);
        ext && (fileName += ext);
        return `${FileUtil.getTempDir()}/z${fileName}`
    }
    static async deleteUploadedFiles(files) {
        const promises = files.map(file => FileUtil.deleteFile(file.path));
        return Promise.all(promises);
    }
}