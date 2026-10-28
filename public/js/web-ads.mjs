import { getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getFirestore, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "/js/firebase-config.mjs";

const DISMISSED_KEY = "zpassPremiumCampaignDismissed";
const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let overlay = null;
let previousFocus = null;
let campaignEnabled = false;
let accountEligible = false;
let authReady = false;

function closeCampaign() {
  if (!overlay) return;
  overlay.remove();
  overlay = null;
  document.body.classList.remove("web-ads-open");
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("message", onFrameMessage);
  previousFocus?.focus?.();
  previousFocus = null;
}

function dismissCampaign() {
  try {
    sessionStorage.setItem(DISMISSED_KEY, "1");
  } catch (error) {
    console.warn("Could not persist premium offer dismissal for this tab:", error);
  }
  closeCampaign();
}

function onKeyDown(event) {
  if (event.key === "Escape") dismissCampaign();
}

function onFrameMessage(event) {
  if (event.origin === location.origin &&
      event.source === overlay?.querySelector("iframe")?.contentWindow &&
      event.data?.type === "zpass-premium-close") dismissCampaign();
}

function renderCampaign() {
  if (!authReady || !campaignEnabled || !accountEligible || sessionStorage.getItem(DISMISSED_KEY)) {
    closeCampaign();
    return;
  }
  if (overlay) return;

  previousFocus = document.activeElement;
  overlay = document.createElement("div");
  overlay.className = "web-ads-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Z Pass premium plans");
  const frame = document.createElement("iframe");
  frame.className = "web-ads-frame";
  frame.src = "/premium/?campaign=1";
  frame.title = "Z Pass premium plans";
  frame.tabIndex = 0;
  frame.setAttribute("allow", "payment");
  overlay.append(frame);
  document.body.append(overlay);
  document.body.classList.add("web-ads-open");
  frame.addEventListener("load", () => frame.focus(), { once: true });
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("message", onFrameMessage);
}

const styleLink = document.createElement("link");
styleLink.rel = "stylesheet";
styleLink.href = "/css/web-ads.css?v=1";
document.head.append(styleLink);

onSnapshot(doc(db, "web_site_config", "web_ads"), snapshot => {
  campaignEnabled = !snapshot.metadata.fromCache &&
    snapshot.exists() && snapshot.data()?.enabled === true;
  renderCampaign();
}, error => {
  console.error("Could not read premium campaign setting:", error);
  campaignEnabled = false;
  renderCampaign();
});

let subscriptionUnsubscribe = null;
onAuthStateChanged(auth, user => {
  subscriptionUnsubscribe?.();
  subscriptionUnsubscribe = null;
  authReady = true;
  accountEligible = false;
  renderCampaign();
  if (!user) return;
  subscriptionUnsubscribe = onSnapshot(doc(db, "subscriptions", user.uid), snapshot => {
    if (snapshot.metadata.fromCache) {
      accountEligible = false;
      renderCampaign();
      return;
    }
    const subscription = snapshot.exists() ? snapshot.data() : {};
    const expiresAt = subscription.expiresAt?.toDate?.().getTime() || 0;
    accountEligible = !(subscription.status === "ACTIVE" &&
      subscription.plan !== "FREE" && expiresAt > Date.now());
    renderCampaign();
  }, error => {
    console.error("Could not check premium subscription:", error);
    accountEligible = false;
    renderCampaign();
  });
});
