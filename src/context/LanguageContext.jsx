import React, { createContext, useContext, useState } from 'react';
import { PREDEFINED_TRANSLATIONS } from '../data/translations';

const LanguageContext = createContext();

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('es'); // Default language

    const t = (key) => {
        const translation = PREDEFINED_TRANSLATIONS[language]?.[key];
        return translation || key; // Fallback to key if not found
    };

    const value = {
        language,
        setLanguage,
        t
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};
