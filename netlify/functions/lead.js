// netlify/functions/lead.js

const { google } = require("googleapis");

/** Helper: normalize email */
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/** Helper: normalize phone to digits only */
function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

/** Helper: pull client IP from Netlify headers */
function getClientIp(event) {
  const h = event.headers || {};
  return (
    h["x-nf-client-connection-ip"] ||
    (h["x-forwarded-for"] || "").split(",")[0].trim() ||
    h["client-ip"] ||
    ""
  );
}

/** Build a buyer-friendly payload from the incoming body & context */
function buildBuyerPayload(params) {
  const {
    body,
    isBlocked,
    timestampISO,
    ip,
    environment,
  } = params;

  const email = normalizeEmail(body.email);
  const phoneDigits = normalizePhone(body.phone);
  const leadType = body.lead_type || body.coverage_type || "auto";
  const zip = String(body.zip || "").trim();

  const utm_source = body.utm_source || "";
  const utm_medium = body.utm_medium || "";
  const utm_campaign = body.utm_campaign || "";
  const utm_term = body.utm_term || "";
  const utm_content = body.utm_content || "";
  const gclid = body.gclid || "";

  const sourceUrl = body.source_url || "";
  const userAgent = body.user_agent || "";
  const tcpaText = (body.tcpa_text || "").trim();

  // Simple lead id for buyer logs (can later be replaced with a DB id)
  const leadId =
    body.lead_id ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    lead_id: leadId,
    vertical: leadType, // ex: "auto", "home", "bundle"
    lead_status: isBlocked ? "blocked" : "accepted",

    contact: {
      first_name: (body.first_name || "").trim(),
      last_name: (body.last_name || "").trim(),
      email,
      phone: phoneDigits,
    },

    address: {
      postal_code: zip,
      country: "US",
    },

    vehicle: {
      year: body.vehicle_year || "",
      make: body.vehicle_make || "",
      model: body.vehicle_model || "",
    },

    property: {
      home_type: body.home_type || "",
      ownership: body.home_ownership || "",
    },

    tcpa: {
      consent_text: tcpaText,
      consent_timestamp: timestampISO,
      consent_url: sourceUrl,
      ip_address: ip,
      user_agent: userAgent,
      consent_channel: "web_form",
    },

    traffic: {
      source_url: sourceUrl,
      landing_page: sourceUrl,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      gclid,
    },

    compliance_flags: {
      is_opted_out: !!isBlocked,
      // Extend later with state rules, credit use, etc.
    },

    meta: {
      form_version: "v1-seo-2026-01",
      site: "searchnrate.com",
      environment,
    },
  };
}

/**
 * Netlify function: / .netlify / functions / lead
 * 1) Checks opt-out sheet
 * 2) Writes lead to "Leads" sheet
 * 3) Builds buyerPayload and logs it (dry-run)
 */
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ok: false, error: "Method Not Allowed" }),
      };
    }

    const body = JSON.parse(event.body || "{}");

    const email = normalizeEmail(body.email);
    const phoneDigits = normalizePhone(body.phone);

    if (!email && !phoneDigits) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: "Email or phone required",
        }),
      };
    }

    const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
    const CLIENT_EMAIL =
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      process.env.GOOGLE_CLIENT_EMAIL;

    let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY || "";

    // Convert literal "\n" into real newlines (safe either way)
    PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, "\n").trim();

    if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
      console.error("ENV_MISSING", {
        SHEET_ID: !!SHEET_ID,
        CLIENT_EMAIL: !!CLIENT_EMAIL,
        PRIVATE_KEY: PRIVATE_KEY ? "present" : "missing",
      });
      return {
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: "Missing Google Sheets configuration",
        }),
      };
    }

    const auth = new google.auth.JWT({
      email: CLIENT_EMAIL,
      key: PRIVATE_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    /* ── 1) CHECK OPTOUTS SHEET ─────────────────────────────── */

    const optoutRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "OptOuts!A:C", // [timestamp, email, phone]
    });

    const optRows = optoutRes.data.values || [];

    const isBlocked = optRows.some((row) => {
      const optEmail = normalizeEmail(row[1]);
      const optPhone = normalizePhone(row[2]);
      return (
        (email && optEmail && email === optEmail) ||
        (phoneDigits && optPhone && phoneDigits === optPhone)
      );
    });

    /* ── 2) WRITE TO LEADS SHEET ───────────────────────────── */

    const timestampISO = new Date().toISOString();
    const zip = String(body.zip || "").trim();
    const leadType = body.lead_type || body.coverage_type || "auto";
    const sourceUrl = body.source_url || "";
    const tcpaText = (body.tcpa_text || "").trim();

    // Keep existing columns for compatibility (A:J)
    const row = [
      timestampISO,           // A: timestamp
      email,                  // B: email
      phoneDigits,            // C: phone
      body.first_name || "",  // D: first name
      body.last_name || "",   // E: last name
      zip,                    // F: zip
      leadType,               // G: lead_type / coverage_type
      sourceUrl,              // H: source_url
      tcpaText,               // I: tcpa_text
      isBlocked ? "blocked" : "accepted", // J: status
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Leads!A:J",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });

    /* ── 3) BUILD BUYER PAYLOAD (DRY RUN) ──────────────────── */

    const ip = getClientIp(event);
    const environment = process.env.CONTEXT || "production";

    const buyerPayload = buildBuyerPayload({
      body,
      isBlocked,
      timestampISO,
      ip,
      environment,
    });

    // DRY RUN: just log what we'd send to buyers
    // You can later replace this with actual POST requests to buyer APIs.
    console.log("BUYER_PAYLOAD_DRY_RUN", JSON.stringify(buyerPayload));

    // If you want, you can return the lead_id so front-end / logs can match:
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: true,
        status: isBlocked ? "blocked" : "accepted",
        lead_id: buyerPayload.lead_id,
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
        detail: String(e),
      }),
    };
  }
};
