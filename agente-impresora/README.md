# Agente de Impresión Local - Manuela Desayuna 🖨️

Este es un pequeño programa (Agente Local) que se conecta directamente a la base de datos de **Supabase** en tiempo real para recibir los pedidos que hacen los clientes e imprimirlos en las impresoras térmicas del local.

## 🛠️ Instalación en el ordenador del local (TPV)

1.  Asegúrate de tener instalado **Node.js** en el ordenador (puedes descargarlo desde [nodejs.org](https://nodejs.org/)).
2.  Abre una terminal o consola de comandos (`cmd`) en esta misma carpeta y ejecuta:
    ```bash
    npm install
    ```
    *(Esto descargará las librerías necesarias para que la impresora y Supabase funcionen).*

## ⚙️ Configuración

Antes de ejecutarlo, edita el archivo `index.js` (puedes abrirlo con el Bloc de notas o VS Code) y ajusta tus credenciales de Supabase listadas al principio del archivo:

1.  `SUPABASE_URL`: Pon la URL de tu proyecto Supabase (ej: `https://TU_PROYECTO.supabase.co`).
2.  `SUPABASE_KEY`: Pon tu `anon_key` pública de Supabase.

Luego, ajusta la configuración de tus impresoras en la sección `PRINTERS_CONFIG`:

1.  Verás que hay definidas tres impresoras de ejemplo: `bebidas`, `comida` y `caja`. Puedes añadir o quitar según necesites.
2.  Para cada impresora, ajusta su `ip` (ej: `192.168.1.101`).
3.  Si alguna impresora está por USB, comenta la línea de `ip` y `port`, y descomenta la línea que usa `interface` seguido del nombre exacto que tiene la impresora en Windows (ej: `printer:IMPRESORA_COCINA`).
4.  Revisa el diccionario `CATEGORY_TO_PRINTER`. Aquí es donde le dices al programa: "Los productos de esta categoría, mándalos a esta impresora". Ajusta los nombres de las categorías ("Bebidas", "Tostadas", etc.) para que coincidan exactamente con cómo las tienes escritas en tu base de datos o menú.

## 🚀 Cómo hacer que se inicie automáticamente con Windows

La forma más sencilla de que este agente siempre esté corriendo cuando enciendas la máquina TPV es añadirlo al Inicio de Windows:

1.  Pulsa las teclas `Windows + R` en tu teclado.
2.  En la ventana que se abre, escribe `shell:startup` y dale a Enter.
3.  Se abrirá una carpeta vacía. 
4.  Ve a la carpeta de este agente de impresión y haz **clic derecho sobre el archivo `iniciar-agente.bat`** -> **"Crear acceso directo"**.
5.  Mueve ese nuevo **"acceso directo"** a la carpeta de Inicio (`shell:startup`) que abriste en el paso 2.

¡Listo! A partir de ahora, cada vez que se encienda el PC, se abrirá una consola negra automáticamente que se conectará al servidor y se pondrá a escuchar pedidos para imprimirlos.

## 🧪 Cómo probarlo

Para probarlo sin reiniciar el PC, simplemente haz doble clic en `iniciar-agente.bat`. Deberías ver un mensaje que dice:
`[Agente] ✅ Conectado y escuchando nuevos pedidos en Supabase...`
