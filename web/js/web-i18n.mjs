import TR from '../lang/tr.json';
const EN = Object.fromEntries(Object.entries(TR).map(([en, tr]) => [tr, en]));
const KEY = 'zpassLanguage';
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
let lang = 'en';
try { lang = localStorage.getItem(KEY) === 'tr' ? 'tr' : 'en'; } catch {}

export const getLanguage = () => lang;
export const t = (en) => (lang === 'tr' && TR[en]) || en;

const map = () => (lang === 'tr' ? TR : EN);

function swap(value) {
  const trimmed = value.trim();
  const next = trimmed && map()[trimmed];
  return next ? value.replace(trimmed, next) : null;
}

function translate(root) {
  if (root.nodeType === 3) {
    const next = swap(root.nodeValue);
    if (next !== null) root.nodeValue = next;
    return;
  }
  if (root.nodeType !== 1) return;
  if (root.classList?.contains('i18n') && root.children.length) {
    const html = root.innerHTML.trim();
    const next = map()[html];
    if (next) { root.innerHTML = next; return; }
  }
  for (const attr of ATTRS) {
    const v = root.getAttribute(attr);
    const next = v && swap(v);
    if (next) root.setAttribute(attr, next);
  }
  root.childNodes.forEach(translate);
}

let busy = false;
export function applyLanguage() {
  busy = true;
  document.documentElement.lang = lang;
  document.title = t('PassGram Web — Private Messaging');
  translate(document.body);
  const btn = document.getElementById('lang-toggle');
  if (btn) btn.textContent = lang === 'tr' ? 'EN' : 'TR';
  setTimeout(() => { busy = false; }, 0);
}

export function setLanguage(next) {
  lang = next === 'tr' ? 'tr' : 'en';
  try { localStorage.setItem(KEY, lang); } catch {}
  applyLanguage();
}

export function initI18n() {
  const btn = document.createElement('button');
  btn.id = 'lang-toggle';
  btn.type = 'button';
  btn.className = 'lang-toggle';
  btn.title = 'Switch language';
  btn.addEventListener('click', () => setLanguage(lang === 'tr' ? 'en' : 'tr'));
  document.body.appendChild(btn);
  new MutationObserver((records) => {
    if (busy || lang === 'en') return;
    busy = true;
    for (const r of records) {
      if (r.type === 'characterData') translate(r.target);
      else if (r.type === 'attributes') translate(r.target);
      else r.addedNodes.forEach(translate);
    }
    setTimeout(() => { busy = false; }, 0);
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  applyLanguage();
}
