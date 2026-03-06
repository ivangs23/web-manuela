import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const LanguageSwitcher = ({ className = '' }) => {
    const { language, setLanguage } = useLanguage();

    const languages = [
        { code: 'es', label: 'ES', flag: '🇪🇸' },
        { code: 'en', label: 'EN', flag: '🇬🇧' },
        { code: 'pt', label: 'PT', flag: '🇵🇹' }
    ];

    return (
        <div className={`flex gap-1 sm:gap-2 shrink-0 ${className}`}>
            {languages.map(lang => (
                <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`
                        px-2 py-1 sm:px-3 sm:py-1.5 rounded-full font-bold text-[10px] sm:text-sm transition-all flex items-center gap-1 sm:gap-2
                        ${language === lang.code
                            ? 'bg-[#c28744] text-white shadow-md transform sm:scale-105'
                            : 'bg-[#FFF8E7] text-black hover:bg-[#c28744] hover:text-white'}
                    `}
                >
                    <span className="text-sm sm:text-lg">{lang.flag}</span>
                    <span>{lang.label}</span>
                </button>
            ))}
        </div>
    );
};

export default LanguageSwitcher;
