const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    initServices: (config) => ipcRenderer.invoke('init-services', config),
    testPrinter: (printer) => ipcRenderer.invoke('test-printer', printer),
    reloadConfig: () => ipcRenderer.invoke('reload-config'),

    // Listeners
    onLog: (callback) => ipcRenderer.on('log', (_, data) => callback(data)),
    onConfigLoaded: (callback) => ipcRenderer.on('config-loaded', (_, data) => callback(data)),
    onNewOrder: (callback) => ipcRenderer.on('new-order', (_, data) => callback(data)),
    onOrderResult: (callback) => ipcRenderer.on('order-result', (_, data) => callback(data)),
});
