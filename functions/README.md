# Z Pass payment API

The `payments` function handles authenticated Stripe Checkout, Stripe Billing Portal,
NOWPayments invoices, and both providers' webhooks. The `firebase.zpass.json` deployment
configuration publishes it through `https://zpass.web.app/api/**` in project `zpasss`.
The regular `firebase.json` remains scoped to the existing `tomsss` website.

Set these Firebase Secret Manager values before deploying the function:

```powershell
firebase functions:secrets:set STRIPE_SECRET_KEY --project zpasss
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project zpasss
firebase functions:secrets:set NOWPAYMENTS_API_KEY --project zpasss
firebase functions:secrets:set NOWPAYMENTS_IPN_SECRET --project zpasss
```

Use the values from the payment provider dashboards; do not commit them or put them in
client-side code. For local emulation, copy `.secret.local.example` to `.secret.local`
and fill the values there.

Configure provider callbacks to:

- Stripe: `https://zpass.web.app/api/stripe-webhook`, with `checkout.session.completed`,
  `invoice.paid`, `customer.subscription.updated`, and `customer.subscription.deleted`.
- NOWPayments: `https://zpass.web.app/api/nowpayments-webhook`.

Before switching the public Firebase client configuration to project `zpasss`, migrate and
verify the existing Firebase Auth users and Firestore data from `tomsss`. Do not deploy the
new client against an empty project: existing customers would be unable to sign in and the
payment handler would not find their account records.

Deploy with `firebase --config firebase.zpass.json deploy --only functions,hosting,firestore
--project zpasss`. Firebase Functions requires a billing-enabled Firebase project. Stripe
and NOWPayments provider secrets must be rotated after any exposure, then set in Secret
Manager for `zpasss` before deploying.
