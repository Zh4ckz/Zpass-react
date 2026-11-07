// Uploads the Firebase service account to the zpass-zbot Worker as an encrypted secret.
// The key is read in memory and sent only through Wrangler stdin (never written to disk, logs or arguments).
// Source: Desktop/Bots-JS/payment-bot/zpass-web-service-account.json (override with ZPASS_SERVICE_ACCOUNT).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const worker = path.resolve(here, '..');
const source = process.env.ZPASS_SERVICE_ACCOUNT || path.resolve(worker, '../../../../Bots-JS/payment-bot/zpass-web-service-account.json');
const account = JSON.parse(fs.readFileSync(source, 'utf8'));
if (account.project_id !== 'passgram-org' || !account.private_key || !account.client_email) throw Error('Service account for passgram-org not found.');
const wrangler = path.resolve(worker, '../payment-worker/node_modules/wrangler/bin/wrangler.js');
const result = spawnSync(process.execPath, [wrangler, 'secret', 'bulk', '--config', path.join(worker, 'wrangler.jsonc')], {
  cwd: worker, input: JSON.stringify({ FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify(account) }), encoding: 'utf8',
  env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
});
if (result.status !== 0) { console.error((result.stderr || '').replace(/-----BEGIN[\s\S]*?END[^-]*-----/g, '[redacted]').slice(-800)); process.exit(1); }
console.log('Firebase service account installed as an encrypted secret on zpass-zbot.');
