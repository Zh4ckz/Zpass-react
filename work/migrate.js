const fs = require('fs');
const path = require('path');
const root = path.resolve('.');
const pub = path.join(root, 'public');
const res = path.join(pub, 'resources');

function moveDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, e.name);
    const d = path.join(to, e.name);
    if (e.isDirectory()) moveDir(s, d);
    else {
      if (fs.existsSync(d)) throw new Error('collision ' + d);
      fs.renameSync(s, d);
    }
  }
  fs.rmdirSync(from);
}

// 1. remove redundant root files, relocate favicon
for (const f of fs.readdirSync(pub, { withFileTypes: true })) {
  if (!f.isFile() || f.name.endsWith('.html')) continue;
  const p = path.join(pub, f.name);
  if (f.name === 'favicon.ico') {
    fs.mkdirSync(path.join(res, 'img'), { recursive: true });
    fs.renameSync(p, path.join(res, 'img', 'favicon.ico'));
  } else fs.unlinkSync(p);
}

// 2. move folders
moveDir(path.join(pub, 'css'), path.join(res, 'css'));
moveDir(path.join(pub, 'js'), path.join(res, 'js'));
moveDir(path.join(pub, 'img'), path.join(res, 'img'));
moveDir(path.join(pub, 'images'), path.join(res, 'images'));
moveDir(path.join(res, 'flags'), path.join(res, 'assets', 'flags'));
moveDir(path.join(res, 'assets', 'flag'), path.join(res, 'assets', 'flags'));

// 3. rewrite references
const textExt = /\.(html|css|js|mjs)$/i;
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.build-web'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (textExt.test(e.name)) out.push(p);
  }
  return out;
}
const files = [...walk(pub)];
for (const m of ['web', 'translations', 'core', 'bots', 'docs']) {
  const d = path.join(root, m);
  if (fs.existsSync(d)) files.push(...walk(d));
}
let changed = 0;
for (const file of files) {
  const orig = fs.readFileSync(file, 'utf8');
  let s = orig;
  const inCss = file.startsWith(path.join(res, 'css') + path.sep);
  if (inCss) s = s.replace(/\.\.\/resources\//g, '../');
  s = s.replace(/resources\/flags\//g, 'resources/assets/flags/')
       .replace(/assets\/flag\//g, 'assets/flags/')
       .replace(/\/favicon\.ico/g, '/resources/img/favicon.ico');
  s = s.replace(/(?<![\w.\-:/])\/(css|js|img|images)\//g, '/resources/$1/');
  if (!inCss) {
    s = s.replace(/(["'`(=]\s*)((?:\.{1,2}\/)*)(css|js|img|images)\//g, (m, a, b, c) => `${a}${b}resources/${c}/`);
  }
  if (s !== orig) { fs.writeFileSync(file, s); changed++; }
}
console.log('rewrote files:', changed);
