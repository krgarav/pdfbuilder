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
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

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
  // win.webContents.openDevTools();
  Menu.setApplicationMenu(null);
}

// Start Electron app
app.whenReady().then(async () => {
  createWindow();
  //  await startServer();

  // Start Express listening on port (only after DB sync)
  // appServer.listen(4000, () => {
  //   console.log("Express server running on http://localhost:4000");
  // });

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

    parsedData = XLSX.utils.sheet_to_json(worksheet);

    // --------------------------
    // Folder where PDFs and TXT are saved
    // --------------------------
    const documentsFolder = app.getPath("documents");

    const schoolName = parsedData[0]["School"] || "Unknown School";

    // DOCUMENTS/DOCUMENTED PDF/<School Name>
    const outputFolder = path.join(
      documentsFolder,
      "DOCUMENTED PDF",
      schoolName
    );

    // Create folder if it doesn't exist
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }
    const certificateTexts = [];
    const subjectMap = {
      "MM Result": "Mental Maths",
      "D&C Result": "Drawing & Colouring",
      "HW Result": "Handwriting",
      "GK Result": "General Knowledge",
    };
    if (parsedData.length > 0) {
      for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i];

        for (let oldKey in row) {
          if (subjectMap[oldKey]) {
            const newKey = subjectMap[oldKey];

            // copy value
            row[newKey] = row[oldKey];

            // delete old key
            delete row[oldKey];
          }
        }
      }

      for (let i = 0; i < parsedData.length; i++) {
        const student = parsedData[i];

        const subjects = [
          "Handwriting",
          "Drawing & Colouring",
          "General Knowledge",
          "Mental Maths",
        ];

        if (subjects.length > 0) {
          try {
            // Pass folder path to PDF generator
            const pdfPath = await generateCertificatePDF(
              student,
              schoolName,
              outputFolder
            );
            // console.log("📄 Certificate saved:", pdfPath);
          } catch (err) {
            console.error("PDF generation failed for:", student.Name, err);
          }
        }

        const line =
          `${student.Name} - ` +
          subjects.map((s) => `${s.value} in ${s.subject}`).join(", ");

        certificateTexts.push(line);
      }
    }

    // Save TXT summary to folder
    // const saveTextPath = path.join(outputFolder, "certificates.txt");

    // fs.writeFileSync(saveTextPath, certificateTexts.join("\n"), "utf8");

    return {
      status: "success",
      message: "Excel parsed, certificates generated, text file saved.",
      data: parsedData,
    };
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

  // console.log("Parsed object:", parsedData);

  return {
    status: "success",
    message: "File parsed successfully",
    // data: parsedData, // <<< your JavaScript object
  };
});

// function generateCertificateText(obj, schoolName) {
//   const subjects = [
//     "Handwriting",
//     "Drawing & Colouring",
//     "General Knowledge",
//     "Mental Maths",
//   ];

//   const studentName = obj.Name;

//   // Find subject keys present in the object
//   const foundSubjects = Object.keys(obj).filter((key) =>
//     subjects.includes(key)
//   );

//   // Build text for valid subjects only
//   const parts = foundSubjects
//     .map((sub) => {
//       const value = obj[sub];

//       // Skip empty or Participant
//       if (!value || value.trim() === "") {
//         return null;
//       }

//       return `${value} in ${sub}`;
//     })
//     .filter(Boolean); // remove nulls

//   if (parts.length === 0) {
//     return null; // or return a message — your choice
//   }

//   const text = parts.join(", ");
//   return `This is to certify that ${studentName} of ${schoolName} has achieved excellence as ${text}.`;
// }

// const subjectsList = [
//   "Handwriting",
//   "Drawing & Colouring",
//   "General Knowledge",
//   "Mental Maths",
// ];

// function extractSubjects(obj) {
//   const subjects = [];

//   subjectsList.forEach((sub) => {
//     if (obj[sub] && obj[sub].trim() !== "") {
//       subjects.push({ subject: sub, value: obj[sub] });
//     }
//   });

//   return subjects;
// }
// const validSubjects = [
//   "Handwriting",
//   "Drawing & Colouring",
//   "General Knowledge",
//   "Mental Maths",
// ];
// async function generateCertificatePDF(studentObj, schoolName) {
//   const studentName = studentObj.Name;

//   // Extract available subjects
//   const subjectsArray = validSubjects
//     .filter((s) => studentObj[s] && studentObj[s].trim() !== "")
//     .map((s) => ({ subject: s, value: studentObj[s] }));

//   if (subjectsArray.length === 0) {
//     console.log("No subjects found for:", studentName);
//     return null;
//   }

//   const pdfDoc = await PDFDocument.create();
//   const page = pdfDoc.addPage([595.28, 841.89]); // A4

//   const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
//   const timesBold = await pdfDoc.embedFont(StandardFonts.TimesBold);
//   const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesItalic);

//   const fontSize = 20;

//   const mainText = "This is to certify that";
//   const midText = `of ${schoolName} has achieved excellence as`;

//   // Layout setup
//   const { width, height } = page.getSize();
//   const centerX = width / 2;
//   let y = height / 2 + 60;

//   // Line: "This is to certify that"
//   page.drawText(mainText, {
//     x: centerX - timesRoman.widthOfTextAtSize(mainText, fontSize) / 2,
//     y,
//     font: timesRoman,
//     size: fontSize,
//   });

//   // Student Name (BOLD)
//   y -= 30;
//   page.drawText(studentName, {
//     x: centerX - timesBold.widthOfTextAtSize(studentName, fontSize + 4) / 2,
//     y,
//     font: timesBold,
//     size: fontSize + 4,
//   });

//   // School Line
//   y -= 30;
//   const schoolLine = `of ${schoolName}`;
//   page.drawText(schoolLine, {
//     x: centerX - timesBold.widthOfTextAtSize(schoolLine, fontSize) / 2,
//     y,
//     font: timesBold,
//     size: fontSize,
//   });

//   // Excellence text
//   y -= 30;
//   page.drawText(midText, {
//     x: centerX - timesRoman.widthOfTextAtSize(midText, fontSize) / 2,
//     y,
//     font: timesRoman,
//     size: fontSize,
//   });

//   // Achievements (italic value + normal subject)
//   y -= 40;
//   let cursorX = centerX - 200; // starting slightly left so text stays centered visually

//   subjectsArray.forEach(({ subject, value }) => {
//     // Italic value
//     page.drawText(value, {
//       x: cursorX,
//       y,
//       font: timesItalic,
//       size: fontSize,
//     });

//     cursorX += timesItalic.widthOfTextAtSize(value, fontSize) + 8;

//     // " in "
//     page.drawText(" in ", {
//       x: cursorX,
//       y,
//       font: timesRoman,
//       size: fontSize,
//     });

//     cursorX += timesRoman.widthOfTextAtSize(" in ", fontSize);

//     // Subject name
//     page.drawText(subject, {
//       x: cursorX,
//       y,
//       font: timesRoman,
//       size: fontSize,
//     });

//     cursorX += timesRoman.widthOfTextAtSize(subject, fontSize) + 25;
//   });

//   // Save File
//   const pdfBytes = await pdfDoc.save();
//   const savePath = path.join(app.getPath("documents"), `${studentName}.pdf`);
//   fs.writeFileSync(savePath, pdfBytes);

//   return savePath;
// }

const validSubjects = [
  "Handwriting",
  "Drawing & Colouring",
  "General Knowledge",
  "Mental Maths",
];

async function generateCertificatePDF(studentObj, schoolName, outputFolder) {
  const studentName = studentObj.Name.toUpperCase();

  schoolName = schoolName.toUpperCase();
  // Extract available subjects
  const subjectsArray = validSubjects
    .filter((s) => studentObj[s] && studentObj[s].trim() !== "")
    .map((s) => ({ subject: s, value: studentObj[s] }));

  if (subjectsArray.length === 0) {
    console.log("No subjects found for:", studentName);
    return null;
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4

  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await pdfDoc.embedFont(
    StandardFonts.TimesRomanBoldItalic
  );

  const fontSize = 20;
  const firstSub = subjectsArray.shift();
  // console.log(firstSub)
  const firstSubjectValue = `${firstSub.value}`;
  const firstSubjectName = `${firstSub.subject}`;
  const mainText = "This is to certify that";
  const midText = `has achieved excellence as`;

  const { width, height } = page.getSize();
  const centerX = width / 2;
  let y = height / 2 + 60 - 40;

  // Main text
  page.drawText(mainText, {
    x: centerX - timesRoman.widthOfTextAtSize(mainText, fontSize) / 2,
    y,
    font: timesRoman,
    size: fontSize,
  });

  // Student Name (bold)
  y -= 30;
  const studentWidth = timesBold.widthOfTextAtSize(studentName, fontSize + 6);
  page.drawText(studentName, {
    x: centerX - timesBold.widthOfTextAtSize(studentName, fontSize + 4) / 2,
    y,
    font: timesBold,
    size: fontSize + 4,
  });
  // Draw " of" (NOT bold)
  page.drawText("of", {
    x: centerX - studentWidth / 2 + studentWidth, // directly after name
    y,
    font: timesRoman, // non-bold font
    size: fontSize + 4,
  });

  // School line
  y -= 30;
  const schoolLine = `${schoolName}`;
  page.drawText(schoolLine, {
    x: centerX - timesBold.widthOfTextAtSize(schoolLine, fontSize) / 2,
    y,
    font: timesBold,
    size: fontSize,
  });

  // Mid text
  y -= 30;
  const midWidth = timesRoman.widthOfTextAtSize(midText, fontSize);
  const valueWidth = timesItalic.widthOfTextAtSize(firstSubjectValue, fontSize);
  const inWidth = timesRoman.widthOfTextAtSize(" in ", fontSize);
  const subjectWidth = timesRoman.widthOfTextAtSize(firstSubjectName, fontSize);

  // Total width of the entire line
  const totalWidth = midWidth  + valueWidth + inWidth + subjectWidth;

  // Starting X (centered)
  let positionX = centerX - totalWidth / 2;
  // Draw mid text
  page.drawText(midText, {
    x: positionX,
    y,
    font: timesRoman,
    size: fontSize,
  });
  positionX += midWidth + 10; // spacing after mid text

  // Draw the first subject value (italic)
  page.drawText(firstSubjectValue, {
    x: positionX,
    y,
    font: timesItalic,
    size: fontSize,
  });
  positionX += valueWidth;

  // Draw " in "
  page.drawText(" in ", {
    x: positionX,
    y,
    font: timesRoman,
    size: fontSize,
  });
  positionX += inWidth;

  // Draw subject name
  page.drawText(firstSubjectName, {
    x: positionX,
    y,
    font: timesRoman,
    size: fontSize,
  });

  // Subjects
  const maxWidth = 850;
  const lineSpacing = fontSize + 10;
  y -= 30;

  // Step 1: Build text chunks with measured widths
  const chunks = subjectsArray.map(({ subject, value }) => {
    const text = `${value} in ${subject}`;
    const width =
      timesItalic.widthOfTextAtSize(value, fontSize) +
      timesRoman.widthOfTextAtSize(" in ", fontSize) +
      timesRoman.widthOfTextAtSize(subject, fontSize);

    return { value, subject, text, width };
  });

  // Step 2: Break into centered lines
  let lines = [];
  let currentLine = [];
  let currentWidth = 0;

  chunks.forEach((chunk) => {
    if (currentWidth + chunk.width + 30 > maxWidth) {
      lines.push(currentLine);
      currentLine = [];
      currentWidth = 0;
    }
    currentLine.push(chunk);
    currentWidth += chunk.width + 30;
  });

  if (currentLine.length > 0) lines.push(currentLine);

  // Step 3: Draw each centered line
  // Step 3: Draw each centered line
  lines.forEach((line, lineIndex) => {
    const isLastLine = lineIndex === lines.length - 1;

    // compute actual line width
    let lineWidth = 0;
    line.forEach((c) => (lineWidth += c.width + 30));
    lineWidth -= 30;

    let cursorX = centerX - lineWidth / 2;

    line.forEach((chunk, index) => {
      const { value, subject } = chunk;
      const isLast = index === line.length - 1;
      const isSecondLast = index === line.length - 2;

      const widthValue = timesItalic.widthOfTextAtSize(value, fontSize);
      const widthIn = timesRoman.widthOfTextAtSize(" in ", fontSize);
      const widthSubject = timesRoman.widthOfTextAtSize(subject, fontSize);

      // VALUE
      page.drawText(value, {
        x: cursorX,
        y,
        font: timesItalic,
        size: fontSize,
      });
      cursorX += widthValue + 5;

      // "in "
      page.drawText("in ", {
        x: cursorX,
        y,
        font: timesRoman,
        size: fontSize,
      });
      cursorX += widthIn;

      // SUBJECT
      page.drawText(subject, {
        x: cursorX,
        y,
        font: timesRoman,
        size: fontSize,
      });
      cursorX += widthSubject + 5;

      // --------- NEW LOGIC ---------
      if (!isLast) {
        if (isLastLine && isSecondLast) {
          // ONLY the last line gets "and"
          const widthAnd = timesRoman.widthOfTextAtSize(" and ", fontSize);
          page.drawText(" and ", {
            x: cursorX,
            y,
            font: timesRoman,
            size: fontSize,
          });
          cursorX += widthAnd;
        } else {
          // All previous lines get commas
          const widthComma = timesRoman.widthOfTextAtSize(", ", fontSize);
          page.drawText(", ", {
            x: cursorX,
            y,
            font: timesRoman,
            size: fontSize,
          });
          cursorX += widthComma;
        }
      }
    });

    y -= lineSpacing;
  });

  // -----------------------------
  // SAVE TO DOCUMENTS FOLDER
  // -----------------------------
  // const documentsFolder = app.getPath("documents");
  // const outputFolder = path.join(documentsFolder, "DOCUMENTED PDF");

  // // Create folder if it doesn't exist
  // if (!fs.existsSync(outputFolder)) {
  //   fs.mkdirSync(outputFolder, { recursive: true });
  // }

  const pdfBytes = await pdfDoc.save();
  const savePath = path.join(outputFolder, `${studentName}.pdf`);

  fs.writeFileSync(savePath, pdfBytes);

  return savePath;
}
