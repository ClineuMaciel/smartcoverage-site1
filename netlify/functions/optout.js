const { google } = require("googleapis");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

exports.handler = async (event) => {
  try {
    // Only allow POST
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ok: false, error: "Method Not Allowed" }),
      };
    }

    const body = JSON.parse(event.body || "{}");

    const email = normalizeEmail(body.email);
    const phone = normalizePhone(body.phone);
    const request_type = String(body.request_type || "do-not-sell");

    if (!email && !phone) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: "Email or phone required",
        }),
      };
    }

    // Env vars
    const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
    const CLIENT_EMAIL =
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;

    let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY || "";
    PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, "\n").trim();

    if (!SHEET_ID) throw new Error("Missing GOOGLE_SHEETS_ID");
    if (!CLIENT_EMAIL)
      throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_CLIENT_EMAIL");
    if (!PRIVATE_KEY.includes("BEGIN PRIVATE KEY"))
      throw new Error("GOOGLE_PRIVATE_KEY does not look like a PEM key");

    const auth = new google.auth.JWT({
      email: CLIENT_EMAIL,
      key: PRIVATE_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Append opt-out record to OptOuts!A:C
    // Assumed columns:
    //   A: created_at
    //   B: email
    //   C: phone
    const row = [
      new Date().toISOString(),
      email,
      phone,
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "OptOuts!A:C",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: true,
        status: "recorded",
        request_type,
      }),
    };
  } catch (e) {
    console.error("OPTOUT_ERROR", e);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: "Server error",
        detail: String(e?.message || e),
      }),
    };
  }
};
