import { Storage } from "@google-cloud/storage";
import { GcpConfig } from "../gcp/GcpDefs";

class GcpClients {
    private _storage: Storage;

    getStorage(): Storage {
        if (!this._storage) {
            this._storage = new Storage({ projectId: GcpConfig.projectId });
        }
        return this._storage;
    }
}
export default new GcpClients();