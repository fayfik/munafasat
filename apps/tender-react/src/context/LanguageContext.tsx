import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type Lang = 'en' | 'ar';

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  dir: 'ltr' | 'rtl';
  isAr: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  useEffect(() => {
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
  }, []);

  return (
    <LanguageContext.Provider
      value={{ lang, setLang, dir: lang === 'ar' ? 'rtl' : 'ltr', isAr: lang === 'ar' }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

// Returns a function that picks the right string based on active language.
// Usage: const t = useT(); then: t('English text', 'النص العربي')
export function useT() {
  const { isAr } = useLanguage();
  return (en: string, ar: string): string => (isAr ? ar : en);
}
