// i18n Configuration
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNLocalize from 'react-native-localize';

// Import all language files
import en from '../locales/en.json';
import zh from '../locales/zh.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import ar from '../locales/ar.json';
import de from '../locales/de.json';
import ja from '../locales/ja.json';
import ko from '../locales/ko.json';
import fa from '../locales/fa.json';
import it from '../locales/it.json';

// Language configuration
export const LANGUAGES = {
    en: { name: 'English', nativeName: 'English', rtl: false },
    zh: { name: 'Chinese', nativeName: '简体中文', rtl: false },
    es: { name: 'Spanish', nativeName: 'Español', rtl: false },
    fr: { name: 'French', nativeName: 'Français', rtl: false },
    ar: { name: 'Arabic', nativeName: 'العربية', rtl: true },
    de: { name: 'German', nativeName: 'Deutsch', rtl: false },
    ja: { name: 'Japanese', nativeName: '日本語', rtl: false },
    ko: { name: 'Korean', nativeName: '한국어', rtl: false },
    fa: { name: 'Persian', nativeName: 'فارسی', rtl: true },
    it: { name: 'Italian', nativeName: 'Italiano', rtl: false },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

// RTL languages list
export const RTL_LANGUAGES: LanguageCode[] = ['ar', 'fa'];

// Resources for i18next
const resources = {
    en: { translation: en },
    zh: { translation: zh },
    es: { translation: es },
    fr: { translation: fr },
    ar: { translation: ar },
    de: { translation: de },
    ja: { translation: ja },
    ko: { translation: ko },
    fa: { translation: fa },
    it: { translation: it },
};

// Storage key for language preference
const LANGUAGE_STORAGE_KEY = '@matchwell_language';

// Get device language
const getDeviceLanguage = (): LanguageCode => {
    const locales = RNLocalize.getLocales();
    if (locales.length > 0) {
        const deviceLang = locales[0].languageCode as LanguageCode;
        if (deviceLang in LANGUAGES) {
            return deviceLang;
        }
    }
    return 'en';
};

// Check if language is RTL
export const isRTLLanguage = (lang: LanguageCode): boolean => {
    return RTL_LANGUAGES.includes(lang);
};

// Convert number to Arabic numerals (٠-٩)
export const toArabicNumerals = (num: number | string): string => {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).replace(/[0-9]/g, (d) => arabicNumerals[parseInt(d, 10)]);
};

// Convert number to Farsi numerals (۰-۹)
export const toFarsiNumerals = (num: number | string): string => {
    const farsiNumerals = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(num).replace(/[0-9]/g, (d) => farsiNumerals[parseInt(d, 10)]);
};

// Format number based on current language
export const formatNumber = (num: number | string, lang?: LanguageCode): string => {
    const currentLang = lang || (i18n.language as LanguageCode);
    if (currentLang === 'ar') {
        return toArabicNumerals(num);
    } else if (currentLang === 'fa') {
        return toFarsiNumerals(num);
    }
    return String(num);
};

// Format number with zero-padding, then convert to RTL numerals
export const formatPaddedNumber = (num: number, padLength: number, lang?: LanguageCode): string => {
    const paddedNum = String(num).padStart(padLength, '0');
    return formatNumber(paddedNum, lang);
};

// Load saved language
export const loadSavedLanguage = async (): Promise<LanguageCode> => {
    try {
        const savedLang = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (savedLang && savedLang in LANGUAGES) {
            return savedLang as LanguageCode;
        }
    } catch (error) {
        console.log('Error loading language:', error);
    }
    return getDeviceLanguage();
};

// Save language preference
export const saveLanguage = async (lang: LanguageCode): Promise<void> => {
    try {
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (error) {
        console.log('Error saving language:', error);
    }
};

// Change language and handle RTL
export const changeLanguage = async (lang: LanguageCode): Promise<boolean> => {
    const currentRTL = I18nManager.isRTL;
    const newRTL = isRTLLanguage(lang);

    await i18n.changeLanguage(lang);
    await saveLanguage(lang);

    // If RTL status changed, need to force RTL and restart
    if (currentRTL !== newRTL) {
        I18nManager.allowRTL(newRTL);
        I18nManager.forceRTL(newRTL);
        return true; // Needs restart
    }

    return false; // No restart needed
};

// Get current language
export const getCurrentLanguage = (): LanguageCode => {
    return (i18n.language || 'en') as LanguageCode;
};

// Initialize i18n
const initI18n = async () => {
    const savedLang = await loadSavedLanguage();

    // Set RTL based on saved language
    const shouldBeRTL = isRTLLanguage(savedLang);
    if (I18nManager.isRTL !== shouldBeRTL) {
        I18nManager.allowRTL(shouldBeRTL);
        I18nManager.forceRTL(shouldBeRTL);
    }

    await i18n
        .use(initReactI18next)
        .init({
            resources,
            lng: savedLang,
            fallbackLng: 'en',
            interpolation: {
                escapeValue: false,
            },
            react: {
                useSuspense: false,
            },
        });
};

// Initialize immediately
initI18n();

export default i18n;
