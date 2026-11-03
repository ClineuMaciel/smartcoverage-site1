# SearchNRate evidence and direct buyer calls

## What this release does

The existing Google Sheets connection stores new request evidence in **LeadEvidence**, and delivery holds in **BuyerDeliveries**. The first successful submission creates these tabs if the service account can edit the spreadsheet. Existing Leads A:J writes remain compatible with the existing function. The old Leads headings were misaligned; use LeadEvidence as the authoritative new export. Historical records are not upgraded or assigned missing consent.

Evidence includes a server-generated lead ID and UTC received time, submission ID, server-observed Netlify IP and User-Agent, exact server-owned disclosure text/version/hash, checked consent assertion, client timestamps (not independently verified), source and referrer (client-reported), traffic parameters, contact details, coverage choice, vehicle and home fields, certificate references and selected approved buyer names. A hash detects changes only when compared to a separately retained trusted copy; it does not make Google Sheets immutable.

The form prevents double-click submissions. The handler suppresses repeated submission IDs and same-contact/same-coverage requests within 24 hours in LeadEvidence. Email comparisons ignore case; US phone normalization removes a leading 1. Test email substrings `testlead`, `example`, `maciel777` and names marked TEST/DO NOT CONTACT are flagged and held. OptOuts is checked before storage and delivery. Existing OptOuts is never deleted.

**Limit:** Google Sheets read/append is not an atomic transaction. Simultaneous requests can still race. Before scaling or charging buyers, use a transactional datastore with unique submission/delivery constraints, durable outbox, retry state, rate limiting and buyer-specific duplicate windows. This release deliberately does not retry buyer posts or claim delivery success.

## Netlify setup

1. Preserve GOOGLE_SHEETS_ID, GOOGLE_PRIVATE_KEY and GOOGLE_SERVICE_ACCOUNT_EMAIL (or GOOGLE_CLIENT_EMAIL). They need Functions scope in Production. Do not put values in GitHub.
2. Keep BUYER_SEND_MODE=dry-run. Unverified submissions are held regardless of this setting in this release.
3. After an actual buyer agreement, add BUYER_AUTO_NAME (public legal/business name) and BUYER_AUTO_PHONE (public inbound buyer/tracking number in +1XXXXXXXXXX format). Set BUYER_AUTO_APPROVED=true only when authorized to display this buyer and send calls.
4. For Home, use BUYER_HOME_NAME, BUYER_HOME_PHONE and BUYER_HOME_APPROVED. Bundle displays available Auto and Home routes.
5. Redeploy. The form gets the current named buyers and disclosure from /.netlify/functions/lead-config. Unapproved buyers and invalid phone numbers are not shown. Do not use API credentials as phone numbers.

The browser opens a direct `tel:` link. SearchNRate does not place the call, record it, infer caller identity, prove connection, guarantee buyer availability, or log a successful call. A call alone grants no future marketing authorization. To monetize calls, obtain the buyer's assigned tracking number and agreed state, hours, duration, qualification and payout rules. Connection/answer/duration evidence requires the buyer's call platform and authenticated signed webhook integration. Add recording disclosures only for the actual recording configuration and applicable locations.

## Buyer activation still required

No buyer-specific schema or agreement was supplied. Consequently this release collects evidence but **does not forward leads**, even if the old environment says live. BuyerDeliveries records the reason for each hold. Do not advertise buyer acceptance or approved compliance.

- Obtain buyer-required fields, supported states, lead age, duplicate window, exclusivity, test endpoint, authentication, success/rejection schema and signed-off consent language.
- Install the buyer-approved TrustedForm/Jornaya web capture script from the provider account. The form provides xxTrustedFormCertUrl and universal_leadid capture fields. The form POST sends their references when present, but no provider script is enabled by this release. Do not synthesize certificates.
- Implement provider-side retain/match/verification and agreed retention under the actual account. Submitted URLs are **not verified certificates**. LeadEvidence explicitly records not_verified. No old evidence is fabricated.
- Add buyer-specific delivery mapping, validation, consent-provider verification, suppression/DNC decisions, certificate retention and delivery receipts before replacing the hold with live dispatch. Record buyer acceptance separately from HTTP transport success.
- Add any further qualifying fields only after the buyer supplies its specification. The present form is not a full underwriting questionnaire.
- Review privacy, actual legal entity, retention, contact channel and buyer-approved disclosures. The policy hash is an engineering record, not a legal determination.

## Verify after deploy

Use your own controlled contact data and a TEST name. Verify LeadEvidence contains the server IP/browser, correct current disclosure hash and qualifications. Verify Leads receives a compatible row. Retry the same request and verify duplicate response. Opt-out matches must return blocked. With buyer settings absent, no Call Now destination or outbound post must occur. After configuring an authorized inbound number, check Auto/Home/Bundle show only the correct public route. Test a real connection with the buyer in its agreed test window.

Local checks: `node --test tests/lead.test.js`. Tests mock Google Sheets and do not contact buyers. Production credentials, provider certificates and inbound call connection have not been tested by these unit tests.

References reviewed November 3, 2026:
- https://summitleads.ai/sell-your-leads/insurance
- https://integrity.com/leadgenguidelines/
- https://support.activeprospect.com/hc/en-us/articles/44098187844756-Getting-Started-for-Lead-Buyers-with-the-API
- https://docs.netlify.com/build/functions/api/

## Premier Seguranza office override

At the owner's direction, a successful ZIP-state lookup for TN or MS shows **Call our office: (901) 266-5507** (`tel:+19012665507`). Other states do not get this office link. ZIP-state lookup uses https://api.zippopotam.us/us/{zip} with a four-second timeout. Missing, ambiguous or failed lookup leaves the office route unavailable; ZIP is not a verified residence. LeadEvidence stores the lookup state and office route. The office call is user initiated and does not grant future marketing consent. This route does not automatically send contact details to the office or certify caller eligibility. No live call was placed in testing.
