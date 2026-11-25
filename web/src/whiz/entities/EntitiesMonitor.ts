import { FindQuerySpec } from "shared/whiz/entities/QueryDefs";
import QueryCommand from "./QueryCommand";
import * as _ from "lodash-es";

const TimerInterval = 15*1000; 

export default class EntitiesMonitor {
    private _querySpec: FindQuerySpec;
    private _notifyFunc: () => void;
    private _timer;

    startPolling(querySpec: FindQuerySpec, notify: () => void) {
        this._querySpec = querySpec;
        this._notifyFunc = notify;
        this._timer = setInterval(this._checkEntities, TimerInterval); 
    }
    stopPolling() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
        }
    }
    private _checkEntities = async () => {
        let command = new QueryCommand({
            querySpec: this._querySpec
        });
        let result = await command.execute();
        if (!_.isEmpty(result.data)) {
            this.stopPolling();
            this._notifyFunc();
        }
    }
}