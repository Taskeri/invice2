// ocr.js – optional server-side OCR with Tesseract via node wrapper

const Tesseract = require("tesseract.js-node"); // דרוש התקנה עם npm install tesseract.js-node

async function performOCR(imagePath) {
  try {
    const result = await Tesseract.recognize(imagePath, 'eng+heb', {
      logger: m => console.log(m),
    });

    return { success: true, text: result.data.text };
  } catch (err) {
    console.error("OCR error:", err);
    return { success: false, error: err.message };
  }
}

module.exports = { performOCR };
