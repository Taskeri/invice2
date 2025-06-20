const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
const { OpenAI } = require("openai");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Google Sheets setup
const SHEET_ID = "1bqD5ScJpb_PdIQHSQKMS7_mbdhecztbZMMjF1yfuIkA";
const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Login endpoint
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "user!A2:C",
    });

    const rows = result.data.values || [];
    const user = rows.find((row) => row[0] === username && row[1] === password);

    if (user) {
      res.json({ success: true, username: user[0], role: user[2] });
    } else {
      res.status(401).json({ success: false, message: "שם משתמש או סיסמה שגויים." });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "שגיאה בשרת." });
  }
});

// Submit invoice endpoint
app.post("/submit-invoice", async (req, res) => {
  const { date, supplier, invoiceNumber, total, vat, items, uploadedBy } = req.body;

  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "invoices!A2:G",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[date, supplier, invoiceNumber, total, vat, items, uploadedBy]],
      },
    });

    res.json({ success: true, message: "החשבונית נשמרה בהצלחה!" });
  } catch (err) {
    console.error("Invoice submission error:", err);
    res.status(500).json({ success: false, message: "שגיאה בשמירת החשבונית." });
  }
});

// Extract fields using OpenAI GPT
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/extract-fields", async (req, res) => {
  const { ocrText } = req.body;

  const prompt = `
הטקסט הבא נלקח מסריקה של חשבונית. אנא חלץ את השדות הבאים בפורמט JSON:
{
  "invoiceNumber": "",
  "date": "",
  "total": "",
  "vat": "",
  "supplier": "",
  "time": ""
}
טקסט:
"""${ocrText}"""
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const responseText = completion.choices[0].message.content;
    const jsonStart = responseText.indexOf("{");
    const jsonText = responseText.slice(jsonStart);
    const parsed = JSON.parse(jsonText);

    res.json({ success: true, fields: parsed });
  } catch (err) {
    console.error("OpenAI error:", err);
    res.status(500).json({ success: false, error: "שגיאה בשליפת נתונים מה-GPT" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
