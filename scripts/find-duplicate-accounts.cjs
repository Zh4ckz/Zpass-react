// Lists email addresses that have more than one passgram-org account (read-only, changes nothing).
//   node scripts/find-duplicate-accounts.cjs
// For each address it shows every account (uid, sign-in methods, created, last sign-in) and marks the one that
// has data (vault backup or subscription) so you know which to KEEP. Delete the empty extras in the Firebase
// console (Authentication → Users), then turn on "Link accounts that use the same email" so it cannot happen again.
const path = require('path');
const admin = require(path.resolve(__dirname, '../../../Bots-JS/payment-bot/node_modules/firebase-admin'));
const account = require(process.env.ZPASS_SERVICE_ACCOUNT || path.resolve(__dirname, '../../../Bots-JS/payment-bot/zpass-web-service-account.json'));
if (account.project_id !== 'passgram-org') { console.error('Service account is not for passgram-org.'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(account) });
const db = admin.firestore();

(async () => {
  const byEmail = new Map();
  let token;
  do {
    const page = await admin.auth().listUsers(1000, token);
    for (const u of page.users) {
      const emails = new Set([u.email, ...(u.providerData || []).map((p) => p.email)].filter(Boolean).map((e) => e.toLowerCase()));
      for (const e of emails) { if (!byEmail.has(e)) byEmail.set(e, []); byEmail.get(e).push(u); }
    }
    token = page.pageToken;
  } while (token);
  const dupes = [...byEmail].filter(([, list]) => list.length > 1);
  if (!dupes.length) { console.log('No duplicate accounts. Every email has exactly one account.'); return; }
  for (const [email, list] of dupes) {
    console.log(`\n${email}  —  ${list.length} accounts`);
    for (const u of list) {
      const [vault, sub] = await Promise.all([db.doc(`vaults/${u.uid}`).get(), db.doc(`subscriptions/${u.uid}`).get()]);
      const data = [vault.exists && 'vault', sub.exists && `plan:${sub.get('plan')}`].filter(Boolean).join(', ') || 'no data';
      const methods = (u.providerData || []).map((p) => p.providerId).join(', ') || 'none';
      console.log(`  uid=${u.uid}  sign-in: ${methods}  created: ${u.metadata.creationTime}  last: ${u.metadata.lastSignInTime || '-'}  [${data}]${u.customClaims?.admin ? '  ADMIN' : ''}`);
    }
  }
  console.log(`\n${dupes.length} address(es) with duplicates. Keep the account with data; delete the others in the Firebase console.`);
})().catch((e) => { console.error(e.message); process.exit(1); });
