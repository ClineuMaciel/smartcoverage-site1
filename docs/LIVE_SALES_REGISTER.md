# Live sales register

Production `sales-register-sync` runs every five minutes using the same Google service account and GOOGLE_SHEETS_ID as the lead endpoint. Existing Leads, LeadEvidence, OptOuts and BuyerDeliveries remain untouched. No new credentials are required. Google Sheets API must be enabled and the service account must remain an editor.

The next successful scheduled run creates Sales List, Sales Log, Call Register and Parameters if missing. It also projects accepted records already in LeadEvidence, not just future records. It does not reconstruct historical records from the old, ambiguous Leads layout. Import the approved cleaned workbook as new tabs if historical review records are wanted; never replace Leads or OptOuts. If Google renames an imported tab, resolve names deliberately before importing again.

An existing tab must match the approved headings exactly. A mismatch stops synchronization rather than overwriting data. Failed synchronization does not stop the existing public lead endpoint from recording a submission. Read Netlify Functions > sales-register-sync > logs for SALES_REGISTER_SYNC_OK or SALES_REGISTER_SYNC_FAILED. Run now can initialize immediately on the production function. Scheduled execution is unavailable on branch previews.

Submission receipt is immediate in LeadEvidence; Sales List normally follows within five minutes of the next successful run. This is eventual synchronization, not a transaction across multiple sheets. One scheduled worker is the only automatic Sales List writer. Avoid simultaneous Run now executions or imports while it is running. Stable Lead IDs prevent sequential repeat imports. Duplicate existing IDs stop the worker for review. Google Sheets appends do not provide a distributed uniqueness lock; this is intended for the current small pilot. Migrate to a transactional database before concurrent delivery or high-volume sales.

## Sales windows and controls

Date UTC and Time UTC are visible separately. Source timestamp UTC remains in column AS for formulas. New records derive from the server's received_at_utc. Historical imported timestamps retain their original provenance. Parameters B2 refreshes on each successful worker run, so ages remain current to the last successful run without relying on spreadsheet timezone. Parameters B3/B4/B5 are editable, strictly increasing age boundaries (defaults 1, 7, 30 days). Age windows are not permission to sell.

The worker restores formula columns B:G and W:AA. Keep staff review inputs H:V, notes AB and original evidence AC:AS intact. New records start with Pending verification and no buyer. Consent observed at form submission is stored as source evidence, not falsely certified for a buyer. Tests and current opt-outs are excluded from new sales inventory. Subsequent opt-outs mark existing rows SUPPRESSED and set opt-out review No. Suppression flags are sticky and must not be cleared just because an opt-out row is deleted. Full evidence stays in LeadEvidence.

Archive means both Options exhausted and Archive approved are Yes; the record stays in the database. A sale's Active, Unknown or missing resale-restriction field holds further delivery review. The explicit Exclusive until UTC value is retained for review; it does not automatically release an exclusivity contract. No automatic buyer delivery, resale, rights release, pricing or payment is implemented here.

Sales Log: one row per transaction Sale ID; reference Lead ID, buyer/user organization, campaign, purchase/use and delivery timestamps, status, price, paid amount, payment time and contract/evidence reference. Update the status on that row, not another transaction. Dates must be numeric Google date/time values entered in UTC. Formula totals cover rows 2–10001. Do not exceed that limit without updating the code.

Call Register: one row per provider Call ID; tracking number, started/connected/ended UTC, caller/state/coverage, recipient/buyer, connected seconds, qualification, provider reference and payment. This release creates its structure only. It does not fabricate call records from clicks, nor connect a tracking provider. Enter verified provider-report records manually until an authenticated provider-specific webhook is implemented after onboarding. Use Sales Log as the authoritative transaction/payment ledger and the same Sale ID in Call Register; do not count the same payout twice.

## Verify after deployment

1. Confirm the latest Netlify production deployment matches the GitHub commit.
2. Under Functions select sales-register-sync, then Run now; inspect logs for a successful run.
3. Open the existing Google spreadsheet and confirm the four tabs appear with separate Date UTC / Time UTC headings. Confirm Parameters B2 advances after a later scheduled run.
4. Submit a real quote request that the owner authorizes. Confirm the same Lead ID in LeadEvidence and Sales List after the next run. A synthetic testing email is deliberately excluded from Sales List. Do not contact buyers during verification.
5. Confirm OptOuts and existing Leads still contain their existing records. Keep historical test exclusions and suppressed records out of sale inventory.

Live row creation cannot be certified by a GitHub commit or a deployment check alone: verify the authenticated spreadsheet and scheduled logs. No customer data or Google private key belongs in this public repository.
