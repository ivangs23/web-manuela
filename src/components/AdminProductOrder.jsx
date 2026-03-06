import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Save, Check } from 'lucide-react';
import { useProducts, getLocalizedName } from '../context/ProductContext';
import { useLanguage } from '../context/LanguageContext';

/**
 * AdminProductOrder
 * Simple up/down arrow buttons to reorder products within a selected category.
 * Saves order via reorderProducts() which writes order_index to Supabase.
 */
const AdminProductOrder = () => {
    const { products, categories, reorderProducts } = useProducts();
    const { language } = useLanguage();

    const getCategoryOptions = (cats, parentId = null, prefix = '') => {
        let result = [];
        const children = cats
            .filter(c => (c.parent_id || null) === (parentId || null))
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

        for (const child of children) {
            result.push({ id: child.id, name: prefix + (child.icon ? child.icon + ' ' : '') + getLocalizedName(child, language) });
            result = result.concat(getCategoryOptions(cats, child.id, prefix + '\u00A0\u00A0\u00A0\u00A0\u2514 '));
        }
        return result;
    };

    const categoryOptions = React.useMemo(() => getCategoryOptions(categories), [categories, language]);

    const [selectedCategoryId, setSelectedCategoryId] = useState(() => categoryOptions[0]?.id || null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [localOrder, setLocalOrder] = useState(null); // null = use global products

    const categoryProducts = React.useMemo(() => {
        const source = localOrder ?? products;
        if (!selectedCategoryId) return [];
        return source
            .filter(p => p.categoryId === selectedCategoryId)
            .sort((a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999));
    }, [selectedCategoryId, localOrder, products]);

    const handleCategoryChange = (catId) => {
        setSelectedCategoryId(catId);
        setLocalOrder(null);
        setSaved(false);
    };

    const move = (index, direction) => {
        const newList = [...categoryProducts];
        const swapIndex = index + direction;
        if (swapIndex < 0 || swapIndex >= newList.length) return;

        // Swap items
        [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];

        // Assign new order_index values (multiples of 10)
        const reindexed = newList.map((p, i) => ({ ...p, order_index: i * 10 }));

        // Apply to all products
        const source = localOrder ?? products;
        const idMap = new Map(reindexed.map(p => [p.id, p]));
        setLocalOrder(source.map(p => idMap.has(p.id) ? idMap.get(p.id) : p));
    };

    const handleSave = async () => {
        if (!localOrder) return;
        setSaving(true);
        const updates = categoryProducts.map((p, i) => ({ id: p.id, order_index: i * 10 }));
        await reorderProducts(updates);
        setSaving(false);
        setSaved(true);
        setLocalOrder(null);
        setTimeout(() => setSaved(false), 2500);
    };

    return (
        <div className="space-y-4">
            {/* Category Selector + Save Button */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <select
                        value={selectedCategoryId || ''}
                        onChange={e => handleCategoryChange(e.target.value)}
                        className="w-full appearance-none p-3 pr-10 bg-white border border-[#c28744]/30 rounded-xl font-semibold text-[#2C1A0F] focus:ring-2 focus:ring-[#c28744] outline-none shadow-sm"
                    >
                        {categoryOptions.map(cat => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c28744] pointer-events-none" />
                </div>

                {localOrder && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-3 bg-[#2C1A0F] text-[#c28744] rounded-xl font-bold hover:bg-[#3E2515] transition-all shadow-md disabled:opacity-60"
                    >
                        {saving ? (
                            <><div className="w-4 h-4 border-2 border-[#c28744] border-t-transparent rounded-full animate-spin" /> Guardando...</>
                        ) : (
                            <><Save size={16} /> Guardar Orden</>
                        )}
                    </button>
                )}
                {saved && !localOrder && (
                    <span className="flex items-center gap-1 text-green-600 font-semibold text-sm">
                        <Check size={14} /> ¡Guardado en Supabase!
                    </span>
                )}
            </div>

            {/* Product List with Up/Down Buttons */}
            {categoryProducts.length === 0 ? (
                <div className="text-center py-12 text-[#5A4033]/60 italic">
                    No hay productos en esta categoría
                </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-xs text-[#5A4033]/60 font-medium uppercase tracking-wide px-1">
                        {categoryProducts.length} productos · usa ↑↓ para reordenar
                    </p>
                    {categoryProducts.map((product, index) => (
                        <div
                            key={product.id}
                            className="flex items-center gap-3 bg-white border border-[#c28744]/20 rounded-xl p-3 shadow-sm transition-all"
                        >
                            {/* Position Number */}
                            <span className="w-7 h-7 flex items-center justify-center bg-[#c28744]/10 text-[#c28744] text-xs font-bold rounded-lg flex-shrink-0">
                                {index + 1}
                            </span>

                            {/* Up / Down Buttons */}
                            <div className="flex flex-col gap-0.5 flex-shrink-0">
                                <button
                                    onClick={() => move(index, -1)}
                                    disabled={index === 0}
                                    className="p-1 rounded-md bg-[#c28744]/10 hover:bg-[#c28744] hover:text-white text-[#c28744] transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                                    title="Subir"
                                >
                                    <ChevronUp size={16} />
                                </button>
                                <button
                                    onClick={() => move(index, 1)}
                                    disabled={index === categoryProducts.length - 1}
                                    className="p-1 rounded-md bg-[#c28744]/10 hover:bg-[#c28744] hover:text-white text-[#c28744] transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                                    title="Bajar"
                                >
                                    <ChevronDown size={16} />
                                </button>
                            </div>

                            {/* Product Image */}
                            {product.image ? (
                                <img
                                    src={product.image || null}
                                    alt={product.name}
                                    className="w-10 h-10 rounded-lg object-cover border border-[#c28744]/20 flex-shrink-0"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-lg bg-[#FFF8E7] flex items-center justify-center text-xl flex-shrink-0">
                                    🍽️
                                </div>
                            )}

                            {/* Name + Price */}
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-[#2C1A0F] truncate">{product.name}</p>
                                <p className="text-xs text-[#5A4033]">{parseFloat(product.price).toFixed(2)} €</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminProductOrder;
