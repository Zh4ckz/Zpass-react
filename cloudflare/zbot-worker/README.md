# Z Pass bot gateway (Cloudflare Worker)

Free replacement for the `zbotGateway` Cloud Function (the Firebase project is on the Spark plan, which cannot run Cloud Functions).

- Worker: `zpass-zbot` · https://zpass-zbot.rezanhassoun.workers.dev · custom domain https://botapi.zpas.org
- Data: Firestore `passgram-org` through the REST API with the service account (secret `FIREBASE_SERVICE_ACCOUNT_JSON`).
- Sign-in: Firebase ID tokens are checked with Google (`accounts:lookup`), including the `admin` custom claim.
- App Check: a token sent by the app is verified against Firebase's keys; forged tokens are rejected. Set `REQUIRE_APP_CHECK` to `"true"` in `wrangler.jsonc` once Play Integrity is set up for every build.

## Routes

| Path | Who | Purpose |
|---|---|---|
| `/manage/<method>` | signed-in app users | list, info, create, rotate, edit, setCommands, setMenu, delete, send, whoami |
| `/admin/<method>` | administrators (bots/core/api.zpas.org) | whoami, stats, bots, get, disable, edit, setCommands, setMenu, delete |
| `/<method>`, `/bot<token>/<method>` | bot programs | getMe, getUpdates, sendMessage, get/set/deleteMyCommands, get/setChatMenuButton |

## Commands

```powershell
cd cloudflare/zbot-worker
node --test test/*.test.mjs                                        # tests (no network)
node ../payment-worker/node_modules/wrangler/bin/wrangler.js deploy  # publish
node scripts/provision.mjs                                         # upload the service account secret (once)
```
