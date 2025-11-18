const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  dialog,
  nativeTheme,
} = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const Papa = require("papaparse");
const XLSX = require("xlsx");

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      // contextIsolation: true,
      nodeIntegration: true,
      enableBlinkFeatures: "CSSColorAdjust",
    },
  });
  nativeTheme.themeSource = "dark";
  // Vite dev or dist
  // if (process.env.NODE_ENV === "development") {
  win.loadFile("index.html");
  win.webContents.openDevTools();
  // Menu.setApplicationMenu(null);
}

// Start Electron app
app.whenReady().then(async () => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

ipcMain.handle("select-folder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });

  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle("upload-file", async (event, file) => {
  console.log("📁 File received in Main:");
  console.log("Name:", file.name);

  const buffer = Buffer.from(file.data);
  const extension = file.name.split(".").pop().toLowerCase();

  let parsedData = null;

  // -------------------------------
  // 📌 1. CSV → JSON
  // -------------------------------
  if (extension === "csv") {
    const csvText = buffer.toString("utf8");

    const result = Papa.parse(csvText, {
      header: true, // Convert rows to objects
      skipEmptyLines: true,
    });

    parsedData = result.data;
  }

  // -------------------------------
  // 📌 2. Excel → JSON
  // -------------------------------
  else if (extension === "xlsx" || extension === "xls") {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheet = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheet];

    parsedData = XLSX.utils.sheet_to_json(worksheet); // Convert to array of objects
    console.log(parsedData);
  }

  // -------------------------------
  // ❗ Unsupported format
  // -------------------------------
  else {
    return {
      status: "error",
      message: "Unsupported file type",
    };
  }

  console.log("Parsed object:", parsedData);

  return {
    status: "success",
    message: "File parsed successfully",
    data: parsedData, // <<< your JavaScript object
  };
});

const subjects = [
  "Handwriting",
  "Drawing & Colouring",
  "General Knowledge",
  "Mental Maths",
];
function generateCertificateText(studentName, schoolName, subjectName) {
  return `This is to certify that ${studentName} of ${schoolName} has achieved excellence as Champion in ${subjectName}.`;
}
