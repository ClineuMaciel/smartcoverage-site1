// netlify/functions/lead.js

const { google } = require("googleapis");

// ---------- Helpers ----------

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "").slice(0, 10);
}

function getClientIp(event) {
  const h = event.headers || {};
  return (
    h["x-nf-client-connection-ip"] ||
    h["client-ip"] ||
    (h["x-forwarded-for"]
      ? h["x-forwarded-for"].split(",")[0].trim()
      : "") ||
    ""
  );
}

function getUserAgent(event) {
  const h = event.headers || {};
  return h["user-agent"] || h["User-Agent"] || "";
}

/**
 * Build a clean, standard lead object from the incoming body + request meta
 * This is what we will use for:
 *  - Writing to Google Sheets
 *  - Routing to buyers
 */
function buildLeadObject(body, event) {
  const timestamp = new Date().toISOString();
  const ip = getClientIp(event);
  const userAgent = getUserAgent(event);

  const email = normalizeEmail(body.email);
  const phone = normalizePhone(body.phone);
  const leadTypeRaw = String(body.lead_type || body.coverage_type || "auto");
  const leadType = ["auto", "home", "both"].includes(leadTypeRaw)
    ? leadTypeRaw
    : "auto";

  const zip = String(body.zip || "").trim();

  const sourceUrl =
    body.source_url ||
    event.headers?.referer ||
    event.headers?.Referer ||
    "https://searchnrate.com/";

  const tcpaText = String(body.tcpa_text || "").trim();
  const tcpaConsent = "yes"; // form cannot submit without the checkbox

  return {
    lead_id: `sc_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp,

    product: {
      lead_type: leadType,
      vertical: "insurance"
    },

    consumer: {
      first_name: String(body.first_name || "").trim(),
      last_name: String(body.last_name || "").trim(),
      email,
      phone,
      zip,
      state: "", // optional later if you add state field
      ip,
      user_agent: userAgent,
      is_mobile: /mobile/i.test(userAgent)
    },

    auto: {
      vehicles: [
        {
          year: String(body.vehicle_year || "").trim(),
          make: String(body.vehicle_make || "").trim(),
          model: String(body.vehicle_model || "").trim()
        }
      ]
    },

    home: {
      home_type: String(body.home_type || "").trim(),
      ownership: String(body.home_ownership || "").trim()
    },

    tcpa: {
      consent_text: tcpaText,
      consent_timestamp: timestamp,
      consent_ip: ip,
      source_url: sourceUrl,
      opt_in_channels: ["phone", "sms", "email"]
    },

    tracking: {
      utm_source: String(body.utm_source || ""),
      utm_medium: String(body.utm_medium || ""),
      utm_campaign: String(body.utm_campaign || ""),
      utm_term: String(body.utm_term || ""),
      utm_content: String(body.utm_content || ""),
      gclid: String(body.gclid || ""),
      sub_id: "" // you can set per-buyer later
    }
  };
}

// ---------- Google Sheets persistence ----------

async function appendLeadToSheet(lead, sheets, sheetId, isBlocked) {
  // This matches the header row we agreed on earlier:
  // created_at | ip | user_agent | first_name | last_name | email | phone |
  // zip | lead_type | tcpa_consent | tcpa_text | source_url | status

  const row = [
    lead.timestamp,
    lead.consumer.ip,
    lead.consumer.user_agent,
    lead.consumer.first_name,
    lead.consumer.last_name,
    lead.consumer.email,
    lead.consumer.phone,
    lead.consumer.zip,
    lead.product.lead_type,
    "yes", // tcpa_consent
    lead.tcpa.consent_text,
    lead.tcpa.source_url,
    isBlocked ? "blocked" : "accepted"
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Leads!A:M",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] }
  });
}

async function isLeadBlocked(lead, sheets, sheetId) {
  // OptOuts sheet format: created_at | email | phone
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "OptOuts!A:C"
  });

  const rows = res.data.values || [];
  const email = lead.consumer.email;
  const phone = lead.consumer.phone;

  const normEmail = normalizeEmail(email);
  const normPhone = normalizePhone(phone);

  return rows.some((row) => {
    const rowEmail = normalizeEmail(row[1]);
    const rowPhone = normalizePhone(row[2]);
    return (
      (normEmail && rowEmail && normEmail === rowEmail) ||
      (normPhone && rowPhone && normPhone === rowPhone)
    );
  });
}

// ---------- Buyer routing skeleton (Netlify-only) ----------

async function sendToBuyerAutoA(lead) {
  const endpoint = process.env.BUYER_AUTO_A_ENDPOINT;
  const apiKey = process.env.BUYER_AUTO_A_API_KEY;
  const enabled = process.env.BUYER_AUTO_A_ENABLED === "true";

  if (!enabled || !endpoint) {
    console.log("BUYER_AUTO_A_SKIPPED", {
      enabled,
      hasEndpoint: Boolean(endpoint)
    });
    return { ok: false, reason: "disabled-or-missing-endpoint" };
  }

  // Minimal “universal” payload – adjust later per buyer’s exact spec
  const payload = {
    first_name: lead.consumer.first_name,
    last_name: lead.consumer.last_name,
    email: lead.consumer.email,
    phone: lead.consumer.phone,
    zip: lead.consumer.zip,
    lead_type: lead.product.lead_type,
    tcpa_text: lead.tcpa.consent_text,
    tcpa_timestamp: lead.tcpa.consent_timestamp,
    ip: lead.consumer.ip,
    source: lead.tcpa.source_url,
    sub_id: lead.tracking.sub_id || ""
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  console.log("BUYER_AUTO_A_RESPONSE", {
    status: res.status,
    bodyPreview: text.slice(0, 300)
  });

  return { ok: res.ok, status: res.status };
}

async function sendToBuyerHomeA(lead) {
  const endpoint = process.env.BUYER_HOME_A_ENDPOINT;
  const apiKey = process.env.BUYER_HOME_A_API_KEY;
  const enabled = process.env.BUYER_HOME_A_ENABLED === "true";

  if (!enabled || !endpoint) {
    console.log("BUYER_HOME_A_SKIPPED", {
      enabled,
      hasEndpoint: Boolean(endpoint)
    });
    return { ok: false, reason: "disabled-or-missing-endpoint" };
  }

  // Minimal payload – can be customized per buyer later
  const payload = {
    first_name: lead.consumer.first_name,
    last_name: lead.consumer.last_name,
    email: lead.consumer.email,
    phone: lead.consumer.phone,
    zip: lead.consumer.zip,
    lead_type: lead.product.lead_type,
    home_type: lead.home.home_type,
    ownership: lead.home.ownership,
    tcpa_text: lead.tcpa.consent_text,
    tcpa_timestamp: lead.tcpa.consent_timestamp,
    ip: lead.consumer.ip,
    source: lead.tcpa.source_url,
    sub_id: lead.tracking.sub_id || ""
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  console.log("BUYER_HOME_A_RESPONSE", {
    status: res.status,
    bodyPreview: text.slice(0, 300)
  });

  return { ok: res.ok, status: res.status };
}

/**
 * Router: decide where the lead should go based on lead_type
 * For now this is "safe": if anything fails, it only logs – user still gets 200.
 */
async function routeLead(lead) {
  const type = lead.product.lead_type; // "auto" | "home" | "both"
  const tasks = [];

  if (type === "auto") {
    tasks.push(sendToBuyerAutoA(lead));
  }

  if (type === "home") {
    tasks.push(sendToBuyerHomeA(lead));
  }

  if (type === "both") {
    // Option: split into auto + home for separate buyers
    const autoLead = {
      ...lead,
      product: { ...lead.product, lead_type: "auto" }
    };
    const homeLead = {
      ...lead,
      product: { ...lead.product, lead_type: "home" }
    };
    tasks.push(sendToBuyerAutoA(autoLead));
    tasks.push(sendToBuyerHomeA(homeLead));
  }

  if (!tasks.length) {
    console.log("ROUTER_NO_TASKS", { lead_type: type });
    return;
  }

  const results = await Promise.allSettled(tasks);
  console.log("ROUTER_RESULTS", results);
}

// ---------- Main handler ----------

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
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: "Email or phone is required"
        })
      };
    }

    // Build our master lead object (standard format)
    const lead = buildLeadObject(body, event);

    // env vars (already set in Netlify)
    const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
    const CLIENT_EMAIL =
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      process.env.GOOGLE_CLIENT_EMAIL;
    let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY || "";

    // Support both literal "\n" and real newlines
    PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, "\n").trim();

    if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
      console.error("ENV_MISSING", {
        hasSheet: !!SHEET_ID,
        hasClientEmail: !!CLIENT_EMAIL,
        hasKey: !!PRIVATE_KEY
      });
      return {
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: "Server configuration error"
        })
      };
    }

    const auth = new google.auth.JWT({
      email: CLIENT_EMAIL,
      key: PRIVATE_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 1) Check OptOuts
    const blocked = await isLeadBlocked(lead, sheets, SHEET_ID);

    // 2) Write to Leads sheet
    await appendLeadToSheet(lead, sheets, SHEET_ID, blocked);

    // 3) Route to buyers (fire-and-forget from user perspective)
    try {
      await routeLead(lead);
    } catch (routeErr) {
      console.error("ROUTE_ERROR", routeErr);
      // Do NOT fail the response – you've already captured the lead.
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: true,
        status: blocked ? "blocked" : "accepted"
      })
    };
  } catch (e) {
    console.error("LEAD_ERROR", e);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: "Server error",
        detail: String(e)
      })
    };
  }
};

