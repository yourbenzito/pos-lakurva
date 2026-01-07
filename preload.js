const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  agregarProducto: (producto) =>
    ipcRenderer.invoke("agregarProducto", producto),

  listarProductos: () =>
    ipcRenderer.invoke("listarProductos")
});
