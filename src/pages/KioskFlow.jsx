import React, { useState } from 'react';
import { ChefHat, ShoppingBag, ChevronLeft } from 'lucide-react';
import logo from '../assets/logo.png';
import saver from '../assets/saver.png';
import MenuPage from './MenuPage';
import PaymentScreen from './PaymentScreen';
import ScreenSaver from './ScreenSaver';
import CartSidebar from '../components/CartSidebar';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { peekNextOrderNumber, commitOrderNumber } from '../utils/orderNumberUtils';
import useInactivityTimer from '../hooks/useInactivityTimer';

const getDefaultTimeout = () => {
    const saved = localStorage.getItem('screensaver_timeout');
    return saved ? parseInt(saved, 10) : 60000; // Default 1 min
};

const KioskFlow = () => {
    const [step, setStep] = useState('welcome'); // welcome, menu, payment
    const [orderType, setOrderType] = useState('eat-in'); // default to 'eat-in'
    const [tableNumber, setTableNumber] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        let table = params.get('mesa') || params.get('table');

        // Check if pathname contains mesa=XX (e.g. /mesa=21)
        if (!table) {
            const pathMatch = window.location.pathname.match(/\/mesa=(\d+)/i);
            if (pathMatch) {
                table = pathMatch[1];
            }
        }

        // Check if hash contains mesa=XX (e.g. /#/mesa=21)
        if (!table) {
            const hashMatch = window.location.hash.match(/mesa=(\d+)/i);
            if (hashMatch) {
                table = hashMatch[1];
            }
        }

        return table || '1'; // Default to table 1 if missing
    });
    const [orderNumber, setOrderNumber] = useState(null);
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [showScreensaver, setShowScreensaver] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const { t } = useLanguage();

    // Welcome Loading State Tracker
    const [welcomeLoadedCount, setWelcomeLoadedCount] = useState(0);
    const expectedWelcomeImages = 2; // 1 for the background tracker, 1 for the logo
    const isWelcomeReady = welcomeLoadedCount >= expectedWelcomeImages;

    const handleWelcomeLoad = () => {
        setWelcomeLoadedCount(prev => prev + 1);
    };

    // Don't trigger screensaver during payment (would interrupt the transaction)
    const timerEnabled = step !== 'payment';

    const changeStep = (newStep, callback) => {
        if (callback) callback();
        setStep(newStep);
    };

    const handleIdle = () => {
        // Return to welcome and reset state immediately
        setStep('welcome');
        setCart([]);
        // Table number remains sticky since it's from the URL parameter
        setOrderNumber(null);
        setIsCartOpen(false);
        // Show screensaver overlay
        setShowScreensaver(true);
    };

    const currentTimeout = getDefaultTimeout();
    useInactivityTimer(handleIdle, currentTimeout, timerEnabled);

    const handleScreensaverDismiss = () => {
        setShowScreensaver(false);
    };

    const addToCart = React.useCallback((product, modifiers = []) => {
        const cartItem = {
            ...product,
            uniqueId: Date.now(),
            selectedModifiers: modifiers,
            totalPrice: product.price + modifiers.reduce((acc, mod) => acc + mod.price, 0)
        };
        setCart(prev => [...prev, cartItem]);
        setIsCartOpen(true);
    }, []);

    const removeFromCart = React.useCallback((uniqueId) => {
        setCart(prev => prev.filter(item => item.uniqueId !== uniqueId));
    }, []);

    const updateCartItem = React.useCallback((uniqueId, updatedItem) => {
        setCart(prev => prev.map(item => item.uniqueId === uniqueId ? updatedItem : item));
    }, []);

    const cartTotal = cart.reduce((acc, item) => acc + item.totalPrice, 0);


    const handleCheckout = () => {
        setIsCartOpen(false);
        changeStep('payment');
    };

    const handlePaymentSuccess = () => {
        if (orderType === 'take-out') {
            commitOrderNumber();
        }
        setCart([]);
        setOrderNumber(null);
        changeStep('welcome');
    };

    const handlePaymentCancel = () => {
        setIsCartOpen(true);
        changeStep('menu');
    };

    return (
        <>

            {/* ── Screensaver overlay ─────────────────────────────── */}
            {showScreensaver && (
                <ScreenSaver onDismiss={handleScreensaverDismiss} />
            )}

            {/* ── Welcome ─────────────────────────────────────────── */}
            {step === 'welcome' && (
                <div
                    onClick={() => changeStep('menu')}
                    className="h-screen w-full relative cursor-pointer group overflow-hidden bg-cover bg-center bg-no-repeat flex flex-col"
                    style={{ backgroundImage: `url(${saver})` }}
                >
                    {/* Hidden trackers to inform React when visually ready */}
                    <img src={saver} alt="tracker" style={{ display: 'none' }} onLoad={handleWelcomeLoad} onError={handleWelcomeLoad} />

                    {/* Spinner Overlay */}
                    {!isWelcomeReady && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#F9F7F2]/80 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-12 h-12 border-4 border-[#c28744] border-t-[#2C1A0F] rounded-full animate-spin"></div>
                                <span className="text-[#2C1A0F] font-bold tracking-widest uppercase text-sm">Cargando...</span>
                            </div>
                        </div>
                    )}

                    <div className={`absolute inset-0 transition-opacity duration-300 w-full h-full flex flex-col ${isWelcomeReady ? 'opacity-100' : 'opacity-0'}`}>
                        {/* Light Overlay */}
                        <div className="absolute inset-0 bg-white/50" />

                        {/* Language Switcher */}
                        <div className="absolute top-8 right-8 z-20" onClick={e => e.stopPropagation()}>
                            <LanguageSwitcher />
                        </div>

                        {/* Logo */}
                        <div className="w-full p-8 flex justify-center z-10 pt-8 shrink-0">
                            <div className="flex items-center justify-center gap-3 opacity-90">
                                <img src={logo} alt="Logo" className="h-[500px] w-auto object-contain drop-shadow-xl absolute top-100" onLoad={handleWelcomeLoad} onError={handleWelcomeLoad} />
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-[#2C1A0F] animate-fade-in-up px-4 text-center -mt-8">
                            <div className="mb-8 w-28 h-28 rounded-full bg-[#1b4d3e] text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-500 border-4 border-white/30 backdrop-blur-md">
                                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
                                    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
                                    <line x1="6" x2="6" y1="2" y2="4" /><line x1="10" x2="10" y1="2" y2="4" /><line x1="14" x2="14" y1="2" y2="4" />
                                </svg>
                            </div>

                            <h1 className="text-7xl md:text-9xl font-black tracking-tighter uppercase mb-6 drop-shadow-2xl scale-y-110 text-[#2C1A0F]" style={{ textShadow: '0 4px 12px rgba(255,255,255,0.8)' }}>
                                {t('good_morning').split('\n').map((line, i) => (
                                    <span key={i}>{line}{i < t('good_morning').split('\n').length - 1 && <br />}</span>
                                ))}
                            </h1>

                            <div className="flex flex-col items-center gap-4 animate-pulse">
                                <div className="w-16 h-16 rounded-full bg-[#2C1A0F] flex items-center justify-center text-white border-2 border-white/50 shadow-xl">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M8 2v4" /><path d="M12 2v4" /><path d="M16 2v4" />
                                        <rect width="16" height="12" x="4" y="8" rx="2" />
                                        <path d="M8 12h.01" />
                                    </svg>
                                </div>
                                <span className="uppercase tracking-[0.2em] text-sm font-black text-[#2C1A0F] drop-shadow-sm bg-white/60 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/20">
                                    {t('touch_to_start')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {step === 'payment' && (
                <PaymentScreen
                    total={cartTotal}
                    cart={cart}
                    orderNumber={orderType === 'eat-in' ? tableNumber : orderNumber}
                    orderType={orderType}
                    onPaymentSuccess={handlePaymentSuccess}
                    onCancel={handlePaymentCancel}
                />
            )}

            {step === 'menu' && (
                <div className="flex h-screen bg-[#F9F7F2] overflow-hidden relative">
                    <div className="flex-1 flex flex-col h-full overflow-hidden transition-all duration-300">
                        <header className="bg-white border-b border-[#2C1A0F]/10 px-3 py-3 sm:px-8 sm:py-5 flex justify-between items-center z-10 shadow-sm relative shrink-0">
                            <div className="flex items-center gap-2 sm:gap-4 relative z-10 shrink-0">
                                <div className="bg-white px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-[#c28744]/30 shadow-sm flex items-center gap-1 sm:gap-2">
                                    {orderType === 'eat-in' ? (
                                        <div
                                            className="px-1 sm:px-2 py-1 flex items-center gap-1 sm:gap-2 group whitespace-nowrap"
                                            title={t('table')}
                                        >
                                            <span className="text-[#2C1A0F] font-bold text-sm sm:text-lg">
                                                {t('table') || 'Mesa'}: {tableNumber}
                                            </span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#c28744] shrink-0" />
                                        </div>
                                    ) : (
                                        <div
                                            className="px-1 sm:px-2 py-1 flex items-center gap-1 sm:gap-2 group whitespace-nowrap"
                                            title={t('order')}
                                        >
                                            <span className="text-[#2C1A0F] font-bold text-sm sm:text-lg">
                                                {t('order') || 'Pedido'} #{orderNumber}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Center Logo - Bulletproof clipping avoidance */}
                            <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[40%] z-[60] pointer-events-none" style={{ overflow: 'visible' }}>
                                <img src={logo} alt="Logo" className="drop-shadow-sm" style={{ height: '180px', width: 'auto', maxWidth: 'none', objectFit: 'contain' }} />
                            </div>

                            <div className="flex items-center gap-2 sm:gap-6 relative z-10 shrink-0">
                                <LanguageSwitcher />
                                <button
                                    onClick={() => setIsCartOpen(true)}
                                    className="relative bg-[#2C1A0F] text-white p-2 sm:p-3 rounded-xl hover:bg-[#c28744] transition-all hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2 sm:gap-3 shrink-0"
                                >
                                    <span className="font-bold hidden sm:block whitespace-nowrap">{t('your_order')}</span>
                                    <ShoppingBag size={20} className="sm:hidden" />
                                    <ShoppingBag size={24} className="hidden sm:block" />
                                    {cart.length > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-[#d32f2f] text-white text-[10px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center border-2 border-white">
                                            {cart.length}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </header>

                        <main className="flex-1 overflow-y-auto bg-[#F9F7F2]">
                            <MenuPage
                                onAddToCart={addToCart}
                                openCart={() => setIsCartOpen(true)}
                            />
                        </main>
                    </div>

                    <CartSidebar
                        isOpen={isCartOpen}
                        onClose={() => setIsCartOpen(false)}
                        cartItems={cart}
                        onRemoveItem={removeFromCart}
                        onUpdateItem={updateCartItem}
                        total={cartTotal}
                        onCheckout={handleCheckout}
                        orderInfo={{ type: orderType, number: orderType === 'eat-in' ? tableNumber : orderNumber }}
                    />
                </div>
            )}
        </>
    );
};

export default KioskFlow;
