import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';

const CookieBanner = () => {
    const [isVisible, setIsVisible] = useState(false);
    const { t } = useLanguage();

    useEffect(() => {
        const consent = localStorage.getItem('cookie-consent');
        if (!consent) {
            setIsVisible(true);
        }
    }, []);

    const acceptCookies = () => {
        localStorage.setItem('cookie-consent', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6 animate-fade-in-up">
            <div className="max-w-4xl mx-auto bg-white/90 backdrop-blur-xl border border-[#c28744]/20 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
                <div className="bg-[#c28744]/10 p-4 rounded-2xl text-[#c28744]">
                    <ShieldCheck size={32} />
                </div>
                
                <div className="flex-1 text-center md:text-left">
                    <h3 className="text-lg font-bold text-[#2C1A0F] mb-1">Control de Cookies</h3>
                    <p className="text-[#2C1A0F]/70 text-sm leading-relaxed">
                        Utilizamos cookies técnicas y de terceros (Stripe) para garantizar el funcionamiento del carrito y los pagos seguros. 
                        Para más información, consulta nuestra <Link to="/legal/cookies" className="text-[#c28744] font-bold underline hover:text-[#2C1A0F] transition-colors">Política de Cookies</Link>.
                    </p>
                </div>

                <button 
                    onClick={acceptCookies}
                    className="w-full md:w-auto bg-[#2C1A0F] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#c28744] transition-all active:scale-95 shadow-lg whitespace-nowrap"
                >
                    Aceptar y continuar
                </button>
            </div>
        </div>
    );
};

export default CookieBanner;
