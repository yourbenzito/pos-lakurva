const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

let db;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  win.loadFile("index.html");
}

app.whenReady().then(() => {
  const dbPath = path.join(app.getPath("userData"), "ventas.db");
  db = new sqlite3.Database(dbPath);

  db.run(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      precio INTEGER,
      stock INTEGER
    )
  `);

  createWindow();
});
 ipcMain.handle("agregarProducto", (e, producto) => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO productos(nombre, precio, stock) VALUES (?, ?, ?)",
      [producto.nombre, producto.precio, producto.stock],
      (err) => err ? reject(err) : resolve(true)
    );
  });
});

ipcMain.handle("listarProductos", () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM productos", (err, rows) => {
      err ? reject(err) : resolve(rows);
    });
  });
});
