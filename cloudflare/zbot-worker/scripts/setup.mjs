// One-step publish of the Z Pass bot server (zpass-zbot):
//   1. creates the temporary file relay store (Workers KV "zpass-zbot-files") if it does not exist and links it in wrangler.jsonc
//   2. deploys the Worker (workers.dev + https://botapi.zpas.org)
//   3. uploads the Firebase service account as an encrypted secret (scripts/provision.mjs) unless --skip-secret
// Run:  cd cloudflare/zbot-worker && node scripts/setup.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const worker = path.resolve(here, '..');
const config = path.join(worker, 'wrangler.jsonc');
const wrangler = path.resolve(worker, '../payment-worker/node_modules/wrangler/bin/wrangler.js');
const run = (args, opts = {}) => {
  const r = spawnSync(process.execPath, [wrangler, ...args], { cwd: worker, encoding: 'utf8', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' }, ...opts });
  if (opts.stdio !== 'inherit' && r.status !== 0) { console.error((r.stderr || r.stdout || '').slice(-1500)); process.exit(r.status || 1); }
  return r;
};

const TITLE = 'zpass-zbot-files';
let text = fs.readFileSync(config, 'utf8');
if (!/"ZBOT_FILES"/.test(text)) {
  console.log('[1/3] Creating the file relay store…');
  const list = JSON.parse(run(['kv', 'namespace', 'list']).stdout || '[]');
  let id = list.find((n) => n.title === TITLE)?.id;
  if (!id) {
    const out = run(['kv', 'namespace', 'create', TITLE]).stdout;
    id = (out.match(/"id":\s*"([a-f0-9]{32})"/) || out.match(/\b([a-f0-9]{32})\b/) || [])[1];
    if (!id) { console.error('Could not read the new namespace id:\n' + out); process.exit(1); }
  }
  text = text.replace(/("observability":)/, `"kv_namespaces": [{ "binding": "ZBOT_FILES", "id": "${id}" }],\n  $1`);
  fs.writeFileSync(config, text);
  console.log('      linked KV ' + id);
} else console.log('[1/3] File relay store already linked.');

console.log('[2/3] Deploying zpass-zbot…');
const deploy = run(['deploy', '--config', config], { stdio: 'inherit' });
if (deploy.status !== 0) process.exit(deploy.status || 1);

if (process.argv.includes('--skip-secret')) console.log('[3/3] Skipped the service-account secret.');
else {
  console.log('[3/3] Uploading the Firebase service account secret…');
  const p = spawnSync(process.execPath, [path.join(here, 'provision.mjs')], { cwd: worker, stdio: 'inherit' });
  if (p.status !== 0) process.exit(p.status || 1);
}
console.log('\nDone. Check: https://botapi.zpas.org/  →  {"ok":true,…}');
