// netlify/functions/lead.js
import { google } from "googleapis";

function normalizeEmail(email = "") {
  return email.trim().toLowerCase();
}
function normalizePhone(phone = "") {
  return phone.replace(/[^\d]/g, "");
}

async function getSheetsClient() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets"]
  );
  await auth.authorize();
  return google.sheets({ version: "v4", auth });
}

async function isOptedOut(sheets, email, phone) {
  // Pull OptOuts list (simple approach). Later we can optimize caching.
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: "OptOuts!A:E"
  });

  const rows = res.data.values || [];
  // rows[0] is header
  for (let i = 1; i < rows.length; i++) {
    const emailRow = (rows[i][1] || "").trim().toLowerCase();
    const phoneRow = (rows[i][2] || "").replace(/[^\d]/g, "");
    if ((email && emailRow && email === emailRow) || (phone && phoneRow && phone === phoneRow)) {
      return true;
    }
  }
  return false;
}

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    const body = JSON.parse(event.body || "{}");

    const lead = {
      first_name: (body.first_name || "").trim(),
      last_name: (body.last_name || "").trim(),
      email: normalizeEmail(body.email || ""),
      phone: normalizePhone(body.phone || ""),
      zip: (body.zip || "").trim(),
      lead_type: (body.lead_type || "auto").trim(),
      tcpa_consent: body.tcpa_consent === true ? "yes" : "no",
      tcpa_text: (body.tcpa_text || "").trim(),
      source_url: (body.source_url || "").trim()
    };

    // Basic validation
    if (!lead.email && !lead.phone) {
      return { statusCode: 400, body: JSON.stringify({ error: "Email or phone required" }) };
    }
    if (lead.tcpa_consent !== "yes") {
      return { statusCode: 400, body: JSON.stringify({ error: "Consent required" }) };
    }

    const sheets = await getSheetsClient();

    // Block if opted out
    const blocked = await isOptedOut(sheets, lead.email, lead.phone);

    const ip = event.headers["x-nf-client-connection-ip"] || event.headers["x-forwarded-for"] || "";
    const ua = event.headers["user-agent"] || "";

    const row = [
      new Date().toISOString(),
      ip,
      ua,
      lead.first_name,
      lead.last_name,
      lead.email,
      lead.phone,
      lead.zip,
      lead.lead_type,
      lead.tcpa_consent,
      lead.tcpa_text,
      lead.source_url,
      blocked ? "blocked" : "accepted"
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: "Leads!A:M",
      valueInputOption: "RAW",
      requestBody: { values: [row] }
    });

    if (blocked) {
      // Don’t reveal too much; just confirm we won’t process
      return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ ok: true, status: "blocked" }) };
    }

    // Later: forward to buyer(s) here (ping/post), AFTER compliance checks.
    return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ ok: true, status: "accepted" }) };
  } catch (e) {
  console.error("LEAD_ERROR", e);

  return {
    statusCode: 500,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      error: "Server error",
      detail: e?.message ? e.message : String(e)
    })
  };
}
