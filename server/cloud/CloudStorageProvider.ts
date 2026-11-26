import { ControllerContext } from "../whiz/controllers/ControllerDefs";
import { FileDescriptor } from "./CloudDefs";

export const DefaultUrlExpirySeconds  = 15 * 60; // 15 minutes;

export default interface CloudStorageProvider {
    uploadFile(file: FileDescriptor, context: ControllerContext): Promise<{filename: string, bucketFilename: string}>;
    deleteFile(bucketFilename: string): Promise<void>;
    getFilePublicUrl(bucketFilename: string, expirySeconds?: number): Promise<string>;
}