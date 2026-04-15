const ThermalPrinter = require('node-thermal-printer').printer;
const PrinterTypes = require('node-thermal-printer').types;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

class PrinterService {
    constructor(printers, categoryMap, categories, logFn) {
        this.log = logFn || console.log;
        this.updateConfig(printers, categoryMap, categories);
    }

    /**
     * Actualiza la configuración en caliente (sin reiniciar)
     */
    updateConfig(printers, categoryMap, categories) {
        this.printersConfig = printers;
        this.categoryMap = categoryMap;   // { categoryId: printerId }
        this.categories = categories;     // [{ id, name, parent_id }, ...]

        // Construir mapa parent_id para tree climbing rápido
        this.parentMap = {};
        categories.forEach(c => { this.parentMap[c.id] = c.parent_id || null; });

        // Identificar impresora por defecto
        this.defaultPrinter = printers.find(p => p.is_default) || printers[0] || null;

        // Crear instancias de drivers TCP
        this.drivers = {};
        printers.forEach(p => {
            if (p.enabled) {
                this.drivers[p.id] = {
                    config: p,
                    driver: new ThermalPrinter({
                        type: p.type === 'STAR' ? PrinterTypes.STAR : PrinterTypes.EPSON,
                        interface: `tcp://${p.ip}:${p.port}`,
                        characterSet: 'PC858_EURO',
                    }),
                };
            }
        });

        this.log(`Configuración actualizada: ${printers.length} impresora(s), default: ${this.defaultPrinter?.name || 'ninguna'}`);
    }

    /**
     * TREE CLIMBING: Dado un categoryId, sube por el árbol de parent_id
     * hasta encontrar una categoría con impresora asignada.
     *
     * Ejemplo: Copa → Tinto → Ribera del guadiana → Vinos (asignada a Barra)
     *
     * Retorna el printerId o null si no hay asignación en ningún ancestro.
     */
    resolvePrinterForCategory(categoryId) {
        const visited = new Set(); // Protección contra ciclos
        let current = categoryId;

        while (current && !visited.has(current)) {
            visited.add(current);

            // ¿Esta categoría tiene impresora asignada directamente?
            if (this.categoryMap[current]) {
                return this.categoryMap[current];
            }

            // Subir al padre
            current = this.parentMap[current] || null;
        }

        // No se encontró asignación en ningún ancestro
        return null;
    }

    /**
     * Procesa un pedido: agrupa items por impresora y envía los tickets
     */
    async procesarPedido(pedido) {
        let items = pedido.items;
        if (typeof items === 'string') {
            try { items = JSON.parse(items); }
            catch (e) {
                this.log(`Error parseando items del pedido #${pedido.id}: ${e.message}`, 'error');
                return { success: false, error: 'Items inválidos' };
            }
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            this.log(`Pedido #${pedido.id} sin items válidos`, 'warning');
            return { success: false, error: 'Sin items' };
        }

        // Agrupar items por impresora usando tree climbing
        const itemsByPrinter = {}; // { printerId: [items] }

        items.forEach(item => {
            const categoryId = item.categoryId || item.categoria || item.category || '';
            const printerId = this.resolvePrinterForCategory(categoryId);
            const targetPrinterId = printerId || (this.defaultPrinter?.id || null);

            if (!targetPrinterId) {
                this.log(`Sin impresora para categoría '${categoryId}' (item: ${item.nombre || item.name}). No hay impresora por defecto.`, 'warning');
                return;
            }

            if (!itemsByPrinter[targetPrinterId]) {
                itemsByPrinter[targetPrinterId] = [];
            }

            // Log si fue por herencia vs directo vs default
            if (!printerId) {
                this.log(`  → '${item.nombre || item.name}' [${categoryId}] → impresora por defecto`, 'info');
            } else if (printerId !== this.categoryMap[categoryId]) {
                // Fue por herencia (subió por el árbol)
                const printerName = this.drivers[printerId]?.config?.name || printerId;
                this.log(`  → '${item.nombre || item.name}' [${categoryId}] → ${printerName} (heredado)`, 'info');
            }

            itemsByPrinter[targetPrinterId].push(item);
        });

        // Imprimir en cada impresora en paralelo
        const results = await Promise.allSettled(
            Object.entries(itemsByPrinter).map(([printerId, printerItems]) =>
                this.imprimirEn(printerId, pedido, printerItems)
            )
        );

        const allSuccess = results.every(r => r.status === 'fulfilled' && r.value?.success);
        return {
            success: allSuccess,
            details: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason?.message }),
        };
    }

    /**
     * Imprime un ticket en una impresora específica con reintentos
     */
    async imprimirEn(printerId, pedido, items) {
        const printerEntry = this.drivers[printerId];
        if (!printerEntry) {
            const msg = `Impresora ${printerId} no disponible`;
            this.log(msg, 'error');
            return { success: false, error: msg };
        }

        const { driver, config } = printerEntry;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                driver.alignCenter();
                driver.setTextSize(1, 1);
                driver.bold(true);
                driver.println(`MANUELA DESAYUNA`);
                driver.bold(false);
                driver.println(config.name.toUpperCase());
                driver.drawLine();

                driver.alignLeft();
                driver.println(`Pedido: #${pedido.order_number || pedido.id || 'N/A'}`);

                const mesa = pedido.mesa || pedido.table_number;
                if (mesa) {
                    driver.setTextSize(1, 1);
                    driver.bold(true);
                    driver.println(`Mesa: ${mesa}`);
                    driver.bold(false);
                    driver.setTextSize(0, 0);
                } else {
                    driver.bold(true);
                    driver.println(`PARA LLEVAR`);
                    driver.bold(false);
                }

                driver.println(`Hora: ${new Date().toLocaleTimeString('es-ES')}`);
                driver.drawLine();

                items.forEach(item => {
                    const cantidad = item.cantidad ?? item.quantity ?? 1;
                    const nombre = item.nombre || item.name || 'Sin nombre';
                    driver.bold(true);
                    driver.println(`${cantidad}x ${nombre}`);
                    driver.bold(false);

                    const modifiers = item.selectedModifiers || item.modifiers || item.extras || [];
                    modifiers.forEach(mod => {
                        const modName = mod.name || mod.nombre || '';
                        if (modName) driver.println(`   + ${modName}`);
                    });
                });

                driver.drawLine();
                driver.cut();
                driver.beep();

                await driver.execute();
                driver.clear();

                this.log(`Ticket enviado a '${config.name}' (${items.length} items, intento ${attempt})`, 'success');
                return { success: true, printer: config.name, items: items.length };

            } catch (error) {
                driver.clear();
                this.log(`Fallo impresora '${config.name}' intento ${attempt}/${MAX_RETRIES}: ${error.message}`, 'warning');

                if (attempt < MAX_RETRIES) {
                    await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
                } else {
                    const msg = `Impresora '${config.name}': fallo tras ${MAX_RETRIES} intentos`;
                    this.log(msg, 'error');
                    return { success: false, error: msg };
                }
            }
        }
    }

    /**
     * Test de conexión a una impresora
     */
    async testPrinter(printerData) {
        try {
            const type = printerData.type === 'STAR' ? PrinterTypes.STAR : PrinterTypes.EPSON;
            const testDriver = new ThermalPrinter({
                type,
                interface: `tcp://${printerData.ip}:${printerData.port || 9100}`,
                characterSet: 'PC858_EURO',
            });

            testDriver.alignCenter();
            testDriver.println('--- TEST DE IMPRESORA ---');
            testDriver.println('Manuela Desayuna');
            testDriver.println(`${printerData.name || 'Sin nombre'}`);
            testDriver.println(new Date().toLocaleString('es-ES'));
            testDriver.println('--- FIN DEL TEST ---');
            testDriver.cut();

            await testDriver.execute();
            testDriver.clear();

            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
}

module.exports = PrinterService;
