const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
    constructor(url, key) {
        this.supabase = createClient(url, key);
    }

    /**
     * Carga la configuración completa: impresoras, mapeo y categorías
     */
    async loadConfig() {
        const [
            { data: printers, error: pErr },
            { data: mapData, error: mErr },
            { data: categories, error: cErr },
        ] = await Promise.all([
            this.supabase.from('printers').select('*').eq('enabled', true).order('created_at'),
            this.supabase.from('category_printer_map').select('*'),
            this.supabase.from('categories').select('id, name, parent_id').order('order_index'),
        ]);

        if (pErr) throw new Error(`Error cargando impresoras: ${pErr.message}`);
        if (mErr) throw new Error(`Error cargando mapeo: ${mErr.message}`);
        if (cErr) throw new Error(`Error cargando categorías: ${cErr.message}`);

        const categoryMap = {};
        (mapData || []).forEach(m => { categoryMap[m.category_id] = m.printer_id; });

        return {
            printers: printers || [],
            categoryMap,
            categories: categories || [],
        };
    }

    /**
     * Escucha nuevos pedidos en la tabla `pedidos`
     */
    listenOrders(onNewOrder) {
        this.orderChannel = this.supabase
            .channel('pedidos-realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'pedidos' },
                (payload) => onNewOrder(payload.new)
            )
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
                    console.warn(`Conexión pedidos perdida (${status}), reconectando en 5s...`);
                    setTimeout(() => {
                        try { this.orderChannel.unsubscribe(); } catch (e) {}
                        this.listenOrders(onNewOrder);
                    }, 5000);
                }
            });
    }

    /**
     * Escucha cambios en la configuración de impresoras (para recargar en caliente)
     */
    listenConfigChanges(onChange) {
        this.configChannel = this.supabase
            .channel('printer-config-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'printers' }, () => onChange())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'category_printer_map' }, () => onChange())
            .subscribe();
    }
}

module.exports = SupabaseService;
