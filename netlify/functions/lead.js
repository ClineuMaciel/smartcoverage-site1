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

    if (!email && !phone) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: "Email or phone required" }),
      };
    }

    const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
    const CLIENT_EMAIL =
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
    let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY || "";

// Works whether Netlify stores literal "\n" or real newlines
if (PRIVATE_KEY.includes("\\n")) {
  PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, "\n");
}

    if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: "Missing env vars" }),
      };
    }

    const auth = new google.auth.JWT({
      email: CLIENT_EMAIL,
      key: PRIVATE_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    /* ── CHECK OPTOUTS ───────────────────────────── */

    const optoutRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "OptOuts!A:C",
    });

    const optRows = optoutRes.data.values || [];

    const isBlocked = optRows.some((row) => {
      const optEmail = normalizeEmail(row[1]);
      const optPhone = normalizePhone(row[2]);
      return (
        (email && optEmail && email === optEmail) ||
        (phone && optPhone && phone === optPhone)
      );
    });

    /* ── SAVE LEAD ───────────────────────────── */

    const row = [
      new Date().toISOString(),
      email,
      phone,
      body.first_name || "",
      body.last_name || "",
      body.zip || "",
      body.lead_type || "",
      body.source_url || "",
      body.tcpa_text || "",
      isBlocked ? "blocked" : "accepted",
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Leads!A:J",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: true,
        status: isBlocked ? "blocked" : "accepted",
      }),
    };
  } catch (e) {
    console.error("LEAD_ERROR", e);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: "Server error", detail: String(e) }),
    };
  }
};
