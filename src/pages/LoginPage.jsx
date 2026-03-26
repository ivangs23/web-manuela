import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowLeft, Eye, EyeOff } from 'lucide-react';


const getIpc = () => {
    try {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            return ipcRenderer;
        }
    } catch (_) {}
    return null;
};

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            navigate('/admin');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#12100B] flex items-center justify-center p-4">
            <div className="bg-[#FFF8E7] p-8 rounded-2xl shadow-xl w-full max-w-md border border-[#c28744]/20 relative">
                <Link to="/" className="absolute top-6 left-6 text-[#5A4033] hover:text-[#c28744] transition-colors">
                    <ArrowLeft size={24} />
                </Link>

                <div className="text-center mb-8 pt-4">
                    <div className="bg-[#c28744]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-[#c28744]">
                        <Lock size={32} />
                    </div>
                    <h1 className="text-2xl font-serif font-black text-[#2C1A0F]">Acceso Admin</h1>
                    <p className="text-[#5A4033] text-sm mt-2">Inicia sesión para gestionar el kiosco</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm flex items-center gap-2 border border-red-100">
                        ⚠️ {error === 'Invalid login credentials' ? 'Credenciales incorrectas' : error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-[#2C1A0F] mb-2">Correo Electrónico</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#c28744]" size={20} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={() => {
                                    const ipc = getIpc();
                                    if (ipc) ipc.send('APP:SHOW_KEYBOARD');
                                }}
                                className="w-full pl-10 pr-4 py-3 border border-[#c28744]/30 bg-white rounded-xl focus:ring-2 focus:ring-[#c28744] outline-none transition-all"
                                placeholder="admin@kiosco.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-[#2C1A0F] mb-2">Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#c28744]" size={20} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => {
                                    const ipc = getIpc();
                                    if (ipc) ipc.send('APP:SHOW_KEYBOARD');
                                }}
                                className="w-full pl-10 pr-12 py-3 border border-[#c28744]/30 bg-white rounded-xl focus:ring-2 focus:ring-[#c28744] outline-none transition-all"
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(prev => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c28744] hover:text-[#2C1A0F] transition-colors"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#2C1A0F] hover:bg-[#3E2515] text-[#c28744] font-bold py-4 rounded-xl shadow-lg shadow-[#c28744]/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed border border-[#c28744]/20"
                    >
                        {loading ? 'Entrando...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-400">Panel de Control Manuela Desayuna v1.0</p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
