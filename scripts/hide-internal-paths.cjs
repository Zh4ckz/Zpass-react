// Post-build: visitors must never see the internal /subdomain/<service>/resources/... folder layout.
//
// public/ keeps the readable folders (so `next dev` works unchanged). After `next build`, this script:
//   1. moves every file under out/subdomain/ to an opaque URL:
//        out/subdomain/web/resources/js/x.mjs  ->  /_next/static/chunks/<hash>/x.mjs
//        out/subdomain/web/index.html          ->  /_next/static/chunks/<hash>   (file <hash>.html)
//      Each folder gets one stable hash, so same-folder imports ('./a.mjs') and dynamic
//      folder lookups (flags/${code}.svg, lang/${lang}.json) keep working.
//   2. rewrites every /subdomain/... reference in out/ (HTML, JS, CSS, JSON, RSC) to the new URLs,
//   3. deletes out/subdomain, and fails the build if any /subdomain/ path is left anywhere in out/.
//
// Hashes depend only on the folder name, so firebase.json can reference the page files by name.
// Run `node scripts/hide-internal-paths.cjs --print` to list the page URLs.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'out');
const SRC = path.join(OUT, 'subdomain');
const SERVICES = ['api', 'bots', 'core', 'docs', 'pay', 'web'];
const BASE = '/_next/static/chunks';
const TEXT = new Set(['.html', '.js', '.mjs', '.cjs', '.css', '.json', '.txt', '.rsc', '.map', '.webmanifest', '.xml', '.svg']);

const hash = (key) => crypto.createHash('sha256').update('zpass-static:' + key).digest('hex').slice(0, 16);
const toPosix = (p) => p.split(path.sep).join('/');
const dirUrl = (relDir) => `${BASE}/${hash('dir:' + relDir)}`;
const pageFile = (service) => `${BASE}/${hash('page:' + service)}.html`;
const pageUrl = (service) => pageFile(service).replace(/\.html$/, ''); // cleanUrls serves <hash>.html at <hash>

if (process.argv.includes('--print')) {
  for (const s of SERVICES) console.log(`${s.padEnd(5)} ${pageFile(s)}`);
  process.exit(0);
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out); else out.push(full);
  }
  return out;
}

if (!fs.existsSync(SRC)) {
  console.log('hide-internal-paths: out/subdomain not found (already processed?)');
} else {
  // ---- 1. move files ----
  const fileMap = new Map(); // '/subdomain/web/resources/js/x.mjs' -> new URL
  const dirMap = new Map();  // '/subdomain/web/resources/js'      -> new URL
  for (const full of walk(SRC)) {
    const rel = toPosix(path.relative(SRC, full)); // web/resources/js/x.mjs
    const [service, ...rest] = rel.split('/');
    let url;
    if (rest.length === 1 && rest[0] === 'index.html' && SERVICES.includes(service)) {
      url = pageUrl(service);
      fs.mkdirSync(path.join(OUT, BASE), { recursive: true });
      fs.copyFileSync(full, path.join(OUT, pageFile(service)));
    } else {
      const relDir = path.posix.dirname(rel);
      url = `${dirUrl(relDir)}/${path.posix.basename(rel)}`;
      dirMap.set('/subdomain/' + relDir, dirUrl(relDir));
      const target = path.join(OUT, url);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(full, target);
    }
    fileMap.set('/subdomain/' + rel, url);
  }
  // Parent folders that only contain folders (e.g. resources/assets) still get a mapping for prefix lookups.
  for (const key of [...dirMap.keys()]) {
    for (let d = path.posix.dirname(key); d.split('/').length > 3; d = path.posix.dirname(d)) {
      if (!dirMap.has(d)) dirMap.set(d, dirUrl(d.slice('/subdomain/'.length)));
    }
  }

  // ---- 2. rewrite references ----
  const unresolved = new Set();
  const RE = /\/subdomain\/(api|bots|core|docs|pay|web)((?:\/[A-Za-z0-9._@-]+)*\/?)/g;
  const resolve = (match, service, rest) => {
    if (rest === '' || rest === '/' || rest === '/index.html') return pageUrl(service);
    const key = `/subdomain/${service}${rest.replace(/\/$/, '')}`;
    if (!rest.endsWith('/') && fileMap.has(key)) return fileMap.get(key);
    if (dirMap.has(key)) return dirMap.get(key) + (rest.endsWith('/') ? '/' : '');
    unresolved.add(match);
    return match;
  };
  // Only files copied from public/ (and the moved files) are rewritten. Next's own output (HTML, RSC
  // .txt, chunks) is never touched: its RSC payload stores string byte lengths, so editing it breaks
  // hydration and leaves a white page. Next code gets the URLs from app/service-pages.js instead.
  const PUBLIC = path.join(ROOT, 'public');
  const fromPublic = (full) => {
    const rel = path.relative(OUT, full);
    if (rel.startsWith('_next' + path.sep)) return [...fileMap.values()].includes('/' + toPosix(rel).replace(/\.html$/, '')) || [...fileMap.values()].includes('/' + toPosix(rel));
    const nextPage = full.endsWith('.html') && fs.existsSync(full.slice(0, -5) + '.txt'); // Next overwrote it
    return fs.existsSync(path.join(PUBLIC, rel)) && !nextPage;
  };
  const touched = [];
  for (const full of walk(OUT)) {
    if (full.startsWith(SRC + path.sep) || !TEXT.has(path.extname(full).toLowerCase()) || !fromPublic(full)) continue;
    const text = fs.readFileSync(full, 'utf8');
    if (!text.includes('/subdomain/')) continue;
    const next = text.replace(RE, resolve);
    if (next !== text) { fs.writeFileSync(full, next); touched.push(toPosix(path.relative(OUT, full))); }
  }

  // ---- 3. remove the readable folders and verify ----
  fs.rmSync(SRC, { recursive: true, force: true });
  const leftovers = [];
  for (const full of walk(OUT)) {
    if (!TEXT.has(path.extname(full).toLowerCase())) continue;
    const text = fs.readFileSync(full, 'utf8');
    const m = /\\?\/subdomain\\?\//.exec(text); // also catches regex/JSON-escaped forms like \/subdomain\/
    const i = m ? m.index : -1;
    if (i !== -1) leftovers.push(`${toPosix(path.relative(OUT, full))}: …${text.slice(Math.max(0, i - 40), i + 60)}…`);
  }
  // app/service-pages.js must point at the pages created here.
  const servicePages = fs.readFileSync(path.join(ROOT, 'app', 'service-pages.js'), 'utf8');
  for (const s of ['api', 'bots', 'core', 'docs', 'pay']) {
    if (!servicePages.includes(`${s}: '${pageUrl(s)}'`)) leftovers.push(`app/service-pages.js: ${s} must be '${pageUrl(s)}'`);
  }
  if (unresolved.size || leftovers.length) {
    console.error('hide-internal-paths: internal paths would be visible:');
    for (const u of unresolved) console.error('  unresolved', u);
    for (const l of leftovers) console.error('  left in', l);
    process.exitCode = 1;
  } else {
    console.log(`hide-internal-paths: ${fileMap.size} files moved to ${BASE}/…, ${touched.length} files rewritten, no /subdomain/ paths left.`);
  }
}
