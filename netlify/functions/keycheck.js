exports.handler = async () => {
  let k = (process.env.GOOGLE_PRIVATE_KEY || "").trim();

  // Remove wrapping quotes if any
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1);
  }

  const rawLen = k.length;

  // Convert literal \n to real newlines if present
  if (k.includes("\\n")) k = k.replace(/\\n/g, "\n");

  // Remove Windows carriage returns
  k = k.replace(/\r/g, "");

  const info = {
    rawLen,
    len: k.length,
    startsWithDash: k.startsWith("-----BEGIN"),
    hasBegin: k.includes("BEGIN PRIVATE KEY"),
    hasEnd: k.includes("END PRIVATE KEY"),
    beginIndex: k.indexOf("-----BEGIN PRIVATE KEY-----"),
    endIndex: k.indexOf("-----END PRIVATE KEY-----"),
    newlineCount: (k.match(/\n/g) || []).length,
    hasLiteralBackslashN: (process.env.GOOGLE_PRIVATE_KEY || "").includes("\\n"),
    // Checks whether the body looks like base64-ish (letters/numbers + / + + + =)
    looksBase64ish: /MII[A-Za-z0-9+/=]/.test(k),
    containsSpaces: /\s/.test((process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "")),
  };

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(info, null, 2),
  };
};
