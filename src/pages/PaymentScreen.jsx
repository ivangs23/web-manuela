import React, { useEffect, useState } from 'react';
import { CreditCard, CheckCircle, XCircle, ChevronLeft, Loader2, AlertTriangle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import CheckoutForm from '../components/CheckoutForm';

// Initialize Stripe outside of component to avoid recreation
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const PaymentScreen = ({ total, cart, orderNumber, orderType, onPaymentSuccess, onCancel }) => {
    const { t } = useLanguage();
    const [status, setStatus] = useState('initializing'); // initializing, ready, success, error
    const [clientSecret, setClientSecret] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const initializePayment = React.useCallback(async () => {
        try {
            setStatus('initializing');
            setErrorMessage('');

            const { data, error } = await supabase.functions.invoke('create-payment-intent', {
                body: {
                    amount: total,
                    currency: 'eur',
                    orderDetails: {
                        orderNumber,
                        orderType
                    }
                }
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            setClientSecret(data.clientSecret);
            setStatus('ready');
        } catch (err) {
            console.error("Error creating payment intent:", err);
            setStatus('error');
            setErrorMessage(err.message || 'Error al iniciar el pago');
        }
    }, [total, orderNumber, orderType]);

    useEffect(() => {
        if (total > 0) {
            initializePayment();
        }
    }, [initializePayment]);

    const appearance = {
        theme: 'stripe',
        variables: {
            colorPrimary: '#1b4d3e',
            colorBackground: '#ffffff',
            colorText: '#2C1A0F',
            borderRadius: '12px',
        },
    };

    const options = {
        clientSecret,
        appearance,
    };

    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-[#F9F7F2] p-8 relative animate-fade-in">
            {status !== 'success' && (
                <button
                    onClick={onCancel}
                    className="absolute top-8 left-8 flex items-center gap-2 text-[#2C1A0F] font-bold hover:text-[#c28744] transition-colors"
                >
                    <ChevronLeft size={24} />
                    {t('cancel') || 'Cancelar'}
                </button>
            )}

            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center border-2 border-[#c28744]/10">
                <div className="text-center mb-8">
                    <h2 className="text-4xl font-black text-[#2C1A0F] mb-1">{parseFloat(total || 0).toFixed(2)}€</h2>
                    <p className="text-gray-500 font-medium">
                        {orderType === 'eat-in' ? `Mesa ${orderNumber ?? '---'}` : `${t('order') || 'Pedido'} #${orderNumber ?? '---'}`}
                    </p>
                </div>

                {status === 'initializing' ? (
                    <div className="flex flex-col items-center gap-4 py-12">
                        <Loader2 size={48} className="text-[#c28744] animate-spin" />
                        <p className="text-[#2C1A0F] font-bold">{t('payment_initializing') || 'Iniciando pasarela de pago...'}</p>
                    </div>
                ) : status === 'ready' && clientSecret ? (
                    <div className="w-full animate-fade-in">
                        <Elements options={options} stripe={stripePromise}>
                            <CheckoutForm
                                total={total}
                                onPaymentSuccess={() => {
                                    setStatus('success');
                                    setTimeout(onPaymentSuccess, 2000);
                                }}
                                onCancel={onCancel}
                            />
                        </Elements>
                    </div>
                ) : status === 'success' ? (
                    <div className="flex flex-col items-center gap-4 py-12 animate-bounce-short">
                        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
                            <CheckCircle size={48} className="text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-green-600">
                            {t('payment_success') || '¡Pago completado!'}
                        </h3>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 py-12 text-center">
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                            <AlertTriangle size={48} className="text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-red-600">
                            {t('error') || 'Error'}
                        </h3>
                        <p className="text-gray-500 text-sm">{errorMessage}</p>
                        <button
                            onClick={initializePayment}
                            className="mt-4 px-6 py-2 bg-[#2C1A0F] text-white rounded-xl font-bold"
                        >
                            {t('payment_retry') || 'Reintentar'}
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-8 flex items-center gap-2 text-gray-400 text-sm">
                <CreditCard size={16} />
                <span>Pagos seguros procesados por Stripe</span>
            </div>
        </div>
    );
};

export default PaymentScreen;
