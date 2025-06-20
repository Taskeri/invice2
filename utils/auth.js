// auth.js – helper to validate users from Google Sheets

const { google } = require("googleapis");

const SHEET_ID = "PASTE_YOUR_SHEET_ID_HERE"; // ← הזן את מזהה הגיליון שלך
const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function validateUser(username, password) {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "user!A2:C",
    });

    const rows = result.data.values || [];
    const user = rows.find(row => row[0] === username && row[1] === password);
    
    if (user) {
      return { valid: true, username: user[0], role: user[2] };
    } else {
      return { valid: false };
    }
  } catch (error) {
    console.error("Error validating user:", error);
    return { valid: false, error: "Internal server error." };
  }
}

module.exports = { validateUser };
