import React, { createContext, useContext, useEffect, useState } from 'react';
import { TRANSLATIONS } from '../i18n';

const LanguageContext = createContext(null);

function detectInitialLanguage() {
  const stored = localStorage.getItem('lp_lang');
  if (stored && TRANSLATIONS[stored]) return stored;
  const navLang = (navigator.language || 'en').toLowerCase();
  if (navLang.startsWith('kn')) return 'kn';
  if (navLang.startsWith('hi')) return 'hi';
  return 'en';
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(detectInitialLanguage);

  const setLanguage = (lang) => {
    if (TRANSLATIONS[lang]) {
      setLanguageState(lang);
      localStorage.setItem('lp_lang', lang);
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
