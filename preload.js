const { contextBridge, ipcRenderer } = require("electron");

/**
 * API mínima expuesta al renderer (contextIsolation + sin nodeIntegration).
 * - Productos: stubs (la app usa IndexedDB en el renderer).
 * - Rutas y backup: operaciones que requieren proceso main (fs, paths).
 */
contextBridge.exposeInMainWorld("api", {
  // Stubs legacy (el renderer usa Product/db directamente)
  agregarProducto: (producto) =>
    ipcRenderer.invoke("agregarProducto", producto),
  listarProductos: () =>
    ipcRenderer.invoke("listarProductos"),

  // Rutas del sistema (solo en Electron)
  getPath: (name) =>
    ipcRenderer.invoke("getPath", name),

  // Backup a disco (carpeta userData/backups)
  backupSaveToDisk: (jsonString) =>
    ipcRenderer.invoke("backup:saveToDisk", jsonString),

  // Cierre con backup opcional
  onBeforeQuit: (callback) => {
    ipcRenderer.on("app:beforeQuit", callback);
  },
  sendBackupData: (jsonString) => {
    ipcRenderer.send("backup:data", jsonString);
  },
  sendBackupSkip: () => {
    ipcRenderer.send("backup:skip");
  }
});
