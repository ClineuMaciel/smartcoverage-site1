# Premier Seguranza request notifications

This change reserves TN/MS quote requests for Premier Seguranza at all hours, excludes TN/MS from call buyer offers, and makes the sales register show OFFICE ONLY for TN/MS. Callback requests nationwide remain service-only, never buyer-sale consent.

Email delivery is DISABLED until the production sending service is configured and tested. A working Outlook inbox does not configure the website sender.

## Activation

1. Create a Resend account at https://resend.com and verify a dedicated sending subdomain such as notify.searchnrate.com. Add only the exact records Resend provides for that subdomain in Netlify DNS. Preserve the Microsoft 365 root MX, SPF, verification and CNAME records. Do not enable receiving on the sending subdomain or replace the root MX.
2. Create a sending-only API key restricted to the verified domain. Enter it directly in Netlify environment variables as RESEND_API_KEY. Never put keys in GitHub or chat.
3. Set OFFICE_EMAIL_FROM to the verified sender, e.g. SearchNRate <leads@notify.searchnrate.com>.
4. Set OFFICE_EMAIL_START_UTC to the actual activation timestamp in ISO UTC. This prevents automatic historical forwarding. Only new TN/MS quote requests with office_only gate, or new nationwide callbacks with callback.2 permission, qualify. Old consent is never upgraded.
5. Set OFFICE_EMAIL_ENABLED=true and redeploy. The office-email-sync scheduled function runs every five minutes. Do not invoke overlapping manual runs.
6. Submit one authorized, non-test request using contact details you control and the current form permission. Test-marked requests never send. Check miked@premierseguranza.com and the OfficeNotifications tab in the existing live workbook. API acceptance is not delivery confirmation; verify the inbox/provider events.
7. Check repeated scheduled runs leave one ledger record/email for that lead ID. Check tests and opt-outs remain excluded, and TN/MS sales rows show OFFICE ONLY after sales sync.

The recipient is fixed in code to miked@premierseguranza.com. The notification includes name, phone, email when supplied, ZIP/state, coverage, vehicle/home details, callback needs, received UTC, lead ID and the actual permission text. It does not send IP/browser metadata or consent certificate secrets.

## Failures and operations

OfficeNotifications logs sending, accepted_by_provider, rejected_review_required or unknown_review_required. A crash can leave sending. These states require provider reconciliation; the worker does not automatically resend an attempted ID. Check this tab daily. The provider idempotency key is office/<lead ID>. Never delete ledger rows just to retry; inspect the provider first. Provider acceptance is not proof of delivery. At most ten new requests are attempted per run. Backlogs require monitoring.

The existing sales-register worker remains independent of email failures. LeadEvidence remains the source record; no email delivery changes call-connected or billable status. Changing OFFICE_EMAIL_ENABLED=false stops subsequent attempts.

## Agents calling consumers

For callbacks outside TN/MS, PS staff may collect information about the request and record the consumer's answers. Do not assert licensing outside authorized states or treat this callback permission as consent to third-party marketing. A staff member must not tick the customer's website consent checkbox or fabricate consent timestamps/certificates. Use an assisted intake process recording the actual caller permission, operator and time, or ask the consumer to complete the quote form themselves. That assisted intake workflow is not implemented by this change.
