# PassGram payment Worker

Website payments run directly on Cloudflare Workers. No local bot, relay, PC process, polling, tunnel or scheduled PC task is required for checkout sessions and Stripe subscription notifications.

Live API: https://passgram-pay-api.rezanhassoun.workers.dev
Website: https://pay.zpas.org

## What runs here

- Public plan configuration and Stripe-hosted subscription checkout.
- Plus $4.99 monthly or $4.25 each month for 12 months ($51 total); Pro $9 monthly or $7.50 each month for 12 months ($90 total).
- Twelve-month subscriptions end at their original billing anchor plus twelve calendar months. Card details are entered only on Stripe.
- Google service-account OAuth uses WebCrypto. Firestore REST transactions reserve orders and rate limits, then grant access only for a validated paid invoice period.
- Stripe HMAC signature verification, amount/currency/recipient/subscription checks and invoice-ID deduplication. Failed payments do not extend paid access.
- A dedicated Stripe webhook for this Worker. Existing local bot webhooks remain separate. Local publishers preserve the permanent Cloudflare backend selection.

This is the website payment backend. It does not forward requests to a local Telegram process or migrate unrelated Telegram-bot functions.

## Development

Use Node 22 or newer:

```powershell
npm install --prefix cloudflare/payment-worker
npm --prefix cloudflare/payment-worker run check
node cloudflare/payment-worker/node_modules/wrangler/bin/wrangler.js deploy --config cloudflare/payment-worker/wrangler.jsonc
```

The automated tests use fake Stripe/Firebase responses and ephemeral RSA test keys. They do not create payments.

## Credentials and setup

Cloudflare secret bindings: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_ENDPOINT_ID`, `FIREBASE_SERVICE_ACCOUNT_JSON`. `FIREBASE_PROJECT_ID` is the public `passgram-org` binding. Never put private values in Wrangler configuration, browser assets, `.dev.vars` committed to Git, command arguments, screenshots or logs.

`node cloudflare/payment-worker/scripts/provision.mjs` reads the already configured payment bot's `.env` and `zpass-web-service-account.json` in memory. It uploads encrypted secrets through Wrangler stdin, creates or verifies the dedicated Stripe webhook, checks live Firebase readiness and updates only public backend routing metadata after checks pass. Credentials are not copied into this repository. The default credential source is `Desktop/Bots-JS/payment-bot`; `PAYMENT_BOT_ROOT` can override the local path.

Stripe webhook events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`.

`/health` exposes only operational status and allowlisted error codes. An unsigned webhook is rejected with 401. `/checkout/pay-session` permits only the website checkout origin and ignores all client-supplied pricing by rejecting extra fields. It creates a real Checkout Session only for a valid account and approved plan.

## Publishing the UI

Once the Worker health and configuration checks pass, public routing is stored in `public/resources/data/pay-backend.json` as `runtime: cloudflare-worker` and a stable workers.dev URL. Build and deploy both website artifacts:

```powershell
npm run build
firebase deploy --only hosting --project passgram-org
firebase deploy --only hosting --config firebase.pay.json --project passgram-org
```

Stopping local bots does not affect this backend. Stripe and Google credentials must remain valid, and Cloudflare/Firestore account quotas still apply. Provisioning tests never make a real charge. Actual card charges happen only after a buyer completes Stripe checkout.

## Account subscription management

`https://web.zpas.org/account/subscription` uses a Firebase ID token for every request to `/billing/overview`, `/billing/invoices`, `/billing/cancel`, `/billing/refund`, and `/billing/upgrade`. Customer IDs, invoice ownership, current plan and deadlines are resolved on the server. Mutation requests require `confirm: true`; clients cannot choose a UID, amount, refund target or Stripe subscription ID.

Cancellation stops renewal and retains paid access until the paid period ends. A voluntary first-payment refund may be requested strictly before 24 hours have elapsed since successful payment. The refund amount is the lesser of the paid amount and the invoice total excluding tax. Mandatory legal rights remain unaffected. Invoice views, PDF downloads, CSV exports and sign-out do not reset the window. Stripe refunds use a stable invoice-based idempotency key and the original payment method. Access ends and the Stripe subscription is cancelled without proration once the refund succeeds. Pending refunds are reconciled when account details are refreshed. Failed or unsupported payments need manual support review.

Plus-to-Pro upgrades are scheduled for the next renewal, without a second charge for the current paid period. The original 12-month commitment end is preserved. Server-created Stripe prices and schedules attach the new order metadata at the phase transition. Pro access is activated only by the existing verified paid-invoice handler. Cancelling renewal or requesting a refund releases a pending upgrade schedule. Pro customers cannot purchase or downgrade to another plan through this flow.

Original invoice PDF/hosted-page links come from Stripe after ownership checks. CSV exports are generated from the currently displayed invoice page(s); users can load older pages before exporting. Invoice history remains available after cancellation. No real customer subscription or refund is modified by automated tests.
