const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const PrinterService = require('./printer-service');
const SupabaseService = require('./supabase-service');

let mainWindow;
let printerService;
let supabaseService;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 650,
        minWidth: 700,
        minHeight: 500,
        title: 'Manuela Desayuna - Agente de Impresora',
        icon: path.join(__dirname, '../assets/icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    mainWindow.loadFile(path.join(__dirname, '../ui/index.html'));

    // Abrir DevTools en desarrollo
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── Enviar log a la UI ──────────────────────────────────────────────
function sendToUI(channel, data) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, data);
    }
}

function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('es-ES');
    const entry = { timestamp, message, type };
    console.log(`[${timestamp}] [${type}] ${message}`);
    sendToUI('log', entry);
}

// ─── Inicializar servicios ───────────────────────────────────────────
async function initServices(config) {
    try {
        // Inicializar Supabase
        supabaseService = new SupabaseService(config.supabaseUrl, config.supabaseKey);
        log('Conectando a Supabase...');

        // Cargar configuración de impresoras y mapeo de categorías
        const { printers, categoryMap, categories } = await supabaseService.loadConfig();
        log(`Configuración cargada: ${printers.length} impresora(s), ${Object.keys(categoryMap).length} asignación(es)`);

        // Inicializar servicio de impresoras
        printerService = new PrinterService(printers, categoryMap, categories, log);

        // Enviar estado inicial a la UI
        sendToUI('config-loaded', { printers, categoryMap, categories });

        // Escuchar nuevos pedidos
        supabaseService.listenOrders(async (pedido) => {
            log(`Nuevo pedido detectado: #${pedido.order_number || pedido.id}`, 'order');
            sendToUI('new-order', pedido);

            try {
                const result = await printerService.procesarPedido(pedido);
                sendToUI('order-result', { pedido, result });
            } catch (err) {
                log(`Error procesando pedido: ${err.message}`, 'error');
                sendToUI('order-result', { pedido, result: { success: false, error: err.message } });
            }
        });

        // Escuchar cambios en configuración de impresoras (real-time)
        supabaseService.listenConfigChanges(async () => {
            log('Cambio en configuración detectado, recargando...', 'info');
            const newConfig = await supabaseService.loadConfig();
            printerService.updateConfig(newConfig.printers, newConfig.categoryMap, newConfig.categories);
            sendToUI('config-loaded', newConfig);
            log('Configuración actualizada');
        });

        log('Agente listo y escuchando pedidos', 'success');
        return { success: true };
    } catch (err) {
        log(`Error inicializando: ${err.message}`, 'error');
        return { success: false, error: err.message };
    }
}

// ─── IPC Handlers ────────────────────────────────────────────────────
app.whenReady().then(() => {
    createWindow();

    ipcMain.handle('init-services', async (event, config) => {
        return await initServices(config);
    });

    ipcMain.handle('test-printer', async (event, printerData) => {
        if (!printerService) return { success: false, error: 'Servicio no inicializado' };
        return await printerService.testPrinter(printerData);
    });

    ipcMain.handle('get-config', () => {
        // Leer config guardada en localStorage de la UI
        return null;
    });

    ipcMain.handle('reload-config', async () => {
        if (!supabaseService) return { success: false, error: 'No conectado' };
        const config = await supabaseService.loadConfig();
        if (printerService) {
            printerService.updateConfig(config.printers, config.categoryMap, config.categories);
        }
        sendToUI('config-loaded', config);
        return { success: true };
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
