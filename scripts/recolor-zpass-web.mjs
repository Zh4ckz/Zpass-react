// Recolors the LIVE Z Pass website stylesheets to match the app's dark
// blue/cyan/navy palette (the one already used for the APK icon/theme).
// Classifies each hex color by the CSS property it's attached to plus its
// HSL hue/lightness, rather than a blind hex-to-hex swap.
// Usage: node scripts/recolor-zpass-web.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CSS_DIR = path.join(ROOT, 'public', 'css');

const FILES = [
  'zpass-bundle.css',
  'account-polish.css',
  'help-pages.css',
  'performance.css',
  'ui-fixes.css',
];

const PALETTE = {
  PRIMARY: '#006bff',
  ACCENT: '#00d9ff',
  NAVY: '#07142f',
  BG: '#02050c',
  WHITE: '#f8faff',
  MUTED: '#8b9bb5',
  HOVER: '#0054d6',
  CARD: '#0a1933',
  BORDER: '#16345f',
};

function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const alpha = h.length === 8 ? h.slice(6, 8) : null;
  return { r, g, b, alpha };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s; const l = (max + min) / 2;
  if (max === min) { h = 0; s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function withAlpha(hex, alpha) { return alpha ? hex + alpha : hex; }

// Custom properties carry meaning in the NAME (e.g. --purple was aliased to
// an amber accent color in the old warm theme) — match by name first.
const CUSTOM_PROP_RULES = [
  [/^--(bg)$/, () => PALETTE.BG],
  [/^--(panel|panel2|card)$/, (a) => withAlpha(PALETTE.CARD, a)],
  [/^--(line|border)$/, (a) => withAlpha(PALETTE.BORDER, a)],
  [/^--(text)$/, () => PALETTE.WHITE],
  [/^--(muted)$/, () => PALETTE.MUTED],
  [/^--(purple2?|accent|gold|amber|orange)$/, () => PALETTE.ACCENT],
  [/^--(green|primary|blue)$/, () => PALETTE.PRIMARY],
  [/^--color-bg-(primary)$/, () => PALETTE.BG],
  [/^--color-bg-(secondary|tertiary|hover|active)$/, (a) => withAlpha(PALETTE.CARD, a)],
  [/^--color-accent(-hover)?$/, () => PALETTE.ACCENT],
  [/^--color-text-primary$/, () => PALETTE.WHITE],
  [/^--color-text-(secondary|muted)$/, () => PALETTE.MUTED],
  [/^--color-border(-light)?$/, (a) => withAlpha(PALETTE.BORDER, a)],
];

function classifyCustomProp(prop, hex) {
  const { alpha } = hexToRgb(hex);
  for (const [re, fn] of CUSTOM_PROP_RULES) {
    if (re.test(prop.toLowerCase())) return fn(alpha);
  }
  return null;
}

function classify(prop, hex) {
  const { alpha } = hexToRgb(hex);
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const isNearWhite = l > 78;
  const isGoldish = h >= 20 && h <= 60 && s > 15; // amber/orange/gold (old accent)
  const isWarmBg = h >= 15 && h <= 45 && s > 10 && l < 25; // dark brown backgrounds
  const isGreenish = (h >= 90 && h <= 195) || (h >= 140 && h <= 170); // teal/green accents
  const isBlackish = l < 12;
  const p = prop.toLowerCase();

  if (p.startsWith('--')) {
    const named = classifyCustomProp(p, hex);
    if (named) return named;
  }

  const isTintedDark = isBlackish && (isGoldish || isWarmBg || isGreenish);
  if (isBlackish && !isTintedDark) return null; // true near-black already works

  if (p.includes('background') || p === 'fill') {
    if (isTintedDark || isWarmBg) return withAlpha(PALETTE.BG, alpha);
    if (isNearWhite) return withAlpha(PALETTE.CARD, alpha);
    if (isGoldish) return withAlpha(PALETTE.ACCENT, alpha);
    if (isGreenish) return withAlpha(PALETTE.PRIMARY, alpha);
    return withAlpha(PALETTE.CARD, alpha);
  }

  if (p === 'color' || p === 'caret-color') {
    if (l < 30) return withAlpha(PALETTE.WHITE, alpha);
    if (isGoldish) return withAlpha(PALETTE.ACCENT, alpha);
    if (l < 60) return withAlpha(PALETTE.MUTED, alpha);
    return withAlpha(PALETTE.WHITE, alpha);
  }

  if (p.includes('border') || p === 'outline' || p === 'outline-color') {
    if (isGoldish) return withAlpha(PALETTE.ACCENT, alpha);
    if (isGreenish && s > 40 && l < 40) return withAlpha(PALETTE.PRIMARY, alpha);
    return withAlpha(PALETTE.BORDER, alpha);
  }

  if (p.includes('shadow')) {
    if (isNearWhite) return withAlpha(PALETTE.PRIMARY, alpha);
    if (isGoldish || isGreenish || isWarmBg) return withAlpha(PALETTE.PRIMARY, alpha);
    return null;
  }

  if (isNearWhite) return withAlpha(PALETTE.CARD, alpha);
  if (l < 30) return withAlpha(PALETTE.WHITE, alpha);
  if (isGoldish) return withAlpha(PALETTE.ACCENT, alpha);
  return withAlpha(PALETTE.MUTED, alpha);
}

function recolorDeclaration(decl) {
  const colonIdx = decl.indexOf(':');
  if (colonIdx === -1) return decl;
  const prop = decl.slice(0, colonIdx).trim();
  const value = decl.slice(colonIdx + 1);
  const newValue = value.replace(/#[0-9a-fA-F]{3,8}\b/g, (hex) => classify(prop, hex) || hex);
  return `${prop}:${newValue}`;
}

function recolorRuleBody(body) {
  return body.split(';').map(recolorDeclaration).join(';');
}

function recolorCss(css) {
  let out = '';
  let i = 0;
  while (i < css.length) {
    const brace = css.indexOf('{', i);
    if (brace === -1) { out += css.slice(i); break; }
    out += css.slice(i, brace + 1);
    let depth = 1, j = brace + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    const inner = css.slice(brace + 1, j - 1);
    out += inner.includes('{') ? recolorCss(inner) : recolorRuleBody(inner);
    out += '}';
    i = j;
  }
  return out;
}

function fixBodyCanvas(css) {
  return css.replace(/\bbody\s*\{[^{}]*\}/g, (block) =>
    block.replace(/(background(?:-color)?:[^;}]*?)(#0a1933|#0f0d0a|#110d09)(?=[;}])/g, `$1${PALETTE.BG}`)
  );
}

for (const file of FILES) {
  const p = path.join(CSS_DIR, file);
  if (!fs.existsSync(p)) { console.log('skip (missing)', file); continue; }
  const css = fs.readFileSync(p, 'utf8');
  const recolored = fixBodyCanvas(recolorCss(css));
  fs.writeFileSync(p, recolored);
  console.log('recolored', file);
}
