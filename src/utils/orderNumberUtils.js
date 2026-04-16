import { supabase } from '../lib/supabase';

// ── Supabase-backed order number (atomic, multi-instance safe) ─────────────
// La función RPC next_order_number() es atómica con FOR UPDATE en Postgres,
// lo que evita duplicados si corren múltiples kioscos simultáneamente.
// Se mantiene fallback a localStorage si Supabase no está disponible.

/**
 * Obtiene el siguiente número de pedido desde Supabase de forma atómica.
 * Al llamar esta función ya se incrementa el contador (commit inmediato).
 * @returns {Promise<number>} El número de pedido asignado.
 */
export const commitOrderNumber = async () => {
  try {
    const { data, error } = await supabase.rpc('next_order_number');
    if (error) throw error;
    return Number(data);
  } catch (err) {
    console.warn('[orderNumber] Supabase RPC falló, usando fallback localStorage:', err.message);
    return commitOrderNumberLocal();
  }
};

/**
 * Peek del siguiente número SIN incrementar.
 * Solo disponible como estimación local (puede no ser exacto si hay
 * otras instancias activas). Usar solo para mostrar en UI antes de confirmar.
 * @returns {number}
 */
export const peekNextOrderNumber = () => {
  const today = new Date().toISOString().split('T')[0];
  const storedDate = localStorage.getItem('kiosk_order_date');
  const currentCount = parseInt(localStorage.getItem('kiosk_order_count') || '0', 10);

  if (storedDate !== today) return 1;
  const next = currentCount + 1;
  return next > 100 ? 1 : next;
};

/**
 * Gets the current order info (number and date) without incrementing.
 * @returns {{number: number, date: string} | null}
 */
export const getCurrentOrderInfo = () => {
  const storedDate = localStorage.getItem('kiosk_order_date');
  const storedCount = localStorage.getItem('kiosk_order_count');
  if (!storedDate || !storedCount) return null;
  return { number: parseInt(storedCount, 10), date: storedDate };
};

// ── Fallback local (sin red) ───────────────────────────────────────────────
function commitOrderNumberLocal() {
  const today = new Date().toISOString().split('T')[0];
  const storedDate = localStorage.getItem('kiosk_order_date');
  let currentCount = parseInt(localStorage.getItem('kiosk_order_count') || '0', 10);

  if (storedDate !== today) currentCount = 0;
  let next = currentCount + 1;
  if (next > 100) next = 1;

  localStorage.setItem('kiosk_order_date', today);
  localStorage.setItem('kiosk_order_count', next.toString());
  return next;
}
