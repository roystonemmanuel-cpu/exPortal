import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.js';
import kweyol from './locales/kweyol.js';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      kweyol: { translation: kweyol },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
