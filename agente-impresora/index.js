const { createClient } = require('@supabase/supabase-js');
const ThermalPrinter = require('node-thermal-printer').printer;
const PrinterTypes = require('node-thermal-printer').types;
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ==========================================
// CONFIGURACIÓN
// ==========================================
const SUPABASE_URL = "https://zvojxaraixznnuavxral.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2p4YXJhaXh6bm51YXZ4cmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MzIyNzcsImV4cCI6MjA4NjQwODI3N30.X65cqxLnPrls15YmMldSlSc8QA0IF7mFDEHmEBm19uk";

const PRINTERS_CONFIG = {
  bebidas: { ip: "192.168.1.122", port: 9100, type: PrinterTypes.EPSON },
  comida:  { ip: "192.168.1.123", port: 9100, type: PrinterTypes.EPSON },
};

const CATEGORY_TO_PRINTER = {
  // --- COCINA (usar el categoryId exacto de Supabase) ---
  "especiales": "comida",
  "tostadas": "comida",
  "healthy": "comida",
  "tradicionales": "comida",
  "#montados": "comida",
  "poke": "comida",
  "bowls": "comida",

  // --- BEBIDAS (usar el categoryId exacto de Supabase) ---
  "coffee": "bebidas",
  "cafes": "bebidas",
  "zumos": "bebidas",
  "juice": "bebidas",
  "batidos": "bebidas",
  "refrescos": "bebidas",
  "cocacola": "bebidas",
  "agua": "bebidas",
  "vinos": "bebidas",
  "cervezas": "bebidas",
  "cavas": "bebidas",
  "rioja_blanco_copa": "bebidas",
  "spritz": "bebidas",
  "aperol": "bebidas",
  "vermut": "bebidas",
  "tea": "bebidas",
  "pastry": "bebidas",
  "bolleria": "bebidas",
  "pinchos": "bebidas",
};

const MAX_REINTENTOS = 3;
const ESPERA_REINTENTO_MS = 2000;

// ==========================================
// LOGGING A FICHERO
// ==========================================
const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

function getLogPath() {
  const fecha = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(LOG_DIR, `agente-${fecha}.log`);
}

function log(mensaje) {
  const timestamp = new Date().toLocaleTimeString('es-ES');
  const linea = `[${timestamp}] ${mensaje}`;
  console.log(linea);
  try {
    fs.appendFileSync(getLogPath(), linea + '\n', 'utf8');
  } catch (e) {
    console.error('Error escribiendo log:', e.message);
  }
}

// ==========================================
// ALERTA VISUAL EN WINDOWS
// ==========================================
function alertaError(mensaje) {
  log(`🚨 ALERTA: ${mensaje}`);
  exec(`msg * "${mensaje.replace(/"/g, "'")}"`, (err) => {
    if (err) {
      // msg solo funciona en Windows con sesión activa, ignorar si falla
    }
  });
}

// ==========================================
// INICIALIZAR IMPRESORAS
// ==========================================
const printers = {};
for (const [key, config] of Object.entries(PRINTERS_CONFIG)) {
  printers[key] = new ThermalPrinter({
    type: config.type,
    interface: `tcp://${config.ip}:${config.port}`,
    characterSet: "PC858_EURO",
  });
}

// ==========================================
// COLA DE PEDIDOS
// ==========================================
const colaPedidos = [];
let procesando = false;

async function encolarPedido(pedido) {
  colaPedidos.push(pedido);
  log(`[Cola] Pedido #${pedido.id || 'N/A'} encolado. Pendientes: ${colaPedidos.length}`);
  if (!procesando) procesarCola();
}

async function procesarCola() {
  if (colaPedidos.length === 0) {
    procesando = false;
    return;
  }
  procesando = true;
  const pedido = colaPedidos.shift();
  try {
    await procesarPedido(pedido);
  } catch (e) {
    log(`🚨 Error inesperado procesando pedido #${pedido.id}: ${e.message}`);
  }
  procesarCola();
}

// ==========================================
// PROCESAR PEDIDO
// ==========================================
async function procesarPedido(pedido) {
  log(`Procesando pedido: #${pedido.id || 'N/A'}, mesa: ${pedido.mesa || pedido.table_number || 'Para llevar'}`);

  let items = pedido.items;
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch (e) {
      log(`🚨 Error al parsear los items del pedido #${pedido.id}: ${e.message}`);
      return;
    }
  }

  if (!items || !Array.isArray(items)) {
    log(`⚠️ Pedido #${pedido.id} sin items válidos.`);
    return;
  }

  log(`[Debug] Items del pedido #${pedido.id}: ${JSON.stringify(items)}`);


  const itemsPorImpresora = { comida: [], bebidas: [] };
  items.forEach(item => {
    const categoria = item.categoryId || item.categoria || item.category || '';
    const destino = CATEGORY_TO_PRINTER[categoria] || "bebidas";
    if (!CATEGORY_TO_PRINTER[categoria]) {
      log(`⚠️ Categoría no mapeada: '${categoria}' (item: ${item.nombre || item.name || JSON.stringify(item)}). Va a bebidas por defecto.`);
    }
    itemsPorImpresora[destino].push(item);
  });

  await Promise.all([
    imprimirEn('comida',  pedido, itemsPorImpresora.comida),
    imprimirEn('bebidas', pedido, itemsPorImpresora.bebidas),
  ]);
}

// ==========================================
// IMPRIMIR CON REINTENTOS
// ==========================================
async function imprimirEn(impresoraKey, pedido, itemsToPrint) {
  if (itemsToPrint.length === 0) return;

  const driver = printers[impresoraKey];
  if (!driver) {
    alertaError(`Impresora '${impresoraKey}' no configurada.`);
    return;
  }

  for (let intento = 1; intento <= MAX_REINTENTOS; intento++) {
    try {
      driver.alignCenter();
      driver.println(`MANUELA DESAYUNA - ${impresoraKey.toUpperCase()}`);
      driver.drawLine();

      driver.alignLeft();
      driver.println(`Pedido: #${pedido.order_number || pedido.id || 'N/A'}`);
      driver.println(`Mesa: ${pedido.mesa || pedido.table_number || 'Para llevar'}`);
      driver.println(`Hora: ${new Date().toLocaleTimeString('es-ES')}`);
      driver.drawLine();

      itemsToPrint.forEach(item => {
        const cantidad = item.cantidad ?? item.quantity ?? 1;
        const nombre = item.nombre || item.name || 'Sin nombre';
        driver.println(`${cantidad}x ${nombre}`);

        const modifiers = item.selectedModifiers || item.modifiers || item.extras || [];
        modifiers.forEach(mod => {
          const modNombre = mod.name || mod.nombre || '';
          if (modNombre) driver.println(`   + ${modNombre}`);
        });
      });

      driver.drawLine();
      driver.cut();
      driver.beep();

      await driver.execute();
      driver.clear();

      log(`✅ Ticket enviado a '${impresoraKey}' (intento ${intento}/${MAX_REINTENTOS})`);
      return; // éxito, salir

    } catch (error) {
      driver.clear();
      log(`⚠️ Fallo impresora '${impresoraKey}' intento ${intento}/${MAX_REINTENTOS}: ${error.message}`);

      if (intento < MAX_REINTENTOS) {
        await new Promise(r => setTimeout(r, ESPERA_REINTENTO_MS));
      } else {
        alertaError(`Error impresora ${impresoraKey}: no se pudo imprimir pedido #${pedido.id || 'N/A'} tras ${MAX_REINTENTOS} intentos`);
      }
    }
  }
}

// ==========================================
// CONEXIÓN A SUPABASE CON RECONEXIÓN AUTOMÁTICA
// ==========================================
let channel = null;

function conectar() {
  log(`Iniciando conexión a Supabase...`);
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  channel = supabase
    .channel('public:pedidos')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'pedidos' },
      async (payload) => {
        log(`Nuevo pedido detectado: #${payload.new?.id || 'N/A'}`);
        await encolarPedido(payload.new);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        log('✅ Conectado y escuchando nuevos pedidos.');
      } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
        log(`⚠️ Conexión perdida (${status}). Reconectando en 5 segundos...`);
        setTimeout(() => {
          try { channel.unsubscribe(); } catch (e) {}
          conectar();
        }, 5000);
      } else {
        log(`Estado Supabase: ${status}`);
      }
    });
}

conectar();
