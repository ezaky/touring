import pLimit from "p-limit";

const DefaultConcurrencyLimit = 50;

export default class ServerAsyncUtil {
     static async batchAsync(items: unknown[], taskFn: (item) => Promise<unknown>, 
            concurrencyLimit: number = DefaultConcurrencyLimit, allSettled?: boolean) {
        const limit = pLimit(concurrencyLimit);
        const promises = items.map((item) => limit(() => taskFn(item)));
        if (allSettled) {
            return Promise.allSettled(promises);
        }
        return Promise.all(promises);
     }
}