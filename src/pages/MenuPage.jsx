import React, { useState } from 'react';
import { ShoppingCart, ChevronLeft, Info } from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import { getLocalizedName } from '../context/ProductContext';
import ProductCard from '../components/ProductCard';
import ProductDetail from '../components/ProductDetail';
import NutritionModal from '../components/NutritionModal';
import { useLanguage } from '../context/LanguageContext';
import fondo from '../assets/fondo.png';
const MenuPage = ({ onAddToCart, openCart }) => {
    const { products, categories, loading, settings } = useProducts();
    const { t, language } = useLanguage();
    const [activeCategory, setActiveCategory] = useState(null); // Will default to first category or 'all'
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showNutrition, setShowNutrition] = useState(false);
    const [isCategorySwitching, setIsCategorySwitching] = useState(false);

    const changeCategory = (catId) => {
        if (activeCategory === catId) return;
        setActiveCategory(catId);
    };

    if (loading) return (
        <div className="h-full w-full bg-[#F9F7F2] p-4">
            <div className="flex flex-col h-full rounded-t-2xl border border-[#c28744]/10 bg-white overflow-hidden">
                {/* Header skeleton */}
                <div className="p-4 md:p-6 border-b border-[#2C1A0F]/5 flex justify-between items-center">
                    <div className="h-8 w-32 bg-[#c28744]/10 rounded-full animate-pulse" />
                    <div className="h-8 w-28 bg-[#c28744]/10 rounded-full animate-pulse" />
                </div>
                {/* Grid skeleton */}
                <div className="flex-1 p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="rounded-2xl border-2 border-[#c28744]/10 bg-[#FFF8E7] h-40 md:h-64 flex flex-col items-center justify-center gap-4 p-4 animate-pulse">
                            <div className="w-16 h-16 md:w-28 md:h-28 rounded-full bg-[#c28744]/10" />
                            <div className="h-4 w-20 bg-[#c28744]/10 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const currentCategoryName = categories.find(c => c.id === activeCategory)
        ? getLocalizedName(categories.find(c => c.id === activeCategory), language)
        : t('all_products');

    const rootCategories = categories
        .filter(c => !c.parent_id)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    const selectedCategorySubcategories = activeCategory
        ? categories.filter(c => c.parent_id === activeCategory).sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        : [];

    const filteredProducts = (activeCategory
        ? products.filter(p => p.categoryId === activeCategory)
        : products
    ).sort((a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999));

    return (
        <div className="h-full w-full bg-[#F9F7F2] font-sans text-[#2C1A0F] select-none p-4 pb-0">

            {/* Center Column: Content */}
            <div className="flex flex-col overflow-hidden h-full rounded-t-2xl shadow-sm border border-[#c28744]/10 bg-cover bg-center bg-no-repeat relative" >

                {/* Overlay for readability if needed - Light for this theme */}
                <div className="absolute inset-0 bg-white/95 z-0" style={{ backgroundImage: `url(${fondo})` }}></div>

                {/* Content Container */}
                <div className="relative z-10 flex flex-col h-full">

                    {/* Header */}
                    <div className="flex flex-wrap justify-between items-center p-4 md:p-6 border-b border-[#2C1A0F]/5 gap-4">
                        <div className="flex items-center gap-2 md:gap-4 rounded-full bg-white py-1.5 px-3 md:py-2 md:px-4 shadow-sm min-w-0">
                            {activeCategory && (
                                <button
                                    onClick={() => {
                                        const currentCat = categories.find(c => c.id === activeCategory);
                                        // If this is a subcategory, go back to its parent. Otherwise, go to root.
                                        if (currentCat && currentCat.parent_id) {
                                            changeCategory(currentCat.parent_id);
                                        } else {
                                            changeCategory(null);
                                        }
                                    }}
                                    className="p-1.5 md:p-2 rounded-full bg-[#c28744] text-white hover:bg-[#a06d35] transition-colors shadow-md shrink-0"
                                >
                                    <ChevronLeft size={20} className="md:w-6 md:h-6" />
                                </button>
                            )}
                            <h2 className="text-xl md:text-3xl font-serif font-bold text-[#2C1A0F] drop-shadow-sm truncate">
                                {activeCategory ? currentCategoryName : "Menu"}
                            </h2>
                        </div>

                        <div className="flex items-center gap-2 md:gap-4 shrink-0">
                            <button
                                onClick={() => setShowNutrition(true)}
                                className="flex items-center gap-1.5 md:gap-2 bg-[#F0EBE0] hover:bg-[#E0D8CC] text-[#2C1A0F] px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-[#c28744]/20 transition-colors shadow-sm"
                            >
                                <Info size={16} className="text-[#c28744] md:w-5 md:h-5" />
                                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wide">{t('nutritional_info')}</span>
                            </button>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-hide scroll-contain relative transform-gpu will-change-scroll">
                        <div className="h-full">
                            {!activeCategory ? (
                                /* Category Grid View */
                                <div className="flex flex-col h-full">
                                    {/* Category Grid View */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6 content-start flex-1 overflow-y-auto scrollbar-hide bg-cover bg-center bg-no-repeat rounded-xl p-3 md:p-4 border border-[#c28744]/10 transform-gpu will-change-scroll" style={{ backgroundImage: `url(${fondo})` }}>
                                        {rootCategories.map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => changeCategory(cat.id)}
                                                className="
                                                group relative overflow-hidden rounded-2xl md:rounded-3xl border-2 border-[#c28744]/30
                                                bg-white hover:bg-[#FFF8E7] transition-all duration-300
                                                flex flex-col items-center justify-center gap-2 p-2 md:gap-3 md:p-6 h-[140px] sm:h-40 md:h-64
                                                shadow-md hover:shadow-xl hover:scale-105 hover:border-[#c28744]
                                            "
                                            >
                                                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-36 md:h-36 shrink-0 rounded-full bg-[#FFF8E7] text-[#c28744] group-hover:bg-[#c28744] group-hover:text-white transition-all duration-300 shadow-inner flex items-center justify-center overflow-hidden">
                                                    {cat.image ? (
                                                        <img
                                                            src={cat.image}
                                                            alt={getLocalizedName(cat, language)}
                                                            loading="lazy"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-3xl sm:text-4xl md:text-7xl filter drop-shadow-sm">{cat.icon}</span>
                                                    )}
                                                </div>
                                                <span className="text-sm sm:text-base md:text-2xl font-bold uppercase tracking-widest text-[#2C1A0F] group-hover:text-[#c28744] transition-colors text-center leading-tight">
                                                    {getLocalizedName(cat, language)}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                /* Subcategory or Product Grid View */
                                <div className="flex flex-col gap-6 h-full">
                                    {selectedCategorySubcategories.length > 0 && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6 content-start flex-1 bg-cover bg-center bg-no-repeat rounded-xl p-3 md:p-4 border border-[#c28744]/10" style={{ backgroundImage: `url(${fondo})` }}>
                                            {selectedCategorySubcategories.map(cat => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => changeCategory(cat.id)}
                                                    className="
                                                    group relative overflow-hidden rounded-2xl md:rounded-3xl border-2 border-[#c28744]/30
                                                    bg-white hover:bg-[#FFF8E7] transition-all duration-300
                                                    flex flex-col items-center justify-center gap-2 p-2 md:gap-3 md:p-6 h-[140px] sm:h-40 md:h-64
                                                    shadow-md hover:shadow-xl hover:scale-105 hover:border-[#c28744]
                                                "
                                                >
                                                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-36 md:h-36 shrink-0 rounded-full bg-[#FFF8E7] text-[#c28744] group-hover:bg-[#c28744] group-hover:text-white transition-all duration-300 shadow-inner flex items-center justify-center overflow-hidden">
                                                        {cat.image ? (
                                                            <img
                                                                src={cat.image}
                                                                alt={getLocalizedName(cat, language)}
                                                                loading="lazy"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <span className="text-3xl sm:text-4xl md:text-7xl filter drop-shadow-sm">{cat.icon}</span>
                                                        )}
                                                    </div>
                                                    <span className="text-sm sm:text-base md:text-2xl font-bold uppercase tracking-widest text-[#2C1A0F] group-hover:text-[#c28744] transition-colors text-center leading-tight">
                                                        {getLocalizedName(cat, language)}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {filteredProducts.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                                            {filteredProducts.map(product => (
                                                <ProductCard
                                                    key={product.id}
                                                    product={product}
                                                    onSelect={setSelectedProduct}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>


            {/* Product Detail Modal */}
            {
                selectedProduct && (
                    <ProductDetail
                        product={selectedProduct}
                        onClose={() => setSelectedProduct(null)}
                        onAddToCart={(product, modifiers, finalPrice) => {
                            onAddToCart(product, modifiers); // Standardized signature
                            setSelectedProduct(null);
                        }}
                    />
                )
            }

            {/* Nutrition Modal */}
            {showNutrition && <NutritionModal onClose={() => setShowNutrition(false)} />}
        </div >
    );
};

export default MenuPage;
