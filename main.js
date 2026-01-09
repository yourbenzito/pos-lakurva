const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { connect } = require("./database/connection");
const { initProductsTable, addProduct, getAllProducts } = require("./database/products");

/**
 * Crea la ventana principal de la aplicación
 */
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile("index.html");
}

/**
 * Inicialización de la aplicación
 */
app.whenReady().then(async () => {
  try {
    // 1. Conectar a la base de datos
    await connect(app.getPath("userData"));
    
    // 2. Inicializar tablas
    await initProductsTable();
    
    // 3. Crear ventana
    createWindow();
  } catch (error) {
    console.error("❌ Fatal error during startup:", error);
    app.quit();
  }
});

/**
 * IPC: Agregar producto
 */
ipcMain.handle("agregarProducto", async (event, producto) => {
  try {
    // La validación ahora ocurre dentro de addProduct
    const id = await addProduct(producto);
    return true;
  } catch (error) {
    console.error("IPC Error adding product:", error.message);
    throw error; // Re-throw to be caught by renderer
  }
});

/**
 * IPC: Listar productos
 */
ipcMain.handle("listarProductos", async () => {
  try {
    return await getAllProducts();
  } catch (error) {
    console.error("IPC Error fetching products:", error.message);
    throw error;
  }
});

/**
 * Cierre limpio de la base de datos
 * Note: sqlite3 connection usually closes on process exit, 
 * but explicit closing can be added to connection.js if needed.
 */
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
