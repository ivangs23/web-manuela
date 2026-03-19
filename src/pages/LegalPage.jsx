import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LEGAL_DATA } from '../data/legalData';
import { useLanguage } from '../context/LanguageContext';

const LegalPage = () => {
    const { section } = useParams();
    const navigate = useNavigate();
    const { language } = useLanguage();
    
    // Fallback to Spanish if the current language doesn't have the section
    const data = LEGAL_DATA[language]?.[section] || LEGAL_DATA['es'][section];

    if (!data) {
        return (
            <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center p-8">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Página no encontrada</h1>
                    <button 
                        onClick={() => navigate('/')}
                        className="text-[#c28744] font-bold flex items-center gap-2 mx-auto"
                    >
                        <ArrowLeft size={20} /> Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F9F7F2] text-[#2C1A0F] font-sans selection:bg-[#c28744]/30">
            <header className="bg-white border-b border-[#2C1A0F]/10 px-6 py-4 sticky top-0 z-10 flex items-center gap-4">
                <button 
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-[#F9F7F2] rounded-full transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-serif font-black uppercase tracking-tight">{data.title}</h1>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-12">
                <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-[#2C1A0F]/5">
                    <div className="whitespace-pre-line leading-relaxed text-[#2C1A0F]/80">
                        {data.content}
                    </div>
                </div>

                <div className="mt-12 text-center text-[#2C1A0F]/40 text-sm">
                    <p>Manuela Desayuna &copy; {new Date().getFullYear()}</p>
                </div>
            </main>
        </div>
    );
};

export default LegalPage;
