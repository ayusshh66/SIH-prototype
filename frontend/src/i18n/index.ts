import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import hi from './locales/hi.json';

const savedLang = localStorage.getItem('avirat_lang') || 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// Mirror on <html> for CSS font hooks
const applyLangClass = (lang: string) => {
  document.documentElement.classList.toggle('lang-hi', lang === 'hi');
  document.documentElement.setAttribute('lang', lang === 'hi' ? 'hi' : 'en');
};

applyLangClass(savedLang);

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('avirat_lang', lng);
  applyLangClass(lng);
});

export default i18n;
