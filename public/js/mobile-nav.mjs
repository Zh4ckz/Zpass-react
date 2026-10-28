import { getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "/js/firebase-config.mjs";

const path = location.pathname.replace(/\/index\.html$/, "/");
const skip = window.top !== window || /^\/(premium|admin|checkout|app-verify)/.test(path);
const isDash = /^\/dashboard/.test(path);
const ico = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const I = {
  home: ico('<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>'),
  tag: ico('<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1"/>'),
  info: ico('<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.5" r="1"/>'),
  user: ico('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-4 3.1-6 7-6s7 2 7 6"/>'),
  vault: ico('<rect x="4" y="5" width="16" height="14" rx="3"/><circle cx="12" cy="12" r="2.5"/>'),
  card: ico('<rect x="3" y="6" width="18" height="12" rx="3"/><path d="M3 10h18"/>'),
  code: ico('<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>'),
  gear: ico('<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>'),
  bag: ico('<path d="M6 8h12l1 12H5z"/><path d="M9 8a3 3 0 0 1 6 0"/>'),
  grid: ico('<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>')
};

// Every entry here is a REAL page URL (or a real anchor on a real page). Clicking a tab
// always does a normal browser navigation, so it works identically from any page on the
// site - not just a scroll trick confined to index.html.
const outTabs = [
  { id: "home", label: "Home", icon: I.home, href: "/" },
  { id: "pricing", label: "Pricing", icon: I.tag, href: "/#pricing" },
  { id: "apps", label: "Apps", icon: I.grid, href: "/apps.html" },
  { id: "info", label: "Info", icon: I.info, href: "/info.html" },
  { id: "signin", label: "Sign in", icon: I.user, href: "/dashboard.html" }
];
const inSite = [
  { id: "home", label: "Home", icon: I.home, href: "/" },
  { id: "vault", label: "Vault", icon: I.vault, href: "/dashboard.html" },
  { id: "plans", label: "Plans", icon: I.bag, href: "/subscription.html" },
  { id: "apps", label: "Apps", icon: I.grid, href: "/apps.html" },
  { id: "profile", label: "Profile", icon: I.user, href: "/dashboard.html#general" }
];
const inDash = [
  { id: "overview", label: "Vault", icon: I.vault, panel: "overview" },
  { id: "cards", label: "Cards", icon: I.card, panel: "cards" },
  { id: "authenticator", label: "Codes", icon: I.code, panel: "authenticator" },
  { id: "profile", label: "Profile", icon: I.user, link: "profile" },
  { id: "settings", label: "Settings", icon: I.gear, link: "settings" }
];

let nav = null;
let links = null;
let ind = null;

function items() {
  return links ? Array.from(links.querySelectorAll("a, button")) : [];
}

function moveIndicator() {
  const a = links && links.querySelector(".active");
  if (!a || !ind) return;
  ind.style.width = a.offsetWidth + "px";
  ind.style.transform = `translateX(${a.offsetLeft}px)`;
  links.scrollTo?.({ left: 0 });
}

function setActive(el) {
  items().forEach(b => {
    const active = b === el;
    b.classList.toggle("active", active);
    if (b instanceof HTMLAnchorElement) {
      if (active) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    }
  });
  moveIndicator();
}

function build(tabs, cta) {
  nav?.remove();
  nav = document.createElement("nav");
  nav.className = "zp-mnav";
  nav.setAttribute("aria-label", "Main navigation");
  links = document.createElement("div");
  links.className = "zp-mnav-links";
  ind = document.createElement("span");
  ind.className = "zp-mnav-ind";
  links.appendChild(ind);
  tabs.forEach(t => {
    const isLink = !!t.href;
    const el = document.createElement(isLink ? "a" : "button");
    el.dataset.tab = t.id;
    if (isLink) el.href = t.href; else el.type = "button";
    el.innerHTML = `${t.icon}<span>${t.label}</span>`;
    if (!isLink) el.addEventListener("click", () => {
      setActive(el);
      if (t.panel) document.querySelector(`.nav-item[data-panel="${t.panel}"]`)?.click();
      else if (t.link) document.querySelector(`[data-panel-link="${t.link}"]`)?.click();
    });
    links.appendChild(el);
  });
  nav.appendChild(links);
  if (cta) {
    const a = document.createElement("a");
    a.className = "zp-mnav-cta";
    a.href = cta.href;
    a.textContent = cta.label;
    nav.appendChild(a);
  }
  document.body.appendChild(nav);
  document.body.classList.add("has-mnav");
  requestAnimationFrame(moveIndicator);
}

function remove() {
  nav?.remove();
  nav = null;
  document.body.classList.remove("has-mnav");
}

function markActiveByUrl(tabs) {
  const currentPath = normalizePath(path);
  const matchesPath = t => t.href && normalizePath(new URL(t.href, location.origin).pathname) === currentPath;
  const match = tabs.find(t => matchesPath(t) && new URL(t.href, location.origin).hash === location.hash && location.hash) ||
    tabs.find(t => matchesPath(t) && !new URL(t.href, location.origin).hash);
  const el = links.querySelector(`[data-tab="${(match || tabs[0]).id}"]`);
  setActive(el);
}

function normalizePath(value) {
  const pathname = new URL(value, location.origin).pathname
    .replace(/\/index\.html$/i, "/")
    .replace(/\.html$/i, "")
    .replace(/\/+$/, "");
  return pathname || "/";
}

function render(user) {
  if (isDash) {
    const open = document.body.classList.contains("vault-open");
    if (user && open) { if (!nav || nav.dataset.mode !== "dash") { build(inDash); nav.dataset.mode = "dash"; } }
    else if (!user && document.getElementById("authView") && !document.getElementById("authView").classList.contains("hidden")) {
      if (!nav || nav.dataset.mode !== "out") { build(outTabs); nav.dataset.mode = "out"; setActive(links.querySelector('[data-tab="signin"]')); }
    } else remove();
    return;
  }
  if (user) {
    build(inSite);
    nav.dataset.mode = "site";
    markActiveByUrl(inSite);
  } else {
    build(outTabs);
    nav.dataset.mode = "out";
    markActiveByUrl(outTabs);
  }
}

if (!skip) {
  // Opened directly on an inner page (no history): make the phone Back button go to the site Home instead of leaving.
  if (path !== "/" && !history.state?.zpGuard && history.length <= 2 && !(document.referrer && new URL(document.referrer).origin === location.origin)) {
    const here = location.href;
    history.replaceState({ zpGuard: "root" }, "", "/");
    history.pushState({ zpGuard: "page" }, "", here);
    window.addEventListener("popstate", e => {
      if (e.state?.zpGuard === "root") location.replace("/");
    });
  }
  const start = () => {
    const auth = getAuth(getApps()[0] || initializeApp(firebaseConfig));
    let current = null;
    onAuthStateChanged(auth, user => { current = user; render(user); });
    if (isDash) new MutationObserver(() => render(current)).observe(document.body, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("resize", moveIndicator);
  };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
}
