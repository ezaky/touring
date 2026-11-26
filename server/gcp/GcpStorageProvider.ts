import { Bucket, Storage } from "@google-cloud/storage";
import { ControllerContext } from "../whiz/controllers/ControllerDefs";
import logger from "../whiz/server/Logger";
import EnvUtil from "../whiz/util/EnvUtil";
import CloudStorageProvider, { DefaultUrlExpirySeconds } from "../cloud/CloudStorageProvider";
import { FileDescriptor } from "../cloud/CloudDefs";
import { GcpConfig } from "./GcpDefs";
import GcpClients from "./GcpClients";
import StringUtil from "shared/whiz/util/StringUtil";

let _bucket: Bucket;

export default class GcpStorageProvider implements CloudStorageProvider {
    public async uploadFile(file: FileDescriptor, context: ControllerContext): Promise<{filename: string, bucketFilename: string}> {
        let bucketFilename = this._generateBucketFileName(file.originalname, context);
        await this._getBucket().upload(file.path, {destination: bucketFilename});
        logger.info(`Upload file to bucket: ${bucketFilename}`);
        return {
            filename: file.originalname,
            bucketFilename: bucketFilename
        }
    }
    public async deleteFile(bucketFilename: string) {
        const storage = GcpClients.getStorage();
        logger.info(`Delete from bucket: ${bucketFilename}`);
        await storage.bucket(GcpConfig.bucketName).file(bucketFilename).delete({
            ignoreNotFound: true
        });
    }
    public async saveContent(content: string, filename: string, contentType: string, context: ControllerContext) {
        const bucketFilename = this._generateBucketFileName(filename, context);
        const file = this._getBucket().file(bucketFilename);
        await file.save(content, {
            contentType: contentType
        });
        return {filename, bucketFilename};
    }
    public async getFilePublicUrl(bucketFilename: string, expirySeconds = DefaultUrlExpirySeconds): Promise<string> {
        const storage = new Storage({
                /*
                avoid getSignedUrl error complaining about client_email not found.
                generateted the file using 
                $ gcloud iam service-accounts keys create /Users/essamzaky/dev/gem/gemai-sa.json --iam-account=gemai-app-sa@gemai-1.iam.gserviceaccount.com
                */
              keyFilename: EnvUtil.isDev() ? "/Users/essamzaky/dev/gem/gemai-sa.json" : undefined
        });
        const options = {
            action: <any>"read",
            expires: Date.now() + expirySeconds*1000
        };
        const [url] = await storage.bucket(GcpConfig.bucketName).file(bucketFilename).getSignedUrl(options); 
        return url;
    }
    
    public getBucketUri(bucketFilename: string): string {
        return `gs://${GcpConfig.bucketName}/${bucketFilename}`;
    }
    public getBucketFileNameFromUri(bucketUri: string) {
        const lastItem = bucketUri.split("/").pop();
        const index = lastItem.indexOf("_");
        if (index <= 0) {
            return null
        }
        return lastItem.substring(index+1);
    }
    private _generateBucketFileName(filename, context: ControllerContext): string {
        // ezez * Put dev files in dev folder
        let name = `${StringUtil.randomStr()}_${filename.toLowerCase().replace(/\s/g, "_")}`;
        if (EnvUtil.isDev()) {
            name = `dev/${name}`;
        }
        return name;
    }

    private _getBucket() {
        if (!_bucket) {
            _bucket = GcpClients.getStorage().bucket(GcpConfig.bucketName);
        }
        return _bucket;
    }
}
