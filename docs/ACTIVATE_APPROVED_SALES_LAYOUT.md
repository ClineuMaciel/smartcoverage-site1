# Activate the approved sales layout in the existing live Google spreadsheet

The downloadable SearchNRate_Leads_Separate_Dates.xlsx is a prepared snapshot with formulas, not an independently activated connection. Its four operational headers match sales-schema.json. The live connection is controlled by Netlify's GOOGLE_SHEETS_ID and its existing Google service account.

Use the original live spreadsheet as the single destination. Keep GOOGLE_SHEETS_ID unchanged. Do not use File > Import > Replace spreadsheet: that would remove current evidence and opt-out tabs that the public endpoints need.

## Before copying

1. Open the original SearchNRate Leads spreadsheet containing the recent LeadEvidence test rows. Use File > Make a copy to keep a complete backup. Keep working in the original afterward.
2. Open the separately imported SearchNRate_Leads workbook with the approved styled Sales List. The Parameters row saying Snapshot only identifies this copy as the prepared workbook, not proof of a live connection.
3. Preserve the original Sales Log and Call Register, including any transactions or call records. Preserve staff notes/review changes from the current live Sales List; transfer any such changes by Lead ID after copying the approved layout. Never match by row position.

## Replace only the working Sales List view

1. In SearchNRate_Leads, use the arrow beside the Sales List tab, then Copy to > Existing spreadsheet. Choose the original SearchNRate Leads file.
2. Return to the original file. Confirm a new tab such as Copy of Sales List appears and has the approved layout and historical records.
3. Rename its previous Sales List tab to Sales List Before Upgrade. Retain it as a backup.
4. Rename the copied tab to exactly Sales List, including the space.
5. Complete those two renames together. A scheduled run during the brief gap may fail or recreate a missing tab. If it does, keep all copies and resolve canonical tab names before continuing; never delete evidence. Incoming quote/callback capture remains on LeadEvidence independently.
6. Keep the original Sales Log, Call Register, Parameters, OptOuts, Leads, LeadEvidence and BuyerDeliveries tabs. Do not replace them with blank/history-limited versions from the download.
7. Optionally copy Suppressed Leads and Buyer Review from the prepared file into the original for historical review. They do not replace the authoritative OptOuts list. Do not copy the prepared OptOuts tab over the live one.

## Activate and verify

1. Confirm the new GitHub release has published to Netlify production.
2. In Netlify, choose smart-coverage > Functions > sales-register-sync > Run now, or wait for the next successful five-minute scheduled run.
3. Confirm SALES_REGISTER_SYNC_OK in the function log. If it fails, capture the log without sharing private keys. The worker refuses mismatched headings rather than rewriting unknown data.
4. In the original spreadsheet, Parameters B2 should advance to the current UTC review time, and B6 should show Live evidence projection. Check again after another run to verify advancement.
5. Sales List should include eligible existing accepted LeadEvidence records under their original UUIDs and preserve imported historical SNR IDs. They remain on hold pending verification. Tests/opt-outs stay excluded. No buyer forwarding is enabled.
6. The worker sorts whole rows A:AS by Source timestamp UTC descending, excludes the header, re-reads the sorted rows and restores row-relative formulas. IDs, contacts, staff review fields and buyer notes move together. ID-based Sales Log links remain intact.
7. The original 32 historical review records are not automatically proven genuine or buyer-ready by this migration. Check for duplicates between the historical snapshot and new evidence before any sale; preserving IDs is not a contact-level deduplication guarantee.

The old separately imported workbook may be renamed SearchNRate Layout Reference after verification to prevent it being mistaken for the live database. Keep the old live working-tab backup until notes and IDs have been reconciled. A successful import, matching headers or published commit alone does not prove the authenticated live spreadsheet has synchronized.
