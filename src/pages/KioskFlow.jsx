import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, ShoppingBag, ChevronLeft, Settings } from 'lucide-react';
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
import { supabase } from '../lib/supabase';

const getDefaultTimeout = () => {
    const saved = localStorage.getItem('screensaver_timeout');
    return saved ? parseInt(saved, 10) : 60000; // Default 1 min
};

const detectTableFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    let table = params.get('mesa') || params.get('table');
    if (!table) {
        const pathMatch = window.location.pathname.match(/\/mesa=(\d+)/i);
        if (pathMatch) table = pathMatch[1];
    }
    if (!table) {
        const hashMatch = window.location.hash.match(/mesa=(\d+)/i);
        if (hashMatch) table = hashMatch[1];
    }
    return table || null;
};

const KioskFlow = () => {
    const navigate = useNavigate();
    // tableFromQR: mesa detectada en la URL al cargar (QR). Null = acceso directo.
    const tableFromQR = React.useRef(detectTableFromUrl());
    const [step, setStep] = useState(tableFromQR.current ? 'welcome' : 'table_select');
    const [orderType] = useState('eat-in');
    const [tableNumber, setTableNumber] = useState(tableFromQR.current || '');
    const [tableInput, setTableInput] = useState('');
    const [orderNumber, setOrderNumber] = useState(null);
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [showScreensaver, setShowScreensaver] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isRestaurantOpen, setIsRestaurantOpen] = useState(true); // Default open until checked
    const [isCheckingStatus, setIsCheckingStatus] = useState(true); // Loading state for status
    const [saveOrderError, setSaveOrderError] = useState(false);
    const { t } = useLanguage();

    // Welcome Loading State Tracker
    const [welcomeLoadedCount, setWelcomeLoadedCount] = useState(0);
    const expectedWelcomeImages = 2; // 1 for the background tracker, 1 for the logo
    const isWelcomeReady = welcomeLoadedCount >= expectedWelcomeImages;

    const handleWelcomeLoad = () => {
        setWelcomeLoadedCount(prev => prev + 1);
    };

    // Fetch initial status and subscribe to changes
    React.useEffect(() => {
        const fetchStatus = async () => {
            try {
                const { data, error } = await supabase
                    .from('configuracion')
                    .select('restaurante_abierto')
                    .eq('id', 1)
                    .single();
                
                if (error) {
                    console.error("Error fetching restaurant status:", error);
                } else if (data) {
                    setIsRestaurantOpen(data.restaurante_abierto);
                }
            } catch (err) {
                console.error("Exception fetching restaurant status:", err);
            } finally {
                setIsCheckingStatus(false);
            }
        };

        fetchStatus();

        // Subscribe to real-time changes
        const subscription = supabase
            .channel('configuracion_changes')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'configuracion', filter: 'id=eq.1' }, (payload) => {
                console.log('Restaurant status changed:', payload.new.restaurante_abierto);
                setIsRestaurantOpen(payload.new.restaurante_abierto);
                
                // If it closed and we are in payment or menu, maybe kick them to welcome? 
                // For now just the overlay is enough as it blocks everything.
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    // Don't trigger screensaver during payment (would interrupt the transaction)
    const timerEnabled = step !== 'payment';

    const changeStep = (newStep, callback) => {
        if (callback) callback();
        setStep(newStep);
    };

    const handleIdle = () => {
        setCart([]);
        setOrderNumber(null);
        setIsCartOpen(false);
        setShowScreensaver(true);
        if (tableFromQR.current) {
            // Acceso por QR: volver a bienvenida con la mesa fija del QR
            setStep('welcome');
        } else {
            // Acceso directo: volver a pedir la mesa
            setTableNumber('');
            setTableInput('');
            setStep('table_select');
        }
    };

    const currentTimeout = getDefaultTimeout();
    useInactivityTimer(handleIdle, currentTimeout, timerEnabled);

    const handleScreensaverDismiss = () => {
        setShowScreensaver(false);
    };

    const addToCart = React.useCallback((product, modifiers = []) => {
        const cartItem = {
            ...product,
            uniqueId: crypto.randomUUID(),
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

    const handlePaymentSuccess = async () => {
        // Bloquear temporalmente UI mientras guardamos en bdd
        setIsTransitioning(true);
        setSaveOrderError(false);

        try {
            // Guardar pedido en Supabase
            // Si es 'eat-in' usamos el número de mesa como número de pedido para la BDD
            const finalOrderNumber = orderType === 'take-out'
                ? orderNumber.toString()
                : `MESA-${tableNumber}`;

            const { error } = await supabase.from('pedidos').insert([
                {
                    order_number: finalOrderNumber,
                    order_type: orderType,
                    table_number: orderType === 'eat-in' ? tableNumber.toString() : null,
                    total_amount: cartTotal,
                    items: cart,
                    status: 'pending'
                }
            ]);

            if (error) {
                console.error("🚨 Error guardando el pedido en Supabase:", error);
                setSaveOrderError(true);
                setIsTransitioning(false);
                return; // No avanzar — el pedido no se guardó
            }

            // Solo si el guardado fue exitoso, completar el flujo
            if (orderType === 'take-out') {
                commitOrderNumber();
            }
            setCart([]);
            setOrderNumber(null);
            changeStep('welcome');
        } catch (e) {
            console.error("Excepción al guardar pedido:", e);
            setSaveOrderError(true);
        } finally {
            setIsTransitioning(false);
        }
    };

    const handlePaymentCancel = () => {
        setIsCartOpen(true);
        changeStep('menu');
    };

    return (
        <>
            {/* ── Cerrado overlay (Blocks Everything) ──────────────────────── */}
            {!isCheckingStatus && !isRestaurantOpen && (
                <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#F9F7F2]">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `url(${logo})`, backgroundSize: '100px', backgroundRepeat: 'repeat' }} />
                    
                    <div className="relative z-10 flex flex-col items-center text-center px-6 animate-fade-in-up">
                        <div className="w-32 h-32 md:w-48 md:h-48 mb-8 relative">
                           <div className="absolute inset-0 bg-[#d32f2f]/20 rounded-full animate-ping"></div>
                           <div className="relative bg-[#d32f2f] text-white w-full h-full rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
                               <ChefHat size={64} className="md:w-24 md:h-24" />
                           </div>
                        </div>
                        
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-6 text-[#2C1A0F] drop-shadow-md">
                            {t('closed_title') || 'Cocina Cerrada'}
                        </h1>
                        <p className="text-xl md:text-3xl text-[#2C1A0F]/80 font-medium max-w-2xl leading-relaxed">
                            {t('closed_message') || 'En este momento nuestra cocina no admite más pedidos. ¡Disculpa las molestias y vuelve pronto!'}
                        </p>

                        {/* Admin Bypass Button — goes to /login to force re-authentication */}
                        <button
                            onClick={() => navigate('/login')}
                            className="mt-12 text-[#2C1A0F]/30 hover:text-[#c28744] transition-colors text-sm font-bold uppercase tracking-widest flex items-center gap-2"
                        >
                            <Settings size={16} />
                            {t('admin_access') || 'Acceso Administración'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Screensaver overlay ─────────────────────────────── */}
            {showScreensaver && (
                <ScreenSaver onDismiss={handleScreensaverDismiss} />
            )}

            {/* ── Selección de mesa (acceso directo sin QR) ────────── */}
            {step === 'table_select' && (
                <div
                    className="h-screen w-full relative overflow-hidden bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center"
                    style={{ backgroundImage: `url(${saver})` }}
                >
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm" />

                    {/* Language Switcher */}
                    <div className="absolute top-8 right-8 z-20">
                        <LanguageSwitcher />
                    </div>

                    <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-xs px-4 animate-fade-in-up">
                        {/* Logo */}
                        <img src={logo} alt="Logo" className="w-48 max-h-[12vh] object-contain drop-shadow-xl" />

                        {/* Título */}
                        <div className="text-center">
                            <p className="text-2xl font-black text-[#2C1A0F] uppercase tracking-wide">
                                {t('enter_table_number') || '¿En qué mesa estás?'}
                            </p>
                        </div>

                        {/* Display del número introducido */}
                        <div className="w-full bg-white border-2 border-[#c28744]/40 rounded-2xl px-6 py-4 text-center shadow-inner">
                            <span className={`text-5xl font-black tracking-widest ${tableInput ? 'text-[#2C1A0F]' : 'text-[#c28744]/30'}`}>
                                {tableInput || '—'}
                            </span>
                        </div>

                        {/* Numpad */}
                        <div className="grid grid-cols-3 gap-3 w-full">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                                <button
                                    key={n}
                                    onClick={() => setTableInput(prev => prev.length < 3 ? prev + n : prev)}
                                    className="bg-white border-2 border-[#c28744]/20 rounded-2xl py-4 text-2xl font-black text-[#2C1A0F] shadow-sm active:scale-95 transition-all hover:border-[#c28744] hover:bg-[#FFF8E7]"
                                >
                                    {n}
                                </button>
                            ))}
                            {/* Borrar */}
                            <button
                                onClick={() => setTableInput(prev => prev.slice(0, -1))}
                                className="bg-white border-2 border-[#c28744]/20 rounded-2xl py-4 text-xl font-black text-[#5A4033] shadow-sm active:scale-95 transition-all hover:border-red-300 hover:bg-red-50"
                            >
                                ⌫
                            </button>
                            {/* 0 */}
                            <button
                                onClick={() => setTableInput(prev => prev.length < 3 ? prev + '0' : prev)}
                                className="bg-white border-2 border-[#c28744]/20 rounded-2xl py-4 text-2xl font-black text-[#2C1A0F] shadow-sm active:scale-95 transition-all hover:border-[#c28744] hover:bg-[#FFF8E7]"
                            >
                                0
                            </button>
                            {/* Confirmar */}
                            <button
                                onClick={() => {
                                    if (!tableInput) return;
                                    setTableNumber(tableInput);
                                    setTableInput('');
                                    setStep('welcome');
                                }}
                                disabled={!tableInput}
                                className="bg-[#2C1A0F] border-2 border-[#c28744]/30 rounded-2xl py-4 text-xl font-black text-[#c28744] shadow-lg active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#3E2515]"
                            >
                                ✓
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Welcome ─────────────────────────────────────────── */}
            {step === 'welcome' && (
                <div
                    onClick={() => {
                        if (orderType === 'take-out' && orderNumber === null) {
                            setOrderNumber(peekNextOrderNumber());
                        }
                        changeStep('menu');
                    }}
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

                        {/* Main Content */}
                        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-[#2C1A0F] animate-fade-in-up px-4 text-center -mt-8">
                            {/* Logo */}
                            <div className="mb-4 md:mb-8 flex justify-center items-center w-full px-4">
                                <img src={logo} alt="Logo" className="w-[90%] max-w-[800px] h-auto max-h-[15vh] md:max-h-[25vh] object-contain drop-shadow-2xl mx-auto" onLoad={handleWelcomeLoad} onError={handleWelcomeLoad} />
                            </div>

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
                <>
                    {saveOrderError && (
                        <div className="fixed top-0 left-0 right-0 z-[9998] bg-red-600 text-white text-center py-4 px-6 font-bold text-lg shadow-xl">
                            ⚠️ Tu pago fue procesado pero ocurrió un error al registrar el pedido. Por favor, avisa al personal.
                        </div>
                    )}
                    <PaymentScreen
                        total={cartTotal}
                        cart={cart}
                        orderNumber={orderType === 'eat-in' ? tableNumber : orderNumber}
                        orderType={orderType}
                        onPaymentSuccess={handlePaymentSuccess}
                        onCancel={handlePaymentCancel}
                    />
                </>
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
                                                {t('order') || 'Pedido'} #{orderNumber ?? '---'}
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
