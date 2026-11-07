// PassGram Web — languages for the signed-in app only.
// The sign-in screens (QR, email/phone, passkey) always stay in English.
// Dictionaries: assets/lang/json/<code>.json (shared) + assets/lang/web-app.json (web-only strings).

const LANG_ROOT = '/subdomain/web/resources/assets/lang/';
const STORE_KEY = 'zpass-web-lang';
const RTL = new Set(['ar-AR']);
const ATTRS = ['placeholder', 'title', 'aria-label'];
// Brand names are never translated (the shared dictionaries translate some of them).
const KEEP = new Set(['PassGram', 'Z Pass', 'Zpass', 'ZPass', 'Pro', 'Plus','PassGram Web · web.zpas.org']);

const app = document.getElementById('chat-app');
const textState = new WeakMap(); // Text node -> { src, out }
const attrState = new WeakMap(); // Element -> { [attr]: { src, out } }
const cache = new Map();
let languages = [{ code: 'en-US', name: 'English' }];
let code = 'en-US';
let dict = null; // null = English
let busy = false;

const readStored = () => { try { return localStorage.getItem(STORE_KEY); } catch { return null; } };
const store = (value) => { try { localStorage.setItem(STORE_KEY, value); } catch {} };
const signedIn = () => document.body.classList.contains('app-mode');

function pickDefault() {
  const stored = readStored();
  if (stored && languages.some((l) => l.code === stored)) return stored;
  const wanted = (navigator.languages || [navigator.language || 'en']).map((l) => l.toLowerCase().slice(0, 2));
  for (const w of wanted) {
    const hit = languages.find((l) => l.code.toLowerCase().startsWith(w + '-'));
    if (hit) return hit.code;
  }
  return 'en-US';
}

async function loadJson(path) {
  const res = await fetch(LANG_ROOT + path, { cache: 'force-cache' });
  if (!res.ok) throw new Error(path + ' ' + res.status);
  return res.json();
}

async function loadDict(lang) {
  if (lang === 'en-US') return null;
  if (cache.has(lang)) return cache.get(lang);
  const [shared, web] = await Promise.all([loadJson(`json/${lang}.json`).catch(() => ({})), webStrings()]);
  const merged = { ...shared, ...(web[lang] || {}) };
  cache.set(lang, merged);
  return merged;
}
let webPromise;
const webStrings = () => (webPromise ||= loadJson('web-app.json').catch(() => ({})));

function translateValue(src) {
  if (!dict) return src;
  const key = src.trim();
  if (KEEP.has(key)) return src;
  const hit = key && dict[key];
  return hit ? src.replace(key, hit) : src;
}

function doText(node) {
  const value = node.nodeValue;
  let rec = textState.get(node);
  if (!rec || value !== rec.out) rec = { src: value };
  rec.out = translateValue(rec.src);
  textState.set(node, rec);
  if (value !== rec.out) node.nodeValue = rec.out;
}

function doAttrs(el) {
  let recs = attrState.get(el);
  for (const name of ATTRS) {
    const value = el.getAttribute(name);
    if (value == null) continue;
    recs ||= {};
    let rec = recs[name];
    if (!rec || value !== rec.out) rec = { src: value };
    rec.out = translateValue(rec.src);
    recs[name] = rec;
    if (value !== rec.out) el.setAttribute(name, rec.out);
  }
  if (recs) attrState.set(el, recs);
}

function walk(root) {
  if (root.nodeType === 3) { doText(root); return; }
  if (root.nodeType !== 1 || root.matches('script, style, #ap-lang')) return;
  doAttrs(root);
  for (const child of root.childNodes) walk(child);
}

function applyDocumentLang() {
  const active = signedIn() ? code : 'en-US';
  document.documentElement.lang = active.slice(0, 2);
  document.documentElement.dir = RTL.has(active) ? 'rtl' : 'ltr';
}

function translateAll() {
  if (!app) return;
  busy = true;
  walk(app);
  busy = false;
  applyDocumentLang();
}

async function setLanguage(next, save = true) {
  code = languages.some((l) => l.code === next) ? next : 'en-US';
  if (save) store(code);
  dict = signedIn() ? await loadDict(code) : null;
  const select = document.getElementById('ap-lang');
  if (select) select.value = code;
  translateAll();
}

function addPicker() {
  const card = document.querySelector('#ap-v-settings .ap-night-row')?.closest('.ap-card');
  if (!card || document.getElementById('ap-lang')) return;
  const row = document.createElement('div');
  row.className = 'ap-row big';
  const label = document.createElement('span');
  label.textContent = 'Language';
  const select = document.createElement('select');
  select.id = 'ap-lang';
  select.className = 'ap-select';
  select.setAttribute('aria-label', 'Language');
  for (const l of languages) select.add(new Option(l.name, l.code));
  select.value = code;
  select.addEventListener('change', () => setLanguage(select.value));
  row.append(label, select);
  card.append(row);
}

async function init() {
  if (!app) return;
  try {
    const list = await loadJson('languages.json');
    if (Array.isArray(list) && list.length) languages = list;
  } catch {}
  code = pickDefault();
  addPicker();

  new MutationObserver((records) => {
    if (busy || !dict) return;
    busy = true;
    for (const r of records) {
      if (r.type === 'characterData') doText(r.target);
      else if (r.type === 'attributes') doAttrs(r.target);
      else r.addedNodes.forEach(walk);
    }
    busy = false;
  }).observe(app, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });

  // Switch between English (signed out) and the chosen language (signed in).
  let wasSignedIn = signedIn();
  new MutationObserver(() => {
    const now = signedIn();
    if (now === wasSignedIn) return;
    wasSignedIn = now;
    setLanguage(code, false);
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  await setLanguage(code, false);
}

init();
