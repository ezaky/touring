export default class AsyncUtil {
    static all(promisesObj): {[key: string]: any} {
        let promises = [];
        let keys = [];
        for (let key in promisesObj) {
            let promise = promisesObj[key];
            promises.push(promise);
            keys.push(key);  
        }
        return new Promise((resolve, reject) => {
            Promise.all(promises).then(values => {
                let i = 0;
                let result = {};
                for (let key of keys) {
                   result[key] = values[i++];
                }
                resolve(result);
             }, error => {
                reject(error);
             });     
        })
     }
     static sleep(millis:number) {
        return new Promise(resolve => setTimeout(resolve, millis));
    }
}