import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useProducts, getLocalizedName, getLocalizedDesc, getLocalizedAllergenLabel } from '../context/ProductContext';
import { useLanguage } from '../context/LanguageContext';

const ProductDetail = ({ product, onClose, onAddToCart, initialModifiers = [] }) => {
    const { allergens } = useProducts();
    const { t, language } = useLanguage();
    const [selectedModifiers, setSelectedModifiers] = useState(initialModifiers);

    const toggleModifier = (mod) => {
        setSelectedModifiers(prev => {
            const exists = prev.find(m => m.id === mod.id);
            if (exists) {
                return prev.filter(m => m.id !== mod.id);
            } else {
                return [...prev, mod];
            }
        });
    };

    const totalPrice = product.price + selectedModifiers.reduce((sum, m) => sum + m.price, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            {/* Fondo Modal Blanco */}
            <div className="bg-[#FFF8E7] w-full max-w-6xl h-[90vh] max-h-[850px] rounded-3xl overflow-hidden flex shadow-2xl border border-[#c28744]/20">

                {/* Columna Izquierda: Imagen */}
                <div className="w-1/2 relative hidden lg:block bg-[#12100B]">
                    <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                    />
                    {/* Gradiente solo para que el texto blanco se lea, pero el fondo general es blanco */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90"></div>

                    <div className="absolute top-6 left-6 z-10">
                        <button
                            onClick={onClose}
                            className="bg-white/90 hover:bg-white text-gray-900 p-3 rounded-full backdrop-blur-md transition-all shadow-md"
                        >
                            <X size={32} />
                        </button>
                    </div>

                    <div className="absolute bottom-12 left-12 right-12 text-white">
                        <h2 className="text-5xl font-serif font-black mb-4 drop-shadow-lg leading-tight text-[#c28744]">{getLocalizedName(product, language)}</h2>
                        <p className="text-lg text-gray-200 drop-shadow-md font-medium leading-relaxed">{getLocalizedDesc(product, language)}</p>
                    </div>
                </div>

                {/* Columna Derecha: Configuración (Fondo Blanco) */}
                <div className="w-full lg:w-1/2 flex flex-col bg-[#FFF8E7]">
                    {/* Header Móvil */}
                    <div className="lg:hidden p-6 flex justify-between items-center bg-[#FFF8E7] border-b border-[#c28744]/20">
                        <h2 className="text-2xl font-serif font-bold text-[#2C1A0F]">{getLocalizedName(product, language)}</h2>
                        <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-600"><X size={24} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8">

                        {/* Sección Alérgenos */}
                        <div className="mb-10">
                            <h3 className="text-sm font-bold text-[#c28744] uppercase tracking-widest mb-4">{t('allergens_info')}</h3>
                            <div className="flex flex-wrap gap-3">
                                {product.allergens.length > 0 ? product.allergens.map(a => (
                                    <div key={a} className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-[#c28744]/20 text-[#2C1A0F] shadow-sm">
                                        {allergens[a]?.icon}
                                        <span className="text-sm font-medium">
                                            {getLocalizedAllergenLabel(
                                                { label: allergens[a]?.label, label_en: allergens[a]?.label_en, label_pt: allergens[a]?.label_pt },
                                                language
                                            )}
                                        </span>
                                    </div>
                                )) : <span className="text-[#5A4033] italic">{t('no_allergens')}</span>}
                                {product.kcal && product.kcal.toString().trim() !== '' && (
                                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-[#c28744]/20 text-[#2C1A0F] shadow-sm">
                                        <span className="text-sm font-medium">{product.kcal} Kcal</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modificadores */}
                        {product.modifiers && product.modifiers.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-sm font-bold text-[#c28744] uppercase tracking-widest mb-4">{t('customize_order')}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {product.modifiers.map(mod => {
                                        const isSelected = selectedModifiers.some(m => m.id === mod.id);
                                        return (
                                            <button
                                                key={mod.id}
                                                onClick={() => toggleModifier(mod)}
                                                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${isSelected
                                                    ? 'bg-[#c28744]/10 border-[#c28744] text-[#2C1A0F] shadow-md'
                                                    : 'bg-white border-transparent text-[#5A4033] hover:border-[#c28744]/30 hover:bg-white shadow-sm'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${isSelected ? 'bg-[#c28744] border-amber-500' : 'border-gray-300 bg-gray-50'}`}>
                                                        {isSelected && <Check size={14} className="text-white" />}
                                                    </div>
                                                    <span className="font-bold">{mod.name}</span>
                                                </div>
                                                <span className={`text-sm font-mono ${mod.price > 0 ? 'text-amber-600 font-bold' : 'text-gray-400'}`}>
                                                    {mod.price > 0 ? `+${parseFloat(mod.price).toFixed(2)}€` : ''}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Notas */}
                        <div className="mt-6">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">{t('special_notes')}</h3>
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-gray-700 text-sm">
                                {t('allergy_warning')}
                            </div>
                        </div>

                    </div>

                    {/* Footer Acción */}
                    <div className="p-8 bg-[#FFF8E7] border-t border-[#c28744]/20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-10">
                        <div className="flex items-center justify-between gap-6">
                            <div className="flex flex-col">
                                <span className="text-[#5A4033] text-sm font-medium">{t('total_price')}</span>
                                <span className="text-4xl font-black text-[#2C1A0F]">{parseFloat(totalPrice).toFixed(2)}<span className="text-[#c28744] text-2xl">€</span></span>
                            </div>
                            <button
                                onClick={() => onAddToCart(product, selectedModifiers, totalPrice)}
                                className="flex-1 bg-[#2C1A0F] hover:bg-[#3E2515] text-[#c28744] py-5 rounded-2xl font-bold text-xl shadow-lg shadow-[#c28744]/10 transition-all flex items-center justify-center gap-3 active:scale-95 border border-[#c28744]/20"
                            >
                                {t('add_to_cart')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;
