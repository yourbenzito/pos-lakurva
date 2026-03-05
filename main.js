const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { fork } = require("child_process");

// Iniciar servidor backend
let serverProcess = null;
function startBackendServer() {
  const serverPath = path.join(__dirname, "backend", "server.js");
  serverProcess = fork(serverPath);

  serverProcess.on("message", (msg) => {
    console.log("Backend message:", msg);
  });

  serverProcess.on("error", (err) => {
    console.error("Backend error:", err);
  });
}

startBackendServer();

// Configurar directorio de caché antes de app.ready para evitar "Unable to create cache" / "Acceso denegado"
const appName = "sistema-ventas";
const userDataPath = path.join(
  process.env.APPDATA || (process.platform === "win32" ? path.join(os.homedir(), "AppData", "Roaming") : os.homedir()),
  appName
);
const cachePath = path.join(userDataPath, "Cache");
app.commandLine.appendSwitch("disk-cache-dir", cachePath);

/** @type {Electron.BrowserWindow|null} */
let mainWindow = null;
let quitTimeoutId = null;
let isQuitting = false;

/**
 * Crea la ventana principal de la aplicación
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile("index.html");
}

const BACKUP_MAX_FILES = 30; // Mantener últimos 30 backups

/**
 * Escribe backup en disco (carpeta userData/backups), verifica escritura y rota archivos antiguos.
 */
function writeBackupToDisk(jsonString) {
  const backupsDir = path.join(app.getPath("userData"), "backups");
  try {
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 19).replace(/[-:T]/g, "-");
    const filename = `pos-backup-${dateStr}.json`;
    const filepath = path.join(backupsDir, filename);
    fs.writeFileSync(filepath, jsonString, "utf8");

    // Verificación post-escritura: leer y comprobar tamaño
    const readBack = fs.readFileSync(filepath, "utf8");
    const expectedLen = Buffer.byteLength(jsonString, "utf8");
    const actualLen = Buffer.byteLength(readBack, "utf8");
    if (actualLen !== expectedLen || actualLen === 0) {
      try {
        fs.unlinkSync(filepath);
      } catch (e) { }
      return { ok: false, error: "Verificación del backup falló: tamaño incorrecto" };
    }
    if (readBack.charAt(0) !== "{") {
      try {
        fs.unlinkSync(filepath);
      } catch (e) { }
      return { ok: false, error: "Verificación del backup falló: contenido inválido" };
    }

    // Rotación: mantener solo los últimos BACKUP_MAX_FILES
    const files = fs.readdirSync(backupsDir)
      .filter((f) => f.startsWith("pos-backup-") && f.endsWith(".json"))
      .map((f) => ({
        name: f,
        path: path.join(backupsDir, f),
        mtime: fs.statSync(path.join(backupsDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.mtime - a.mtime);
    for (let i = BACKUP_MAX_FILES; i < files.length; i++) {
      try {
        fs.unlinkSync(files[i].path);
      } catch (e) {
        console.warn("No se pudo eliminar backup antiguo:", files[i].name, e.message);
      }
    }

    return { ok: true, path: filepath };
  } catch (err) {
    console.error("Error writing backup:", err);
    return { ok: false, error: err.message };
  }
}

/**
 * Inicialización de la aplicación
 * Persistencia real: IndexedDB en el renderer (js/db.js). No se usa SQLite en main.
 */
app.whenReady().then(async () => {
  try {
    const ud = app.getPath("userData");
    try {
      fs.mkdirSync(ud, { recursive: true });
      fs.mkdirSync(cachePath, { recursive: true });
    } catch (e) {
      console.warn("No se pudo crear directorios de caché:", e.message);
    }

    createWindow();
  } catch (error) {
    console.error("❌ Fatal error during startup:", error);
    app.quit();
  }
});

// --- IPC: API mínima (stubs para productos; el renderer usa IndexedDB directamente) ---

ipcMain.handle("agregarProducto", async () => {
  return Promise.reject(new Error("Usar modelo Product en el renderer (IndexedDB). IPC legacy deshabilitado."));
});

ipcMain.handle("listarProductos", async () => {
  return [];
});

// --- IPC: Rutas y backup (con whitelist y validación) ---

const ALLOWED_GETPATH_NAMES = ["userData", "temp", "appData", "home", "documents", "desktop", "logs"];

ipcMain.handle("getPath", (_, name) => {
  const n = typeof name === "string" ? name.trim() : "";
  if (!ALLOWED_GETPATH_NAMES.includes(n)) {
    throw new Error(`getPath: nombre no permitido. Permitidos: ${ALLOWED_GETPATH_NAMES.join(", ")}`);
  }
  return app.getPath(n);
});

const BACKUP_MAX_BYTES = 100 * 1024 * 1024; // 100 MB

function validateBackupPayload(jsonString) {
  if (typeof jsonString !== "string") {
    return { ok: false, error: "El backup debe ser un string" };
  }
  if (Buffer.byteLength(jsonString, "utf8") > BACKUP_MAX_BYTES) {
    return { ok: false, error: `El backup supera el tamaño máximo (${BACKUP_MAX_BYTES / 1024 / 1024} MB)` };
  }
  try {
    JSON.parse(jsonString);
  } catch (e) {
    return { ok: false, error: "El contenido del backup no es JSON válido" };
  }
  return { ok: true };
}

ipcMain.handle("backup:saveToDisk", (_, jsonString) => {
  const validation = validateBackupPayload(jsonString);
  if (!validation.ok) return validation;
  return writeBackupToDisk(jsonString);
});

// --- Cierre con backup opcional ---

app.on("before-quit", (e) => {
  if (isQuitting) return;
  if (!mainWindow || mainWindow.isDestroyed()) return;
  e.preventDefault();
  isQuitting = true;
  mainWindow.webContents.send("app:beforeQuit");
  quitTimeoutId = setTimeout(() => {
    quitTimeoutId = null;
    app.exit(0);
  }, 8000);
});

ipcMain.on("backup:data", (_, jsonString) => {
  if (quitTimeoutId) {
    clearTimeout(quitTimeoutId);
    quitTimeoutId = null;
  }
  const validation = validateBackupPayload(jsonString);
  if (!validation.ok) {
    console.error("Backup on close rejected:", validation.error);
  } else {
    writeBackupToDisk(jsonString);
  }
  app.exit(0);
});

ipcMain.on("backup:skip", () => {
  if (quitTimeoutId) {
    clearTimeout(quitTimeoutId);
    quitTimeoutId = null;
  }
  app.exit(0);
});

app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});
