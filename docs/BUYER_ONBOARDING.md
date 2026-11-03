# SearchNRate buyer onboarding

Prepared November 3, 2026. No application or email has been sent. No buyer contract is accepted. No earnings are guaranteed.

## Business model and negotiation requirements

SearchNRate.com is an owned insurance quote-request website for nationwide Auto, Home and Auto + Home interest. Start with organic search and original multilingual content. Consumer-initiated calls go directly to assigned buyer tracking numbers; SearchNRate does not operate a call center or require its owner to speak to shoppers. Supporting TN/MS office route is Monday–Friday 9 AM–4 PM America/Chicago. Outside that window, TN/MS follows the buyer path. All other states follow approved buyers at any time buyers accept calls.

Prefer month-to-month or termination within 30 days, no 1–2-year lock-in, no minimum volume/spend, no exclusivity, and weekly or Net 15 payments. These are requested terms, not confirmed features of any network. Do not equate Net 15 with a 15-day contract. Keep payout thresholds separate from volume minimums.

Current traffic/call volume and conversion performance: not yet verified. The historical sheet includes tests, duplicates and opt-outs; never use its raw row count as sales-ready volume. Legal contracting entity and tax/banking information require owner confirmation and belong in the provider's secure onboarding, not this public repository.

## Restore the October 22 shortlist

| Network | Earlier finding | Rechecked status | Contract status / next question |
| --- | --- | --- | --- |
| MarketCall | Auto dynamic $2–$72 advertised on an offer directory; older Home $28 at 130 seconds | Treat those figures as offer-specific advertised historical figures, not a negotiated rate. Current live payout depends on offer, ZIP, qualification and approvals. | A public media-transaction agreement describes successive 30-day terms; it covers additional media/card services. Obtain the applicable publisher/call-offer agreement before calling publisher participation month-to-month. |
| LeadsRefer | Auto $22.50 at 180+ seconds; Home $33.75 qualified call | Public homepage still advertises these figures. Public network profile states Net 15, $50 payout threshold, dedicated numbers per affiliate/offer. Each offer needs approval. | Minimum contract length, termination rights, accepted sources, states/hours and reversal rules remain to be confirmed. |
| eLocal | Auto advertised over $28 maximum, depending on geography/quality/duration | Public affiliate page confirms Auto insurance and dashboard call payouts. Historical headline is not a current guaranteed rate. | Request supplier agreement, rate card and month-to-month/30-day exit confirmation. Do not use advertiser/customer contract terms as publisher terms. |

Earlier broad estimates for Datalot/QuoteWizard/SmartFinancial and exclusive web leads were not verified written supplier offers. Keep them as research leads only, not commercial commitments or forecast assumptions. Aragon can remain a comparison candidate, not a replacement for this earlier shortlist. Profitise's current homepage prioritizes solar/home improvement despite insurance links, so confirm current insurance demand first.

Public sources checked:
- https://www.marketcall.com/user_media_agreement
- https://tools.marketcall.com/bids/
- https://www.offervault.com/offer/bf4750d2976134f9945b6c3b790a12dc/auto-insurance-bundle-2-or-inbounds-rtb-or-60-200-sec-or-dynamic-payout-or-pre-approval
- https://leadsrefer.com/
- https://leadsrefer.com/network
- https://www.elocal.com/affiliate-contact/
- https://aragon-advertising.com/affiliates/
- https://profitise.com/

## Application order

Request current written offers from MarketCall, LeadsRefer and eLocal. Compare **net payable revenue per routed call**, rejection/answer rates and contract freedom, not just the maximum advertised payout. No company is yet verified to satisfy all preferences or offer the highest net return.

For each company, collect:
1. Publisher and campaign approval; organic SEO and social source approval. Confirm Spanish/Portuguese calls separately; owner language skills do not mean buyer supports them.
2. Auto and Home assigned tracking numbers, campaign identifiers, allowed states/ZIP exclusions and hours with timezone, holidays and DST behavior. Confirm separate Bundle handling rather than treating it as a paid offer by assumption.
3. Billable connected duration, when the clock starts, IVR time, caller intent/qualification, duplicate window and exclusions. Request examples of paid and rejected calls.
4. Rate card/revenue share, payout timing and threshold, holds, reversals, dispute deadline, reporting exports/postbacks and actual payment reconciliation.
5. Call capacity/concurrency/daily caps and who enforces them; approved overflow behavior. This release requires buyer-managed caps. No automatic redial, sequential phone forwarding or selling the same call to multiple destinations.
6. Contract length, renewal, notice, termination fee, exclusivity, minimums, traffic restrictions, indemnification and post-termination commission handling.
7. Required consumer disclosure, recording/IVR announcements, consent-service accounts and retention. Obtain approved text and technical documentation; do not claim existing certificate verification.
8. Buyer-supervised test call window and what counts as a successful routing/attribution test. No fabricated customer calls or self-generated commissionable conversions.

## Outreach draft — not sent

Subject: SearchNRate publisher inquiry — Auto/Home web leads and inbound calls

Hello Publisher Partnerships Team,

I operate SearchNRate.com, an owned website collecting Auto and Home insurance quote requests. We are preparing to generate consumer-initiated inbound calls using buyer-assigned tracking numbers, alongside web-form requests. We do not operate a call center; the caller would reach your approved destination directly.

Our initial acquisition strategy is organic search and original English, Spanish and Portuguese content. We are not claiming an established daily volume; we would like to start with a small, approved test and scale based on measured quality. Please confirm which languages and organic/social sources your Auto and Home campaigns accept.

Please provide your current publisher offers, qualifying-call payouts, required connected duration, states, hours/timezone, caps, duplicate rules, tracking/reporting setup and web-lead API specifications where available. We also need your consent/recording requirements and test procedure.

We prefer month-to-month participation or an exit within 30 days, no long-term commitment, no minimum volume or spend, no exclusivity, and weekly or Net 15 payment. Please confirm which terms you can offer and provide the applicable publisher agreement and campaign terms for review.

Thank you,
Clineu Donascimento
SearchNRate.com

## Configure approved calls later

Edit config/call-buyers.json with PUBLIC defaults only, or preferably place the complete {"offers":[...]} JSON in Netlify CALL_BUYERS_JSON (Functions/Production scope). The environment value overrides the public template. Use Netlify for negotiated confidential rates, private reporting links and all secrets. Only public names, numbers, campaign IDs and availability are returned to the browser.

Set acceptedStates as explicit US state abbreviations (no assumed nationwide wildcard). Set days as Mon/Tue/Wed/Thu/Fri/Sat/Sun, timeZone as an IANA zone, and hours as start/end HH:mm in 24-hour time. End time is exclusive. Overnight windows are not supported: obtain/split the actual schedule before configuration; do not guess weekday boundaries. Multiple offers may be configured but no yield optimizer, routing auction or live capacity polling is installed.

The offer remains hidden unless enabled, approved, testCallPassed, termsReviewed and buyerManagesCaps are all true, and fields/organic/English support and hours are valid. Numeric minimumConnectedSeconds and duplicateWindowDays can be 0 only when confirmed by buyer. These values document the agreement; duration/duplicate billing and payout are determined by the buyer's call platform, not the browser. Update flags only after written approval and a coordinated non-billable test.

Call records and earnings must initially be verified against the provider dashboard/export. Signed postback integration requires that provider's documentation and secret; this release does not fabricate provider callbacks, recording evidence or billable calls. Web-lead forwarding remains held pending its separate integration.

After changing configuration, deploy and verify an allowed ZIP/time, excluded state, closed time and approved test call. Keep inactive until test approval; use the assigned number directly during the coordinated setup test.
