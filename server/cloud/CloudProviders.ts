import GcpStorageProvider from "../gcp/GcpStorageProvider";
import CloudStorageProvider from "./CloudStorageProvider";

export default class RagProviders {
    private static _storageProvider: CloudStorageProvider;

    public static getStorageProvider(): CloudStorageProvider {
        if (!this._storageProvider) {
            this._storageProvider = new GcpStorageProvider();
        }
        return this._storageProvider;
    }
}