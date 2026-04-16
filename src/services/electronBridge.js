/**
 * electronBridge.js — Abstracción del canal IPC de Electron.
 *
 * Centraliza todas las llamadas a window.require('electron') en un solo
 * módulo. El resto del código importa funciones tipadas desde aquí y nunca
 * accede a ipcRenderer directamente, lo que facilita:
 *   1. Tests sin entorno Electron (todas las funciones devuelven no-ops).
 *   2. Cambios en el protocolo IPC sin tocar múltiples archivos.
 *   3. Diagnóstico del modo de ejecución (isElectron).
 */

// ── Detección del entorno ─────────────────────────────────────────────────
export const isElectron = (() => {
    try {
        // En Electron, window.require existe y devuelve el módulo de Node.
        return typeof window !== 'undefined' &&
               typeof window.require === 'function' &&
               !!window.require('electron');
    } catch {
        return false;
    }
})();

// Obtiene ipcRenderer de forma segura; null en entorno web.
const getIpc = () => {
    if (!isElectron) return null;
    try { return window.require('electron').ipcRenderer; }
    catch { return null; }
};

// ── DATA: caché local SQLite ──────────────────────────────────────────────

/**
 * Carga datos del tipo especificado desde SQLite local.
 * @param {'products'|'categories'|'allergens'} type
 * @returns {Promise<{data: any[]|null, success: boolean}>}
 */
export const loadLocalData = async (type) => {
    const ipc = getIpc();
    if (!ipc) return { data: null, success: false };
    try {
        return await ipc.invoke('DATA:LOAD_LOCAL', { type });
    } catch (err) {
        console.warn(`[electronBridge] loadLocalData(${type}) falló:`, err.message);
        return { data: null, success: false };
    }
};

/**
 * Guarda datos en SQLite local para el próximo arranque offline.
 * @param {'products'|'categories'|'allergens'} type
 * @param {any[]} data
 */
export const saveLocalData = async (type, data) => {
    const ipc = getIpc();
    if (!ipc || !data?.length) return;
    try {
        await ipc.invoke('DATA:SAVE_LOCAL', { type, data });
    } catch (err) {
        console.warn(`[electronBridge] saveLocalData(${type}) falló:`, err.message);
    }
};

// ── SYNC: sincronización de imágenes ─────────────────────────────────────

/**
 * Inicia la sincronización de imágenes desde Supabase a disco local.
 * @param {(progress: number, message: string) => void} onProgress Callback de progreso.
 * @returns {Promise<{success: boolean}>}
 */
export const startSync = async (onProgress) => {
    const ipc = getIpc();
    if (!ipc) return { success: false };

    const progressListener = (_event, data) => {
        if (data?.progress !== undefined && onProgress) {
            onProgress(data.progress, data.message ?? 'Sincronizando...');
        }
    };

    try {
        ipc.on('SYNC:PROGRESS', progressListener);
        const result = await ipc.invoke('SYNC:START');
        return result ?? { success: false };
    } catch (err) {
        console.warn('[electronBridge] startSync falló:', err.message);
        return { success: false };
    } finally {
        ipc.removeListener('SYNC:PROGRESS', progressListener);
    }
};
