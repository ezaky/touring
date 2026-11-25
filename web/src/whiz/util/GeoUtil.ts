export default class GeoUtil {
    private static _languageCode;
    private static _countryCode;
    
    static getBrowserLanguageCode(): string {
        if (this._languageCode === undefined) {
            this._languageCode = navigator.language.split("-")[0]?.toLowerCase() || null;
        }
        return this._languageCode;
    }
    static getBrowserCountryCode(): string {
        if (this._countryCode === undefined) {
            this._countryCode = navigator.language.split("-")[1]?.toLowerCase() || null;
        }
        return this._countryCode;
    }
}