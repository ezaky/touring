export default class EnvUtil {
    static isDev() {
        return process.env.NODE_ENV === "development";
    }
    static isProduction() {
        return process.env.NODE_ENV !== "development";
    }
}