import React, { useState } from 'react';
import { useProducts, getLocalizedName } from '../context/ProductContext';
import { useLanguage } from '../context/LanguageContext';
import { Save, Star, Search, X, CheckCircle2 } from 'lucide-react';

const AdminTopSellers = () => {
    const { products, settings, updateSetting, updateProductFeatured } = useProducts();
    const { language, t } = useLanguage();

    const [searchTerm, setSearchTerm] = useState('');
    const [title, setTitle] = useState(settings.top_sellers_title || '🔥 Top Sales');
    const [savingTitle, setSavingTitle] = useState(false);
    const [titleSaved, setTitleSaved] = useState(false);

    const featuredProducts = products
        .filter(p => p.is_featured)
        .sort((a, b) => (a.featured_order || 0) - (b.featured_order || 0));

    const searchResults = searchTerm.trim() === ''
        ? []
        : products.filter(p =>
            getLocalizedName(p, language).toLowerCase().includes(searchTerm.toLowerCase()) && !p.is_featured
        ).slice(0, 5);

    const handleSaveTitle = async () => {
        setSavingTitle(true);
        const result = await updateSetting('top_sellers_title', title);
        setSavingTitle(false);
        if (result.success) {
            setTitleSaved(true);
            setTimeout(() => setTitleSaved(false), 3000);
        }
    };

    const handleToggleFeatured = async (product) => {
        await updateProductFeatured(product.id, !product.is_featured);
    };

    return (
        <div className="space-y-6">
            {/* Section Title Config */}
            <div className="bg-[#FFF8E7] p-6 rounded-2xl border border-[#c28744]/20 shadow-sm">
                <h3 className="text-[#2C1A0F] font-bold mb-4 flex items-center gap-2">
                    <Save size={18} className="text-[#c28744]" />
                    Título de la Sección
                </h3>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="flex-1 p-3 bg-white border border-[#c28744]/30 rounded-xl font-semibold text-[#2C1A0F] focus:ring-2 focus:ring-[#c28744] outline-none shadow-sm"
                        placeholder="Ej: 🔥 Los Más Vendidos"
                    />
                    <button
                        onClick={handleSaveTitle}
                        disabled={savingTitle || title === settings.top_sellers_title}
                        className="px-6 py-3 bg-[#2C1A0F] text-[#c28744] rounded-xl font-bold hover:bg-[#3E2515] transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                    >
                        {savingTitle ? 'Guardando...' : titleSaved ? <><CheckCircle2 size={18} /> Guardado</> : 'Guardar'}
                    </button>
                </div>
                <p className="text-xs text-[#5A4033]/60 mt-3 italic">
                    Este texto aparecerá en la parte superior de la pantalla principal del kiosco.
                </p>
            </div>

            {/* Featured Products List */}
            <div className="bg-[#FFF8E7] p-6 rounded-2xl border border-[#c28744]/20 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[#2C1A0F] font-bold flex items-center gap-2">
                        <Star size={18} className="text-[#c28744] fill-[#c28744]" />
                        Productos Destacados (Top Sellers)
                    </h3>
                    <span className="text-xs font-bold text-[#c28744] bg-[#c28744]/10 px-3 py-1 rounded-full border border-[#c28744]/20">
                        {featuredProducts.length} seleccionados
                    </span>
                </div>

                {/* Add Product Search */}
                <div className="relative mb-6">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#c28744]/50" />
                    <input
                        type="text"
                        placeholder="Buscar producto para destacar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-4 pl-12 bg-white border border-[#c28744]/30 rounded-2xl font-medium text-[#2C1A0F] focus:ring-2 focus:ring-[#c28744] outline-none shadow-sm"
                    />

                    {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#c28744]/20 rounded-2xl shadow-xl z-20 overflow-hidden divide-y divide-[#c28744]/10 animate-in fade-in slide-in-from-top-2 duration-200">
                            {searchResults.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => {
                                        handleToggleFeatured(p);
                                        setSearchTerm('');
                                    }}
                                    className="w-full flex items-center gap-4 p-4 hover:bg-[#FFF8E7] transition-colors text-left group"
                                >
                                    <img src={p.image || null} className="w-12 h-12 object-cover rounded-lg" alt="" />
                                    <div className="flex-1">
                                        <p className="font-bold text-[#2C1A0F]">{getLocalizedName(p, language)}</p>
                                        <p className="text-xs text-[#5A4033]/60">#{p.id}</p>
                                    </div>
                                    <Star size={20} className="text-[#c28744]/30 group-hover:text-[#c28744] transition-colors" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Current Featured List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {featuredProducts.length === 0 ? (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-[#c28744]/20 rounded-2xl">
                            <Star size={40} className="mx-auto text-[#c28744]/20 mb-3" />
                            <p className="text-[#5A4033]/60 italic">No hay productos destacados. Usa el buscador arriba para añadir.</p>
                        </div>
                    ) : (
                        featuredProducts.map(p => (
                            <div key={p.id} className="flex items-center gap-4 p-4 bg-white border border-[#c28744]/20 rounded-xl shadow-sm group">
                                <img src={p.image || null} className="w-16 h-16 object-cover rounded-lg border border-[#c28744]/10" alt="" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-[#2C1A0F] truncate">{getLocalizedName(p, language)}</p>
                                    <p className="text-xs text-[#c28744] font-bold">{parseFloat(p.price).toFixed(2)} €</p>
                                </div>
                                <button
                                    onClick={() => handleToggleFeatured(p)}
                                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Quitar de destacados"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminTopSellers;
