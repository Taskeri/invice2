const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { OpenAI } = require("openai");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.static("public"));
app.use(express.json());

// Multer להגדרת אחסון קבצים זמני
const upload = multer({ dest: "uploads/" });

// קישור לגוגל שיטס
const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const SHEET_ID = process.env.SHEET_ID;
const SHEET_RANGE = "invoices!A1";

app.post("/upload", upload.single("image"), async (req, res) => {
  const filePath = req.file.path;
  try {
    const imageData = fs.readFileSync(filePath, { encoding: "base64" });
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const result = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Please extract: supplier, invoice number, date, total amount, VAT and item lines." },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${imageData}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const content = result.choices[0].message.content;
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: SHEET_RANGE,
      valueInputOption: "RAW",
      requestBody: {
        values: [[new Date().toLocaleString(), content]],
      },
    });

    res.json({ success: true, data: content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "OCR failed." });
  } finally {
    fs.unlinkSync(filePath); // מחיקת הקובץ הזמני
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
