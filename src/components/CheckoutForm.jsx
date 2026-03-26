import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Loader2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const CheckoutForm = ({ onPaymentSuccess, onCancel, total }) => {
    const stripe = useStripe();
    const elements = useElements();
    const { t } = useLanguage();

    const [message, setMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsLoading(true);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Return URL is not strictly needed for most kiosk flows if we handle the response here
                // but Stripe requires it for some payment methods.
                return_url: window.location.origin,
            },
            redirect: 'if_required',
        });

        if (error) {
            if (error.type === "card_error" || error.type === "validation_error") {
                setMessage(error.message);
            } else {
                setMessage(t('payment_unexpected_error') || 'Ha ocurrido un error inesperado. Inténtalo de nuevo.');
            }
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            onPaymentSuccess();
        }

        setIsLoading(false);
    };

    return (
        <form id="payment-form" onSubmit={handleSubmit} className="w-full">
            <div className="mb-6">
                <PaymentElement id="payment-element" options={{ layout: 'tabs' }} />
            </div>

            {message && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600 text-sm animate-shake">
                    <AlertCircle size={18} />
                    <span>{message}</span>
                </div>
            )}

            <div className="flex flex-col gap-3 mt-8">
                <button
                    disabled={isLoading || !stripe || !elements}
                    id="submit"
                    className="w-full bg-[#1b4d3e] text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-[#153a2f] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            {t('processing') || 'Procesando...'}
                        </>
                    ) : (
                        `${t('pay_now') === 'pay_now' ? 'Pagar ahora' : t('pay_now')} ${parseFloat(total).toFixed(2)}€`
                    )}
                </button>

                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="w-full bg-transparent text-[#2C1A0F] py-3 rounded-2xl font-bold hover:bg-gray-100 transition-all disabled:opacity-50"
                >
                    {t('cancel') || 'Cancelar'}
                </button>
            </div>
        </form>
    );
};

export default CheckoutForm;
