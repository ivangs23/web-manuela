import React, { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext(null);

export const useCart = () => {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within a CartProvider');
    return ctx;
};

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    const addToCart = useCallback((product, modifiers = []) => {
        const item = {
            ...product,
            uniqueId: crypto.randomUUID(),
            selectedModifiers: modifiers,
            totalPrice: product.price + modifiers.reduce((acc, mod) => acc + mod.price, 0),
        };
        setCart(prev => [...prev, item]);
        setIsCartOpen(true);
    }, []);

    const removeFromCart = useCallback((uniqueId) => {
        setCart(prev => prev.filter(item => item.uniqueId !== uniqueId));
    }, []);

    const updateCartItem = useCallback((uniqueId, updatedItem) => {
        setCart(prev => prev.map(item => item.uniqueId === uniqueId ? updatedItem : item));
    }, []);

    const clearCart = useCallback(() => {
        setCart([]);
        setIsCartOpen(false);
    }, []);

    const cartTotal = cart.reduce((acc, item) => acc + item.totalPrice, 0);

    return (
        <CartContext.Provider value={{
            cart,
            cartTotal,
            isCartOpen,
            setIsCartOpen,
            addToCart,
            removeFromCart,
            updateCartItem,
            clearCart,
        }}>
            {children}
        </CartContext.Provider>
    );
};
