import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '../types';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  AR: {
    welcome: 'مرحباً بك في بريكولا',
    login: 'دخول',
    register: 'سجل الآن',
    client: 'حريف',
    technician: 'فني',
    admin: 'مسؤول',
    logout: 'تسجيل خروج',
    back: 'رجوع',
    loading: 'جاري التحميل...',
    save: 'حفظ',
    cancel: 'إلغاء',
    search: 'بحث...',
    noResults: 'لا توجد نتائج',
    pending: 'قيد الانتظار',
    approved: 'مقبول',
    rejected: 'مرفوض',
    selectRole: 'اختر دورك للبدء'
  },
  EN: {
    welcome: 'Welcome to Bricola',
    login: 'Login',
    register: 'Sign Up',
    client: 'Client',
    technician: 'Technician',
    admin: 'Admin',
    logout: 'Logout',
    back: 'Back',
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    search: 'Search...',
    noResults: 'No results found',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    selectRole: 'Select your role to start'
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('AR');

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
