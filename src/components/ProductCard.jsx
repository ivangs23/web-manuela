import React from 'react';
import { useProducts } from '../context/ProductContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedName, getLocalizedDesc } from '../context/ProductContext';

const ProductCard = ({ product, onSelect }) => {
    const { allergens } = useProducts();
    const { t, language } = useLanguage();

    return (
        <div
            onClick={() => onSelect(product)}
            className="bg-[#FFF8E7] rounded-3xl shadow-lg border border-[#c28744]/20 overflow-hidden flex flex-col h-full transform transition-all active:scale-95 hover:shadow-xl hover:shadow-[#c28744]/10 hover:-translate-y-1 cursor-pointer group will-change-transform"
        >
            <div className="h-56 overflow-hidden relative">
                <img
                    src={product.image}
                    alt={product.name}
                    decoding="async"
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 will-change-transform transform-gpu"
                />
                <div className="absolute bottom-3 right-3 bg-[#2C1A0F] text-[#c28744] px-4 py-2 rounded-xl font-black shadow-md border border-[#c28744]/20 text-lg">
                    {parseFloat(product.price || 0).toFixed(2)}€
                </div>
                {product.allergens.length > 0 && (
                    <div className="absolute top-3 right-3 flex gap-1">
                        {product.allergens.map(a => (
                            <div key={a} className="bg-white/90 p-1.5 rounded-full shadow-sm text-gray-600 border border-gray-200">
                                {allergens[a].icon}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-2xl font-serif font-bold text-[#2C1A0F] mb-1 leading-tight">{getLocalizedName(product, language)}</h3>
                {getLocalizedDesc(product, language) && (
                    <p className="text-[#5A4033] text-sm mb-4 flex-1 line-clamp-2 leading-relaxed italic border-l-2 border-[#c28744] pl-2">
                        {getLocalizedDesc(product, language)}
                    </p>
                )}
                {!getLocalizedDesc(product, language) && <div className="flex-1 mb-4"></div>}
                <div className="w-full bg-[#2C1A0F] group-hover:bg-[#3E2515] text-[#c28744] py-4 rounded-xl font-bold text-lg shadow-sm transition-all flex items-center justify-center gap-2 border border-[#c28744]/20">
                    {t('add_customize')}
                </div>
            </div>
        </div>
    );
};

export default React.memo(ProductCard);
