import { paymentPlans } from "/js/payment-plans.mjs";
import { getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "/js/firebase-config.mjs";

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
const periodButtons = [...document.querySelectorAll("[data-period]")];
const closeButton = document.getElementById("closePremium");
const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
let period = "MONTHLY";

function renderPrices() {
  const key = period.toLowerCase();
  const savings = ["PLUS", "PRO"].map(tier => {
    const monthly = paymentPlans[tier].monthly.price;
    const yearly = paymentPlans[tier].yearly.price;
    return monthly > 0 ? Math.max(0, Math.round((1 - yearly / (monthly * 12)) * 100)) : 0;
  });
  const bestSavings = Math.max(...savings);
  document.getElementById("savePill").textContent = bestSavings ? `SAVE UP TO ${bestSavings}%` : "YEARLY";
  for (const tier of ["PLUS", "PRO"]) {
    const price = paymentPlans[tier][key].price;
    document.querySelector(`[data-price="${tier}"]`).textContent = formatter.format(price);
    document.querySelector(`[data-price-period="${tier}"]`).textContent = period === "YEARLY" ? "/ year" : "/ month";
    document.querySelector(`[data-billed="${tier}"]`).textContent = period === "YEARLY"
      ? `Billed yearly · ${formatter.format(price)} total`
      : "Billed monthly";
    document.querySelector(`[data-checkout="${tier}"]`).href = `/checkout?plan=${tier}&billing=${period}`;
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
