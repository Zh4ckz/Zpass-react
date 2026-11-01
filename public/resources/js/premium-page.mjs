import { paymentPlans } from "/resources/js/payment-plans.mjs";
import { getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "/resources/js/firebase-config.mjs";

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
const periodButtons = [...document.querySelectorAll("[data-period]")];
const closeButton = document.getElementById("closePremium");
const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
let period = "MONTHLY";

// Page card id -> pricing tier
const cardTier = { PRO: "PLUS", FAMILY: "PRO" };
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

// Renders text as per-character columns; changed characters slide up (value rose) or down (value fell).
function rollText(el, text, direction) {
  const previous = el.dataset.value;
  if (previous === text) return;
  el.dataset.value = text;
  el.setAttribute("aria-label", text);
  if (previous === undefined || reduceMotion.matches) {
    el.textContent = text;
    return;
  }
  const old = [...previous];
  const next = [...text];
  el.textContent = "";
  el.classList.add("roll");
  next.forEach((char, index) => {
    const cell = document.createElement("span");
    cell.className = "roll-cell";
    cell.setAttribute("aria-hidden", "true");
    const unchanged = old[old.length - next.length + index] === char;
    const face = document.createElement("span");
    face.className = "roll-face";
    face.textContent = char;
    if (unchanged || !/\d/.test(char)) {
      cell.appendChild(face);
    } else {
      const from = document.createElement("span");
      from.className = "roll-face roll-from";
      from.textContent = old[old.length - next.length + index] ?? "";
      cell.classList.add(direction > 0 ? "roll-up" : "roll-down");
      cell.style.setProperty("--roll-delay", `${index * 45}ms`);
      cell.append(from, face);
    }
    el.appendChild(cell);
  });
}

function renderPrices() {
  const key = period.toLowerCase();
  const direction = period === "YEARLY" ? 1 : -1;
  const savings = ["PLUS", "PRO"].map(tier => {
    const monthly = paymentPlans[tier].monthly.price;
    const yearly = paymentPlans[tier].yearly.price;
    return monthly > 0 ? Math.max(0, Math.round((1 - yearly / (monthly * 12)) * 100)) : 0;
  });
  const bestSavings = Math.max(...savings);
  document.getElementById("savePill").textContent = bestSavings ? `SAVE UP TO ${bestSavings}%` : "YEARLY";
  for (const [card, tier] of Object.entries(cardTier)) {
    const price = paymentPlans[tier][key].price;
    rollText(document.querySelector(`[data-price="${card}"]`), formatter.format(price), direction);
    document.querySelector(`[data-price-period="${card}"]`).textContent = period === "YEARLY" ? "/ year" : "/ month";
    document.querySelector(`[data-billed="${card}"]`).textContent = period === "YEARLY"
      ? `Billed yearly · ${formatter.format(price)} total`
      : "Billed monthly";
    document.querySelector(`[data-checkout="${card}"]`).href = `/checkout?plan=${tier}&billing=${period}`;
  }
}

periodButtons.forEach(button => button.addEventListener("click", () => {
  period = button.dataset.period;
  periodButtons.forEach(item => item.setAttribute("aria-pressed", String(item === button)));
  renderPrices();
}));

closeButton.addEventListener("click", () => {
  if (window.parent !== window) {
    window.parent.postMessage({ type: "zpass-premium-close" }, window.location.origin);
  } else {
    window.location.assign("/");
  }
});

window.addEventListener("keydown", event => {
  if (event.key !== "Escape" || window.parent === window) return;
  window.parent.postMessage({ type: "zpass-premium-close" }, window.location.origin);
});

if (new URLSearchParams(location.search).has("campaign")) {
  document.body.classList.add("campaign");
}
window.addEventListener("zpass-config-updated", renderPrices);
renderPrices();

onAuthStateChanged(auth, user => {
  if (user) {
    document.body.classList.remove("auth-pending");
    return;
  }

  const returnTo = new URLSearchParams(location.search).has("campaign")
    ? "/premium/?campaign=1"
    : "/premium/";
  location.replace(`/dashboard.html?returnTo=${encodeURIComponent(returnTo)}`);
}, error => {
  console.error("Could not verify the signed-in account for premium access:", error);
  location.replace("/dashboard.html?returnTo=%2Fpremium%2F");
});
