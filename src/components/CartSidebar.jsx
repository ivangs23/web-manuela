import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, ChevronRight, Edit2 } from 'lucide-react';
import ProductDetail from './ProductDetail';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';

// CartSidebar ahora lee del CartContext directamente — sin prop drilling.
// Recibe solo `orderInfo` (tipo y número de mesa/pedido) desde KioskFlow.
const CartSidebar = ({ orderInfo, onCheckout }) => {
    const { t } = useLanguage();
    const { cart, cartTotal, isCartOpen, setIsCartOpen, removeFromCart, updateCartItem } = useCart();
    const [editingItem, setEditingItem] = useState(null);

    const handleSaveEdit = (product, modifiers) => {
        const updatedItem = {
            ...editingItem,
            selectedModifiers: modifiers,
            totalPrice: product.price + modifiers.reduce((acc, mod) => acc + mod.price, 0)
        };
        updateCartItem(editingItem.uniqueId, updatedItem);
        setEditingItem(null);
    };

    if (!isCartOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-[#FFF8E7] z-50 shadow-2xl flex flex-col transform transition-transform duration-300 animate-slide-in-right">
                <div className="p-6 border-b border-[#c28744]/20 flex justify-between items-center bg-[#FFF8E7]">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                            <ShoppingBag className="text-[#c28744]" />
                            <h2 className="text-2xl font-serif font-black text-[#2C1A0F]">{t('your_order')}</h2>
                        </div>
                        {orderInfo && (
                            <span className="text-sm font-bold text-[#c28744] ml-9">
                                {orderInfo.type === 'eat-in'
                                    ? `${t('table') || 'Mesa'}: ${orderInfo.number}`
                                    : `${t('order') || 'Pedido'} #${orderInfo.number}`
                                }
                            </span>
                        )}
                    </div>

                    <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 opacity-50">
                            <ShoppingBag size={64} strokeWidth={1} />
                            <p className="text-lg font-medium">{t('empty_cart')}</p>
                            <p className="text-sm">{t('empty_cart_msg')}</p>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div key={item.uniqueId} className="bg-white p-4 rounded-xl border border-[#c28744]/20 flex gap-4 group shadow-sm">
                                <img src={item.image || null} alt={item.name} className="w-20 h-20 object-cover rounded-lg" />
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-[#2C1A0F] leading-tight">{item.name}</h3>
                                        <span className="font-bold text-[#c28744]">{parseFloat(item.totalPrice || 0).toFixed(2)}€</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mb-3 space-y-1">
                                        {item.selectedModifiers.map((mod, idx) => (
                                            <div key={idx} className="flex justify-between">
                                                <span>• {mod.name}</span>
                                                {mod.price > 0 && <span>+{parseFloat(mod.price).toFixed(2)}€</span>}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <button
                                            onClick={() => setEditingItem(item)}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-md flex items-center gap-1"
                                        >
                                            <Edit2 size={12} /> {t('edit')}
                                        </button>
                                        <button
                                            onClick={() => removeFromCart(item.uniqueId)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {cart.length > 0 && (
                    <div className="p-6 bg-[#FFF8E7] border-t border-[#c28744]/20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-[#5A4033] font-medium">{t('total')}</span>
                            <span className="text-3xl font-black text-[#2C1A0F]">{parseFloat(cartTotal || 0).toFixed(2)}€</span>
                        </div>

                        <button
                            onClick={onCheckout}
                            className="w-full bg-[#2C1A0F] text-[#c28744] py-4 rounded-xl font-bold text-lg hover:bg-[#3E2515] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#c28744]/20 flex items-center justify-center gap-2 border border-[#c28744]/20"
                        >
                            {t('pay')} <ChevronRight />
                        </button>
                    </div>
                )}
            </div>

            {/* Modal de Edición */}
            {editingItem && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingItem(null)}></div>
                    <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#FFF8E7] rounded-3xl shadow-2xl animate-fade-in-up">
                        <button
                            onClick={() => setEditingItem(null)}
                            className="absolute top-4 right-4 z-10 p-2 bg-white/80 backdrop-blur rounded-full hover:bg-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                        <ProductDetail
                            product={editingItem}
                            onClose={() => setEditingItem(null)}
                            onAddToCart={(product, modifiers) => handleSaveEdit(product, modifiers)}
                            initialModifiers={editingItem.selectedModifiers}
                        />
                    </div>
                </div>
            )}
        </>
    );
};

export default CartSidebar;
