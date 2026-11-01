const fs = require('fs');
const path = require('path');
const pub = path.resolve('public');
const exts = /\.(css|js|mjs|png|jpe?g|webp|svg|ico|json|woff2?|ttf|mp3|ogg|mp4|webm|gif|wasm|txt)$/i;
const text = /\.(html|css|js|mjs)$/i;
const missing = new Map();

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (text.test(e.name)) out.push(p);
  }
  return out;
}

for (const file of walk(pub)) {
  const src = fs.readFileSync(file, 'utf8');
  const re = /(?:src|href|poster|data-src)\s*=\s*["']([^"']+)["']|url\(\s*["']?([^"')]+)["']?\s*\)|import\s+[^'"]*?['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src))) {
    let ref = (m[1] || m[2] || m[3] || '').split('#')[0].split('?')[0].trim();
    if (!ref || /^(https?:|data:|mailto:|tel:|blob:|javascript:|\/\/|\{|\$|<)/.test(ref)) continue;
    if (!exts.test(ref)) continue;
    const target = ref.startsWith('/') ? path.join(pub, ref) : path.resolve(path.dirname(file), ref);
    if (!fs.existsSync(target)) {
      const key = path.relative(pub, file) + '  ->  ' + ref;
      missing.set(key, true);
    }
  }
}
const list = [...missing.keys()].sort();
fs.writeFileSync(process.argv[2] || 'work/refs.txt', list.join('\n'));
console.log('missing refs:', list.length);
