const { google } = require("googleapis");

/**
 * Normalizers
 */
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

    // Parse request body
    const body = JSON.parse(event.body || "{}");

    const email = normalizeEmail(body.email);
    const phone = normalizePhone(body.phone);

    if (!email && !phone) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ok: false, error: "Email or phone required" }),
      };
    }

    // Env vars
    const SHEET_ID = process.env.GOOGLE_SHEETS_ID;

    const CLIENT_EMAIL =
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;

    let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY || "";

    // Convert literal "\n" into real newlines (Netlify often stores it this way)
    PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, "\n").trim();

    // Helpful explicit errors (instead of vague 500)
    if (!SHEET_ID) throw new Error("Missing GOOGLE_SHEETS_ID");
    if (!CLIENT_EMAIL)
      throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_CLIENT_EMAIL");
    if (!PRIVATE_KEY.includes("BEGIN PRIVATE KEY"))
      throw new Error("GOOGLE_PRIVATE_KEY does not look like a PEM key");

    // Auth (Google Sheets API)
    const auth = new google.auth.JWT({
      email: CLIENT_EMAIL,
      key: PRIVATE_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    /**
     * CHECK OPTOUTS TAB (OptOuts!A:C)
     * We assume:
     *   Col A: created_at
     *   Col B: email
     *   Col C: phone
     */
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

    /**
     * SAVE LEAD TO "Leads" TAB
     * This assumes Leads!A:J exists.
     */
    const row = [
      new Date().toISOString(),          // A created_at
      email,                             // B email
      phone,                             // C phone
      body.first_name || "",             // D first_name
      body.last_name || "",              // E last_name
      body.zip || "",                    // F zip
      body.lead_type || "",              // G lead_type
      body.source_url || "",             // H source_url
      body.tcpa_text || "",              // I tcpa_text
      isBlocked ? "blocked" : "accepted" // J status
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
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: "Server error",
        detail: String(e?.message || e),
      }),
    };
  }
};
