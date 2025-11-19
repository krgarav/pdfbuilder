const validSubjects = [
  "Handwriting",
  "Drawing & Colouring",
  "General Knowledge",
  "Mental Maths",
];
const path = require("path");
const fs = require("fs");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
async function generateCertificatePDF(studentObj, schoolName) {
  const studentName = studentObj.Name;

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

  const mainText = "This is to certify that";
  const midText = `has achieved excellence as`;

  const { width, height } = page.getSize();
  const centerX = width / 2;
  let y = height / 2 + 60;

  // Main text
  page.drawText(mainText, {
    x: centerX - timesRoman.widthOfTextAtSize(mainText, fontSize) / 2,
    y,
    font: timesRoman,
    size: fontSize,
  });

  // Student Name (bold)
  y -= 30;
  const studentWidth = timesBold.widthOfTextAtSize(studentName, fontSize + 6) ;
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
  page.drawText(midText, {
    x: centerX - timesRoman.widthOfTextAtSize(midText, fontSize) / 2,
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
  // SAVE TO LOCAL FOLDER
  // -----------------------------
  const outputFolder = path.join(__dirname, "pdfdocumented");

  // Create folder if it doesn't exist
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const pdfBytes = await pdfDoc.save();
  const savePath = path.join(outputFolder, `${studentName}.pdf`);

  fs.writeFileSync(savePath, pdfBytes);

  return savePath;
}

module.exports = generateCertificatePDF;
