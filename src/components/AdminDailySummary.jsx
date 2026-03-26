import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, TrendingUp, ShoppingBag, Users, CheckCircle, Clock, ChevronDown, ChevronUp, AlertTriangle, LockOpen, Lock, History } from 'lucide-react';

const fmt = (n) => parseFloat(n || 0).toFixed(2);
const timeStr = () => new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
const today = () => new Date().toISOString().slice(0, 10);

const AdminDailySummary = () => {
    const [selectedDate, setSelectedDate] = useState(today);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [closures, setClosures] = useState([]);
    const [closuresLoading, setClosuresLoading] = useState(false);
    const [confirming, setConfirming] = useState(null); // 'close' | 'reopen' | null
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) setCurrentUser(data.user);
        });
    }, []);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        setErrorMsg('');
        const { data, error } = await supabase
            .from('pedidos')
            .select('*')
            .gte('created_at', `${selectedDate}T00:00:00`)
            .lte('created_at', `${selectedDate}T23:59:59`)
            .order('created_at', { ascending: false });
        if (error) setErrorMsg('Error al cargar los pedidos: ' + error.message);
        else setOrders(data || []);
        setLoading(false);
    }, [selectedDate]);

    const fetchClosures = useCallback(async () => {
        setClosuresLoading(true);
        const { data } = await supabase
            .from('cierres_dia')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(15);
        setClosures(data || []);
        setClosuresLoading(false);
    }, []);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);
    useEffect(() => { fetchClosures(); }, [fetchClosures]);

    // Calculos
    const totalAmount = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const eatInOrders = orders.filter(o => o.order_type === 'eat-in');
    const takeOutOrders = orders.filter(o => o.order_type === 'take-out');
    const eatInTotal = eatInOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const takeOutTotal = takeOutOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

    const isToday = selectedDate === today();
    // Cierre activo del dia seleccionado (ultimo)
    const todayClosure = closures.find(c => c.fecha === selectedDate);
    const isClosed = todayClosure?.estado === 'cerrado';
    const isReopened = todayClosure?.estado === 'reabierto';

    // --- Cerrar dia ---
    const handleCerrar = async () => {
        if (confirming !== 'close') { setConfirming('close'); return; }
        setSaving(true);
        setErrorMsg('');
        const evento = { accion: 'cierre', usuario: currentUser?.email || 'desconocido', hora: timeStr(), timestamp: new Date().toISOString() };

        if (todayClosure) {
            // Re-cierre tras reapertura
            const nuevoHistorial = [...(todayClosure.historial || []), evento];
            const { error } = await supabase
                .from('cierres_dia')
                .update({ estado: 'cerrado', historial: nuevoHistorial, total_ventas: totalAmount, num_pedidos: orders.length, num_pedidos_mesa: eatInOrders.length, num_pedidos_llevar: takeOutOrders.length, total_mesa: eatInTotal, total_llevar: takeOutTotal, detalles: orders })
                .eq('id', todayClosure.id);
            if (error) setErrorMsg('Error al registrar el cierre: ' + error.message);
        } else {
            // Primer cierre del dia
            const { error } = await supabase.from('cierres_dia').insert([{
                fecha: selectedDate,
                usuario_email: currentUser?.email || 'desconocido',
                usuario_id: currentUser?.id || null,
                total_ventas: totalAmount,
                num_pedidos: orders.length,
                num_pedidos_mesa: eatInOrders.length,
                num_pedidos_llevar: takeOutOrders.length,
                total_mesa: eatInTotal,
                total_llevar: takeOutTotal,
                detalles: orders,
                estado: 'cerrado',
                historial: [evento],
            }]);
            if (error) setErrorMsg('Error al registrar el cierre: ' + error.message);
        }

        setSaving(false);
        setConfirming(null);
        fetchClosures();
    };

    // --- Reabrir dia ---
    const handleReabrir = async () => {
        if (confirming !== 'reopen') { setConfirming('reopen'); return; }
        setSaving(true);
        setErrorMsg('');
        const evento = { accion: 'reapertura', usuario: currentUser?.email || 'desconocido', hora: timeStr(), timestamp: new Date().toISOString() };
        const nuevoHistorial = [...(todayClosure.historial || []), evento];
        const { error } = await supabase
            .from('cierres_dia')
            .update({ estado: 'reabierto', historial: nuevoHistorial })
            .eq('id', todayClosure.id);
        if (error) setErrorMsg('Error al reabrir el día: ' + error.message);
        setSaving(false);
        setConfirming(null);
        fetchClosures();
    };

    const cancelConfirm = () => setConfirming(null);

    return (
        <div className="max-w-4xl mx-auto w-full space-y-6 pb-8">
            <h2 className="text-xl font-serif font-black text-[#c28744]">Cierre de Día</h2>

            {/* Selector de fecha */}
            <div className="bg-[#1E150A] border border-[#c28744]/20 rounded-2xl p-5 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-[#9A7B6A]">
                    <Calendar size={18} className="text-[#c28744]" />
                    <span className="text-sm font-medium">Fecha de consulta:</span>
                </div>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={e => { setSelectedDate(e.target.value); setConfirming(null); setErrorMsg(''); }}
                    className="bg-[#2C1A0F] border border-[#c28744]/30 text-[#c28744] font-bold text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#c28744]"
                />
                <button
                    onClick={fetchOrders}
                    className="text-xs font-bold px-4 py-2 rounded-lg bg-[#c28744]/20 text-[#c28744] hover:bg-[#c28744]/30 transition-colors"
                >
                    Actualizar
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-[#9A7B6A]">Cargando pedidos...</div>
            ) : (
                <>
                    {/* Tarjetas resumen */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <SummaryCard icon={<TrendingUp size={20} />} label="Total Ventas" value={`${fmt(totalAmount)} €`} highlight />
                        <SummaryCard icon={<ShoppingBag size={20} />} label="Nº Pedidos" value={orders.length} />
                        <SummaryCard icon={<Users size={20} />} label="En Mesa" value={`${eatInOrders.length} · ${fmt(eatInTotal)} €`} />
                        <SummaryCard icon={<ShoppingBag size={20} />} label="Para Llevar" value={`${takeOutOrders.length} · ${fmt(takeOutTotal)} €`} />
                    </div>

                    {/* Panel de acción — solo hoy */}
                    {isToday && (
                        <div className={`border rounded-2xl p-5 transition-colors ${isClosed ? 'bg-red-950/30 border-red-600/30' : isReopened ? 'bg-yellow-950/30 border-yellow-500/30' : 'bg-[#1E150A] border-[#c28744]/20'}`}>

                            {/* Estado actual */}
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex flex-col gap-1">
                                    {isClosed && (
                                        <>
                                            <p className="text-red-400 font-black text-base flex items-center gap-2">
                                                <Lock size={16} /> Día cerrado
                                            </p>
                                            <p className="text-[#9A7B6A] text-xs">
                                                Cerrado por <span className="text-[#c28744]">{todayClosure.usuario_email}</span>
                                                {todayClosure.historial?.length > 0 && ` · ${todayClosure.historial[todayClosure.historial.length - 1].hora}`}
                                            </p>
                                        </>
                                    )}
                                    {isReopened && (
                                        <>
                                            <p className="text-yellow-400 font-black text-base flex items-center gap-2">
                                                <LockOpen size={16} /> Día reabierto
                                            </p>
                                            <p className="text-[#9A7B6A] text-xs">
                                                Reabierto por <span className="text-yellow-400">{todayClosure.historial?.slice(-1)[0]?.usuario}</span>
                                                {` · ${todayClosure.historial?.slice(-1)[0]?.hora}`}
                                            </p>
                                        </>
                                    )}
                                    {!todayClosure && (
                                        <>
                                            <p className="text-[#FFF8E7] font-bold text-base">Registrar Cierre de Día</p>
                                            <p className="text-[#9A7B6A] text-xs">
                                                Se registrará a nombre de <span className="text-[#c28744]">{currentUser?.email || '...'}</span>
                                            </p>
                                        </>
                                    )}
                                </div>

                                {/* Botones según estado */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Botón cerrar (si no está cerrado) */}
                                    {!isClosed && (
                                        confirming === 'close' ? (
                                            <>
                                                <span className="text-yellow-400 text-xs font-bold">¿Confirmar cierre?</span>
                                                <button onClick={handleCerrar} disabled={saving}
                                                    className="px-4 py-2 text-xs font-black rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50">
                                                    {saving ? 'Guardando...' : 'Sí, cerrar'}
                                                </button>
                                                <button onClick={cancelConfirm}
                                                    className="px-4 py-2 text-xs font-bold rounded-lg bg-[#2C1A0F] text-[#9A7B6A] hover:text-[#c28744] border border-[#c28744]/20 transition-colors">
                                                    Cancelar
                                                </button>
                                            </>
                                        ) : (
                                            <button onClick={handleCerrar} disabled={orders.length === 0}
                                                className="px-5 py-2.5 text-sm font-black rounded-xl bg-[#c28744] hover:bg-[#d4975a] text-[#12100B] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
                                                <Lock size={15} /> Cerrar Día
                                            </button>
                                        )
                                    )}

                                    {/* Botón reabrir (solo si está cerrado y es hoy) */}
                                    {isClosed && (
                                        confirming === 'reopen' ? (
                                            <>
                                                <span className="text-yellow-400 text-xs font-bold">¿Reabrir el día?</span>
                                                <button onClick={handleReabrir} disabled={saving}
                                                    className="px-4 py-2 text-xs font-black rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white transition-colors disabled:opacity-50">
                                                    {saving ? 'Guardando...' : 'Sí, reabrir'}
                                                </button>
                                                <button onClick={cancelConfirm}
                                                    className="px-4 py-2 text-xs font-bold rounded-lg bg-[#2C1A0F] text-[#9A7B6A] hover:text-[#c28744] border border-[#c28744]/20 transition-colors">
                                                    Cancelar
                                                </button>
                                            </>
                                        ) : (
                                            <button onClick={handleReabrir}
                                                className="px-5 py-2.5 text-sm font-black rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white transition-colors flex items-center gap-2">
                                                <LockOpen size={15} /> Reabrir Día
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>

                            {errorMsg && <p className="text-red-400 text-xs mt-3">{errorMsg}</p>}

                            {/* Historial de eventos del dia */}
                            {todayClosure?.historial?.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-white/10">
                                    <p className="text-[#9A7B6A] text-xs font-bold flex items-center gap-1.5 mb-2">
                                        <History size={13} /> Historial de hoy
                                    </p>
                                    <div className="space-y-1">
                                        {todayClosure.historial.map((ev, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs">
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${ev.accion === 'cierre' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                                                <span className="capitalize text-[#FFF8E7] font-bold">{ev.accion}</span>
                                                <span className="text-[#9A7B6A]">por</span>
                                                <span className="text-[#c28744]">{ev.usuario}</span>
                                                <span className="text-[#9A7B6A] ml-auto font-mono">{ev.hora}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Lista de pedidos */}
                    <div className="bg-[#1E150A] border border-[#c28744]/20 rounded-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-[#c28744]/10">
                            <h3 className="text-[#FFF8E7] font-bold text-sm flex items-center gap-2">
                                <Clock size={15} className="text-[#c28744]" />
                                Pedidos del día ({orders.length})
                            </h3>
                        </div>
                        {orders.length === 0 ? (
                            <p className="text-[#9A7B6A] text-sm text-center py-10">No hay pedidos para esta fecha.</p>
                        ) : (
                            <div className="divide-y divide-[#c28744]/10">
                                {orders.map(order => (
                                    <OrderRow
                                        key={order.id}
                                        order={order}
                                        expanded={expandedOrder === order.id}
                                        onToggle={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                    />
                                ))}
                            </div>
                        )}
                        {orders.length > 0 && (
                            <div className="px-5 py-4 border-t border-[#c28744]/20 flex justify-between items-center bg-[#12100B]/50">
                                <span className="text-[#9A7B6A] font-bold text-sm">TOTAL</span>
                                <span className="text-[#c28744] font-black text-lg">{fmt(totalAmount)} €</span>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Historial de cierres */}
            <div className="bg-[#1E150A] border border-[#c28744]/20 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#c28744]/10">
                    <h3 className="text-[#FFF8E7] font-bold text-sm flex items-center gap-2">
                        <CheckCircle size={15} className="text-[#c28744]" />
                        Historial de cierres
                    </h3>
                </div>
                {closuresLoading ? (
                    <p className="text-[#9A7B6A] text-sm text-center py-8">Cargando...</p>
                ) : closures.length === 0 ? (
                    <p className="text-[#9A7B6A] text-sm text-center py-8">No hay cierres registrados aún.</p>
                ) : (
                    <div className="divide-y divide-[#c28744]/10">
                        {closures.map(c => (
                            <ClosureRow key={c.id} closure={c} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const SummaryCard = ({ icon, label, value, highlight }) => (
    <div className={`rounded-2xl p-4 border flex flex-col gap-2 ${highlight ? 'bg-[#c28744]/10 border-[#c28744]/40' : 'bg-[#1E150A] border-[#c28744]/20'}`}>
        <div className="flex items-center gap-1.5">
            <span className="text-[#c28744]">{icon}</span>
            <span className="text-xs font-bold text-[#9A7B6A]">{label}</span>
        </div>
        <p className={`font-black text-lg leading-none ${highlight ? 'text-[#c28744]' : 'text-[#FFF8E7]'}`}>{value}</p>
    </div>
);

const ClosureRow = ({ closure }) => {
    const [expanded, setExpanded] = useState(false);
    const isClosed = closure.estado === 'cerrado';
    const historial = closure.historial || [];

    return (
        <div className="px-5 py-4">
            <button onClick={() => setExpanded(e => !e)} className="w-full flex flex-wrap items-center justify-between gap-2 text-left">
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                        <span className="text-[#FFF8E7] font-bold text-sm">{closure.fecha}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isClosed ? 'bg-red-900/50 text-red-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                            {isClosed ? 'Cerrado' : 'Reabierto'}
                        </span>
                    </div>
                    <span className="text-[#9A7B6A] text-xs">
                        {closure.usuario_email} · {new Date(closure.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[#c28744] font-black">{fmt(closure.total_ventas)} €</span>
                        <span className="text-[#9A7B6A] text-xs">{closure.num_pedidos} pedidos</span>
                    </div>
                    {historial.length > 1 && (
                        expanded ? <ChevronUp size={14} className="text-[#9A7B6A]" /> : <ChevronDown size={14} className="text-[#9A7B6A]" />
                    )}
                </div>
            </button>

            {expanded && historial.length > 1 && (
                <div className="mt-3 pt-3 border-t border-[#c28744]/10 space-y-1.5">
                    <p className="text-[#9A7B6A] text-xs font-bold flex items-center gap-1"><History size={11} /> Historial de eventos</p>
                    {historial.map((ev, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${ev.accion === 'cierre' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                            <span className="capitalize text-[#FFF8E7] font-bold">{ev.accion}</span>
                            <span className="text-[#9A7B6A]">por</span>
                            <span className="text-[#c28744]">{ev.usuario}</span>
                            <span className="text-[#9A7B6A] ml-auto font-mono">{ev.hora}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const OrderRow = ({ order, expanded, onToggle }) => {
    const items = Array.isArray(order.items) ? order.items : [];
    const time = order.created_at ? new Date(order.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '--';
    const typeLabel = order.order_type === 'eat-in' ? `Mesa ${order.table_number || '?'}` : 'Para llevar';

    return (
        <div className="px-5 py-3">
            <button onClick={onToggle} className="w-full flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3">
                    <span className="text-[#9A7B6A] text-xs font-mono w-14">{time}</span>
                    <span className="text-[#FFF8E7] font-bold text-sm">{order.order_number}</span>
                    <span className="text-xs text-[#9A7B6A] bg-[#2C1A0F] px-2 py-0.5 rounded-full">{typeLabel}</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[#c28744] font-black text-sm">{parseFloat(order.total_amount || 0).toFixed(2)} €</span>
                    {expanded ? <ChevronUp size={14} className="text-[#9A7B6A]" /> : <ChevronDown size={14} className="text-[#9A7B6A]" />}
                </div>
            </button>
            {expanded && items.length > 0 && (
                <div className="mt-2 pl-4 border-l border-[#c28744]/20 space-y-1">
                    {items.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs text-[#9A7B6A]">
                            <span>{item.quantity}x {item.name}</span>
                            <span>{parseFloat((item.price || 0) * (item.quantity || 1)).toFixed(2)} €</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminDailySummary;
