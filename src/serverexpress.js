const express = require("express");
const app = express();
// const cors = require("cors");
// const path = require("path");
// const fs = require("fs");
// const upload = multer({ storage: multer.memoryStorage() });
// const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
// const os = require("os");
// app.use(express.json());
// app.use(cors("*"));

// app.post("/upload-csv", upload.single("file"), (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: "No file uploaded" });
//     }

//     console.log("📁 File received:");
//     console.log("Name:", req.file.originalname);

//     const buffer = req.file.buffer;
//     const extension = req.file.originalname.split(".").pop().toLowerCase();

//     let parsedData = null;

//     // -------------------------------------
//     // 📌 CSV → JSON
//     // -------------------------------------
//     if (extension === "csv") {
//       const csvText = buffer.toString("utf8");

//       const result = Papa.parse(csvText, {
//         header: true,
//         skipEmptyLines: true,
//       });

//       parsedData = result.data;
//     }

//     // -------------------------------------
//     // 📌 Excel → JSON (.xlsx / .xls)
//     // -------------------------------------
//     else if (extension === "xlsx" || extension === "xls") {
//       const workbook = XLSX.read(buffer, { type: "buffer" });
//       const firstSheet = workbook.SheetNames[0];
//       const worksheet = workbook.Sheets[firstSheet];

//       parsedData = XLSX.utils.sheet_to_json(worksheet);
//     } else {
//       return res.status(400).json({ error: "Unsupported file type" });
//     }

//     // Send parsed JSON back
//     res.json({
//       success: true,
//       fileName: req.file.originalname,
//       data: parsedData,
//     });
//   } catch (err) {
//     console.error("Error parsing file:", err);
//     res.status(500).json({ error: "Failed to parse file" });
//   }
// });

// Database Sync and Admin User Creation (Handled in Electron Main)
// const startServer = async () => {
//   try {
//     await sequelize.authenticate();
//     console.log("✅ Database connected successfully.");

//     await sequelize.sync({ force: false }); // or { force: true } to drop & recreate tables
//     console.log("📦 Models synchronized with database.");

//     // Optional: seed admin user or other initial data here
//   } catch (error) {
//     console.error("❌ Unable to connect to the database:", error);
//   }
// };

// Export app and startServer function
module.exports = app;
