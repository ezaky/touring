import { configureLocalization } from '@lit/localize';
import { sourceLocale, targetLocales, allLocales } from "../../generated/locale-codes";
import AppStateManager from './AppStateManager';
import { EnumItem } from 'shared/whiz/entities/EntityField';
import GeoUtil from '../util/GeoUtil';

const LanguageKey = "touring.language";

class LocalizationManager {
    private _getLocaleFn;
    private _setLocaleFn;
    
    constructor() {
        const config = configureLocalization({
            sourceLocale,
            targetLocales,
            loadLocale: (locale: string) => import(`../../generated/locales/${locale}`),
        });
        this._getLocaleFn = config.getLocale;
        this._setLocaleFn = config.setLocale;
    }
    async initializeLanguage() {
        let language = AppStateManager.getValue(LanguageKey);
        if (!language) {
            language = GeoUtil.getBrowserLanguageCode();
        }
        if (!allLocales.includes(<any>language)) {
            return;
        }
        await this._setLocaleFn(language);
    }
    getLanguage() {
        return this._getLocaleFn();
    }
    setLanguage(language) {
        AppStateManager.setValue(LanguageKey, language);
    }
    getLanguageEnumItems(): EnumItem[] {
        return [
            {value: "en", label: "English"},
            {value: "fr", label: "Français"}
        ];
    }
}
export default new LocalizationManager();