# Current production backend: Cloudflare

Website payments now use the independent `passgram-pay-api` Worker at `https://passgram-pay-api.rezanhassoun.workers.dev`. It directly creates Stripe subscriptions and processes signed notifications into passgram-org Firestore. The PC and local bot are not required for these website payments. See `cloudflare/payment-worker/README.md` for production configuration, tests and secret handling. Local bot publishers preserve `runtime: cloudflare-worker` routing.

The notes below describe the retained legacy/local implementation and the shared Hosting artifacts. Running a local bot is optional for this site's current payment backend.

# Current custom domain routing

`pay.zpas.org` was verified active on the existing `passgram` Firebase Hosting site, together with `zpas.org`. Its DNS mapping is preserved. The exported home page detects the pay hostname and displays only the checkout in a full-window same-origin frame, preserving plan and period query parameters. Provider checkout opens in the top window. Other marketing page URLs under the pay hostname return to checkout.

`passgram-pay.web.app` is a separately published payment-only preview. Its `out-pay` artifact remains available if the custom domain is moved to a dedicated site later; that migration is optional.

Deploy the current shared-domain configuration with `firebase deploy --only hosting --project passgram-org` after building. The separate-site command below is only for the standalone preview.

# Payment-only site and existing bots

`npm run build` creates the main site in `out` and a separate payment-only artifact in `out-pay`. `firebase.pay.json` deploys only checkout files to Hosting site `passgram-pay`; the marketing website is not included.

The checkout uses the existing bots rather than Payment Links or a Firebase Function:

- `Bots-JS/payment-bot/pay-checkout.js`
- `Bots/Payment-bot/zpass_pay_checkout.py`

Both use existing Stripe keys and the existing `zpass-web-service-account.json` for project **passgram-org**, separately from the legacy bot database. No private keys are copied into the website. `/checkout/pay-config` exposes only prices and readiness. `/checkout/pay-session` accepts only a canonical product ID, a public Z Pass recipient ID and an idempotency ID. Amounts come from the bot. The buyer enters card details on Stripe, never on PassGram.

The checkout now uses Stripe monthly subscriptions (billingModel monthly-v1). Plus monthly is $4.99; its 12-month option charges $4.25 each month, $51 total, with no annual upfront charge. Pro is $9 monthly or $7.50 each month for 12 months ($90 total). The 12-month option sets the Stripe subscription cancel_at to exactly 12 calendar months after its original billing anchor. Ordinary monthly subscriptions continue until cancelled. Access extends only through the period covered by a validated paid invoice, never a full year in advance. Duplicate invoice IDs do not extend access twice; failed invoices do not extend access. Legacy one-time orders retain their existing handler. Only a signed Stripe event with matching order, session ID, UID, currency and amount can activate the account. Firestore transactions prevent repeat activation when notifications are retried or either bot instance receives them. A browser return or a user-supplied amount cannot activate a plan.

## Publish

1. If absent, create the payment-only Hosting site:
   `firebase hosting:sites:create passgram-pay --project passgram-org`
2. In Firebase Hosting connect `pay.zpas.org` to `passgram-pay` and follow its DNS/HTTPS instructions. The main domain stays connected to the main Hosting site.
3. Keep one payment backend running with a public HTTPS endpoint. Both bots' existing Stripe signing secret must match the Stripe webhook endpoint that forwards to `/stripe-webhook`. This code does not create or modify provider webhook registrations.
4. The updated Python `PAYMENT-BOT-CONTROL.ps1` writes the fresh public tunnel URL into `public/resources/data/pay-backend.json`, `out` and `out-pay`. With its existing `-PublishHosting` option it publishes both current `passgram-org` configurations. The JavaScript bot also writes that public URL after its `/checkout/pay-config` health check confirms readiness. Temporary tunnel origins expire after 24 hours in the browser, and the JavaScript bot refreshes its public routing file every ten minutes while healthy. Redeploy to publish refreshed routing.
5. Build and deploy:
   `npm run build`
   `firebase deploy --only hosting --project passgram-org`
   `firebase deploy --only hosting --config firebase.pay.json --project passgram-org`

Without a fresh routing file, working bot, account, credentials and verified webhook configuration, the checkout remains unavailable. Prices can be previewed from the shared build-time defaults, but a real checkout uses the bot's authoritative prices. Stripe remains authoritative for final taxes and charges.

The change does not start bots, configure DNS, create a Hosting site, send Telegram messages, create a real Stripe Checkout Session, or charge a card during tests. Firebase Hosting can remain on the free plan; normal payment processor fees still apply.

The Stripe webhook must deliver checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.updated and customer.subscription.deleted. Updated UI fails closed against old bot versions that do not advertise monthly-v1. Restart the updated bot before publishing its current endpoint. No existing customer subscription was migrated or charged by this code change.
