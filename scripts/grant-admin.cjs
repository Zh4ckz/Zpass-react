// Gives (or removes) the private `admin` custom claim on a passgram-org account.
// Admin panels (zpas.org/admin, bots / core / api.zpas.org) and Firestore rules trust ONLY this claim.
//
//   node scripts/grant-admin.cjs rezanhassoun@gmail.com          -> grant
//   node scripts/grant-admin.cjs rezanhassoun@gmail.com --remove -> remove
//   node scripts/grant-admin.cjs --list                          -> list current admins
//
// Uses the passgram-org service account (never printed). After granting, sign out and back in
// (or wait up to 1 hour) so the browser receives a fresh token with the claim.
const path = require('path');
const sdk = path.resolve(__dirname, '../../../Bots-JS/payment-bot/node_modules/firebase-admin');
const admin = require(sdk);
const keyFile = process.env.ZPASS_SERVICE_ACCOUNT || path.resolve(__dirname, '../../../Bots-JS/payment-bot/zpass-web-service-account.json');
const account = require(keyFile);
if (account.project_id !== 'passgram-org') { console.error('Service account is not for passgram-org.'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(account) });

(async () => {
  const args = process.argv.slice(2);
  if (args[0] === '--list') {
    let token, n = 0;
    do {
      const page = await admin.auth().listUsers(1000, token);
      for (const u of page.users) if (u.customClaims?.admin === true) { n++; console.log(`admin  ${u.email || '(no email)'}  ${u.uid}`); }
      token = page.pageToken;
    } while (token);
    if (!n) console.log('No admins yet.');
    return;
  }
  const email = (args[0] || '').trim().toLowerCase();
  if (!email.includes('@')) { console.error('Usage: node scripts/grant-admin.cjs <email> [--remove] | --list'); process.exit(1); }
  // An address can belong to more than one account (for example Google and email/password created separately):
  // update every account whose email, or any linked provider's email, matches.
  const matches = [];
  let token;
  do {
    const page = await admin.auth().listUsers(1000, token);
    for (const u of page.users) {
      const emails = [u.email, ...(u.providerData || []).map((p) => p.email)].filter(Boolean).map((e) => e.toLowerCase());
      if (emails.includes(email)) matches.push(u);
    }
    token = page.pageToken;
  } while (token);
  if (!matches.length) { console.error(`No account with ${email}. Sign in once on the site or app first.`); process.exit(1); }
  const remove = args.includes('--remove');
  for (const user of matches) {
    const claims = { ...(user.customClaims || {}) };
    if (remove) delete claims.admin; else claims.admin = true;
    await admin.auth().setCustomUserClaims(user.uid, claims);
    const providers = (user.providerData || []).map((p) => p.providerId).join(', ') || 'none';
    console.log(`${remove ? 'Removed admin from' : 'Granted admin to'} ${user.email || email}  uid=${user.uid}  sign-in: ${providers}`);
  }
  console.log('Sign out and sign back in to use it.');
})().catch((e) => { console.error(e.message); process.exit(1); });
