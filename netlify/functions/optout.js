// netlify/functions/optout.js
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

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body || "{}");
    const email = normalizeEmail(body.email || "");
    const phone = normalizePhone(body.phone || "");
    const requestType = body.request_type || "do-not-sell";

    if (!email && !phone) {
      return { statusCode: 400, body: JSON.stringify({ error: "Email or phone required" }) };
    }

    const sheets = await getSheetsClient();

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: "OptOuts!A:E",
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          new Date().toISOString(),
          email,
          phone,
          requestType,
          body.notes || ""
        ]]
      }
    });

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true })
    };
 } catch (e) {
  console.error("OPTOUT_ERROR", e);

  return {
    statusCode: 500,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      error: "Server error",
      detail: e?.message ? e.message : String(e)
    })
  };
}
