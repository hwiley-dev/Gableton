import { app, BrowserWindow, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerBridgeHandlers } from "./bridge.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEV_RENDERER_URL = process.env.GABLETON_RENDERER_URL || "http://127.0.0.1:4174";

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
    show: false,
    title: "Gableton",
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (app.isPackaged) {
    void mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  } else {
    void mainWindow.loadURL(DEV_RENDERER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  return mainWindow;
}

app.whenReady().then(() => {
  registerBridgeHandlers();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
