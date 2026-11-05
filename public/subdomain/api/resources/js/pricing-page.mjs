import { paymentPlans } from "/resources/js/payment-plans.mjs?v=2";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
let period = "MONTHLY";

function renderPrice(node, value) {
  const formatted = money.format(value);
  node.textContent = formatted;
  node.setAttribute("aria-label", formatted);
}

function renderPrices() {
  const key = period.toLowerCase();
  const savings = ["PLUS", "PRO"].map(tier => {
    const month = paymentPlans[tier].monthly.price;
    const year = paymentPlans[tier].yearly.price;
    return month ? Math.max(0, Math.round((1 - year / month) * 100)) : 0;
  });
  const best = Math.max(...savings);
  const savingsLabel = document.getElementById("pg-savings");
  if (savingsLabel) savingsLabel.textContent = best ? `Save up to ${best}%` : "Yearly";

  for (const tier of ["PLUS", "PRO"]) {
    const price = paymentPlans[tier][key].price;
    const priceNode = document.querySelector(`[data-price="${tier}"]`);
    const periodNode = document.querySelector(`[data-period-label="${tier}"]`);
    const billedNode = document.querySelector(`[data-billed="${tier}"]`);
    const checkoutNode = document.querySelector(`[data-checkout="${tier}"]`);
    if (priceNode) renderPrice(priceNode, price);
    if (periodNode) periodNode.textContent = "/ month";
    if (billedNode) billedNode.textContent = period === "YEARLY" ? `Charged monthly for 12 months · ${money.format(price * 12)} total` : "Billed monthly";
    if (checkoutNode) checkoutNode.href = `https://pay.zpas.org/?plan=${tier}&billing=${period}`;
  }
}

document.querySelectorAll("[data-period]").forEach(button => {
  button.addEventListener("click", () => {
    period = button.dataset.period;
    document.querySelectorAll("[data-period]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    renderPrices();
  });
});

const menuButton = document.querySelector(".pg-menu-button");
const nav = document.getElementById("pg-nav");
menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  nav?.classList.toggle("is-open", open);
  menuButton.textContent = open ? "Close" : "Menu";
});

window.addEventListener("zpass-config-updated", renderPrices);
renderPrices();
