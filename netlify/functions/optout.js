    const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
    const CLIENT_EMAIL =
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;

    let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY || "";
    // Netlify often stores newlines as the two characters "\n"
    PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, "\n").trim();

    if (!SHEET_ID) {
      return {
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ok: false, error: "Missing GOOGLE_SHEETS_ID" }),
      };
    }

    if (!CLIENT_EMAIL) {
      return {
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ok: false, error: "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_CLIENT_EMAIL" }),
      };
    }

    if (!PRIVATE_KEY.includes("BEGIN PRIVATE KEY")) {
      return {
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ok: false, error: "GOOGLE_PRIVATE_KEY does not look like a PEM key" }),
      };
    }

    const auth = new google.auth.JWT({
      email: CLIENT_EMAIL,
      key: PRIVATE_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

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

