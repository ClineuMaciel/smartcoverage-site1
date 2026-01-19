const { google } = require("googleapis");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body || "{}");
    const email = normalizeEmail(body.email);
    const phone = normalizePhone(body.phone);
    const request_type = String(body.request_type || "do-not-sell");

    if (!email && !phone) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ok: false, error: "Email or phone is required" }),
      };
    }

    const SHEET_ID = process.env.GOOGLE_SHEETS_ID;

const CLIENT_EMAIL =
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;

let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY || "";

// Convert literal "\n" into real newlines (safe even if there are none)
PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, "\n").trim();


    if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
      return {
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: "Missing env vars",
          missing: {
            GOOGLE_SHEETS_ID: !SHEET_ID,
            GOOGLE_SERVICE_ACCOUNT_EMAIL_or_GOOGLE_CLIENT_EMAIL: !CLIENT_EMAIL,
            GOOGLE_PRIVATE_KEY: !PRIVATE_KEY,
          },
        }),
      };
    }

    const auth = new google.auth.JWT({
      email: CLIENT_EMAIL,
      key: PRIVATE_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const row = [
      new Date().toISOString(),
      email,
      phone,
      request_type,
      "submitted via do-not-sell page",
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "OptOuts!A:E",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true }),
    };
  } catch (e) {
    console.error("OPTOUT_ERROR", e);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Server error", detail: String(e) }),
    };
  }
};

