import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * ConfirmModal — reemplaza window.confirm() con un modal no bloqueante.
 *
 * Uso:
 *   const [confirmState, setConfirmState] = useState(null);
 *
 *   // Abrir:
 *   setConfirmState({ message: '¿Eliminar?', onConfirm: () => doDelete(id) });
 *
 *   // En el JSX:
 *   <ConfirmModal state={confirmState} onClose={() => setConfirmState(null)} />
 */
const ConfirmModal = ({ state, onClose }) => {
    if (!state) return null;

    const { message, title = '¿Estás seguro?', confirmLabel = 'Eliminar', confirmStyle = 'danger' } = state;

    const handleConfirm = () => {
        state.onConfirm?.();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Dialog */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                >
                    <X size={18} />
                </button>

                <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertTriangle size={28} className="text-red-500" />
                    </div>

                    <div>
                        <h3 className="text-lg font-black text-[#2C1A0F] mb-1">{title}</h3>
                        <p className="text-[#5A4033]/70 text-sm leading-relaxed">{message}</p>
                    </div>

                    <div className="flex gap-3 w-full mt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                                confirmStyle === 'danger'
                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                    : 'bg-[#c28744] hover:bg-[#a06f30] text-white'
                            }`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
