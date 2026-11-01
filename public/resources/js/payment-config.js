(async function loadZPassPaymentConfig() {
  const configUrl = "/api/payment-config.json";
  const fallbackConfig = {
    currency: "USD",
    plans: {
      PLUS_MONTHLY: { price: 4.99, enabled: true },
      PLUS_YEARLY: { price: 49.9, enabled: true },
      PRO_MONTHLY: { price: 9, enabled: true },
      PRO_YEARLY: { price: 90, enabled: true }
    }
  };
  let config = fallbackConfig;

  const money = (value) => new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: config.currency || "USD",
    maximumFractionDigits: 2
  }).format(Number(value) || 0);

  const billingButtons = document.querySelectorAll(".billing-toggle [data-billing]");
  const audienceButtons = document.querySelectorAll(".plan-audience-toggle [data-audience]");
  const businessSeatButtons = document.querySelectorAll(".business-seat-options [data-seat-count]");
  const personalPlans = document.getElementById("personalPlans");
  const businessPlans = document.getElementById("businessPlans");
  const businessSinglePrice = document.getElementById("businessSinglePrice");
  const businessSingleTotal = document.getElementById("businessSingleTotal");
  const businessSeatPrice = document.getElementById("businessSeatPrice");
  const businessSeatTotal = document.getElementById("businessSeatTotal");
  const businessEnterpriseCta = document.getElementById("businessEnterpriseCta");
  const checkoutBar = document.getElementById("pricingCheckoutBar");
  const checkoutPlan = document.getElementById("pricingCheckoutPlan");
  const checkoutCost = document.getElementById("pricingCheckoutCost");
  const checkoutBilled = document.getElementById("pricingCheckoutBilled");
  const checkoutCta = document.getElementById("pricingCheckoutCta");
  const businessRates = new Map([[2, 7], [5, 6], [10, 4.5]]);
  let selectedBilling = "MONTHLY";
  let selectedSeatCount = 2;
  let selectedPlan = "PLUS";
  let businessSingleQuoteHref = "mailto:rezan@dr.com";
  let businessTeamQuoteHref = "mailto:rezan@dr.com";

  const syncToggleIndicator = (toggle, buttons) => {
    const activeButton = [...buttons].find((button) => button.classList.contains("active"));
    const indicator = toggle?.querySelector(":scope > .indicator");
    if (!activeButton || !indicator || !toggle) return;

    const toggleRect = toggle.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();
    indicator.style.left = `${buttonRect.left - toggleRect.left - toggle.clientLeft}px`;
    indicator.style.width = `${buttonRect.width}px`;
  };

  const syncPricingToggleIndicators = () => {
    syncToggleIndicator(document.querySelector(".plan-audience-toggle"), audienceButtons);
    syncToggleIndicator(document.getElementById("pricingBillingToggle"), billingButtons);
  };

  const updateCheckoutBar = () => {
    if (!checkoutPlan || !checkoutCost || !checkoutBilled || !checkoutCta) return;

    if (selectedPlan.startsWith("BUSINESS_")) {
      const businessPlan = {
        BUSINESS_SINGLE: {
          name: "PassGram Business",
          price: businessSinglePrice?.textContent || "",
          billed: businessSingleTotal?.textContent || "",
          href: businessSingleQuoteHref,
          cta: "Request a quote"
        },
        BUSINESS_TEAM: {
          name: "PassGram Teams",
          price: businessSeatPrice?.textContent || "",
          billed: businessSeatTotal?.textContent || "",
          href: businessTeamQuoteHref,
          cta: "Request a team quote"
        },
        BUSINESS_ENTERPRISE: {
          name: "PassGram Enterprise",
          price: "Custom pricing",
          billed: "For large organizations",
          href: businessEnterpriseCta?.href || "mailto:rezan@dr.com",
          cta: "Contact sales"
        }
      }[selectedPlan];
      if (!businessPlan) throw new Error(`Unsupported business plan: ${selectedPlan}`);
      checkoutPlan.textContent = businessPlan.name;
      checkoutCost.textContent = businessPlan.price;
      checkoutBilled.textContent = businessPlan.billed;
      checkoutCta.href = businessPlan.href;
      checkoutCta.textContent = businessPlan.cta;
      return;
    }

    const plans = {
      FREE: { name: "PassGram Free", price: "$0<small>/month</small>", billed: "Free forever", cta: "Continue free" },
      PLUS: { name: "PassGram Plus", price: "", billed: "", cta: "Get Pass Plus" },
      PRO: { name: "PassGram Pro", price: "", billed: "", cta: "Get Pass Pro" }
    };
    const plan = plans[selectedPlan] || plans.PRO;
    const priceId = selectedPlan === "PLUS" ? "marketingPlusPrice" : "marketingProPrice";
    const billedId = selectedPlan === "PLUS" ? "marketingPlusBilledNote" : "marketingProBilledNote";
    const priceEl = document.getElementById(priceId);
    const billedEl = document.getElementById(billedId);

    checkoutPlan.textContent = plan.name;
    checkoutCost.innerHTML = selectedPlan === "FREE" ? plan.price : priceEl?.innerHTML || "";
    checkoutBilled.textContent = plan.billed || billedEl?.textContent || (selectedBilling === "YEARLY" ? "Billed annually" : "Billed monthly");
    if (selectedPlan === "FREE") {
      checkoutCta.href = "#login";
    } else {
      const url = new URL("/checkout", location.origin);
      url.searchParams.set("product", "zpass");
      url.searchParams.set("plan", selectedPlan);
      url.searchParams.set("billing", selectedBilling);
      checkoutCta.href = `${url.pathname}${url.search}`;
    }
    checkoutCta.textContent = plan.cta;
  };

  const selectPlan = (plan) => {
    selectedPlan = plan;
    document.querySelectorAll("[data-plan-card]").forEach((card) => {
      card.dataset.selected = String(card.dataset.planCard === plan);
    });
    document.querySelectorAll("[data-select-plan]").forEach((button) => {
      const isSelected = button.dataset.selectPlan === plan;
      button.setAttribute("aria-pressed", String(isSelected));
    });
    updateCheckoutBar();
  };

  const businessMoney = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const setAudience = (audience) => {
    const isBusiness = audience === "business";
    audienceButtons.forEach((button) => {
      const isActive = button.dataset.audience === audience;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    syncPricingToggleIndicators();
    personalPlans?.classList.toggle("hidden", isBusiness);
    businessPlans?.classList.toggle("hidden", !isBusiness);
    selectPlan(isBusiness ? "BUSINESS_SINGLE" : "PLUS");
  };

  const setPlanCard = (familyId, priceElId, noteElId, billing) => {
    const monthlyPlan = config.plans?.[`${familyId}_MONTHLY`];
    const yearlyPlan = config.plans?.[`${familyId}_YEARLY`];
    const priceEl = document.getElementById(priceElId);
    const noteEl = document.getElementById(noteElId);
    if (!priceEl) return;

    if (billing === "YEARLY" && yearlyPlan?.enabled !== false && yearlyPlan) {
      priceEl.innerHTML = `${money(yearlyPlan.price / 12)}<small>/month</small>`;
      if (noteEl) noteEl.textContent = `Billed once per year at ${money(yearlyPlan.price)}`;
    } else if (monthlyPlan?.enabled !== false && monthlyPlan) {
      priceEl.innerHTML = `${money(monthlyPlan.price)}<small>/month</small>`;
      if (noteEl) noteEl.textContent = "";
    }

  };

  const renderMarketingPricing = (billing) => {
    setPlanCard("PLUS", "marketingPlusPrice", "marketingPlusBilledNote", billing);
    setPlanCard("PRO", "marketingProPrice", "marketingProBilledNote", billing);

    const badge = document.getElementById("yearlySavingsBadge");
    if (!badge) return;
    const savings = ["PLUS", "PRO"].flatMap((plan) => {
      const monthly = config.plans?.[`${plan}_MONTHLY`]?.price;
      const yearly = config.plans?.[`${plan}_YEARLY`]?.price;
      return monthly > 0 && yearly >= 0 ? [1 - yearly / (monthly * 12)] : [];
    });
    const maxSavings = Math.max(0, ...savings);
    badge.textContent = maxSavings > 0 ? `SAVE ${Math.round(maxSavings * 100)}%` : "Billed upfront";
  };

  const setBilling = (billing) => {
    selectedBilling = billing === "YEARLY" ? "YEARLY" : "MONTHLY";
    billingButtons.forEach((button) => {
      const isActive = button.dataset.billing === selectedBilling;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    syncPricingToggleIndicators();
    renderMarketingPricing(selectedBilling);
    setBusinessSinglePrice();
    setBusinessSeatCount(selectedSeatCount);
    updateCheckoutBar();
  };

  const setBusinessSinglePrice = () => {
    if (!businessSinglePrice || !businessSingleTotal) return;
    const unitPrice = 8;
    const total = unitPrice * (selectedBilling === "YEARLY" ? 12 : 1);
    businessSinglePrice.innerHTML = `${businessMoney.format(unitPrice)}<small>/user/month</small>`;
    businessSingleTotal.textContent = `${businessMoney.format(total)} billed ${selectedBilling === "YEARLY" ? "annually" : "monthly"}`;
  };

  const setBusinessSeatCount = (seatCount) => {
    const unitPrice = businessRates.get(seatCount);
    if (!unitPrice) throw new Error(`Unsupported business seat tier: ${seatCount}`);

    businessSeatButtons.forEach((button) => {
      const isActive = Number(button.dataset.seatCount) === seatCount;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    if (!businessSeatPrice || !businessSeatTotal) return;

    selectedSeatCount = seatCount;
    businessSeatPrice.innerHTML = `${businessMoney.format(unitPrice)}<small>/user/month</small>`;
    const billingTerm = selectedBilling === "YEARLY" ? 12 : 1;
    const total = seatCount * unitPrice * billingTerm;
    const billingLabel = selectedBilling === "YEARLY" ? "billed annually" : "billed monthly";
    businessSeatTotal.textContent = `${seatCount} ${seatCount === 1 ? "seat" : "seats"} · ${businessMoney.format(total)} ${billingLabel}`;

    const subject = `PassGram Teams quote: ${seatCount} seats`;
    const body = [
      "Please prepare a PassGram Teams quote.",
      `Purchased seats: ${seatCount} (including the account owner)`,
      `Price per user/month: ${businessMoney.format(unitPrice)}`,
      `Billing period: ${selectedBilling === "YEARLY" ? "yearly" : "monthly"}`,
      `Estimated total: ${businessMoney.format(total)}`,
      "Please confirm the payment and activate the purchased seat limit."
    ].join("\n");
    const mailto = new URL("mailto:rezan@dr.com");
    mailto.searchParams.set("subject", subject);
    mailto.searchParams.set("body", body);
    businessTeamQuoteHref = mailto.toString();
    updateCheckoutBar();
  };

  audienceButtons.forEach((button) => {
    button.addEventListener("click", () => setAudience(button.dataset.audience));
  });
  window.addEventListener("resize", syncPricingToggleIndicators);
  billingButtons.forEach((button) => {
    button.addEventListener("click", () => setBilling(button.dataset.billing));
  });
  businessSeatButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setBusinessSeatCount(Number(button.dataset.seatCount));
      selectPlan("BUSINESS_TEAM");
    });
  });
  document.querySelectorAll("[data-select-plan]").forEach((button) => {
    button.addEventListener("click", () => selectPlan(button.dataset.selectPlan));
  });
  const singleQuote = new URL("mailto:rezan@dr.com");
  singleQuote.searchParams.set("subject", "PassGram Business single-user quote");
  singleQuote.searchParams.set("body", "Please prepare a PassGram Business quote for one user.");
  businessSingleQuoteHref = singleQuote.toString();

  const pricingSection = document.getElementById("pricing");
  if (checkoutBar && pricingSection && "IntersectionObserver" in window) {
    const pricingObserver = new IntersectionObserver(([entry]) => {
      checkoutBar.classList.toggle("visible", entry.isIntersecting);
    }, { threshold: 0.08 });
    pricingObserver.observe(pricingSection);
  } else {
    checkoutBar?.classList.add("visible");
  }

  setAudience(document.querySelector(".plan-audience-toggle [data-audience].active")?.dataset.audience || "personal");
  setBilling(document.querySelector(".billing-toggle [data-billing].active")?.dataset.billing || "MONTHLY");

  try {
    const response = await fetch(configUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const remoteConfig = await response.json();
    if (!remoteConfig?.plans) throw new Error("Payment configuration is missing plan data");
    config = remoteConfig;
    window.ZPassPaymentConfig = config;

    document.querySelector('[data-plan="PLUS"] small')?.replaceChildren(
      document.createTextNode(`${money(config.plans?.PLUS_MONTHLY?.price)} / month`)
    );
    document.querySelector('[data-plan="PRO"] small')?.replaceChildren(
      document.createTextNode(`${money(config.plans?.PRO_MONTHLY?.price)} / month`)
    );
    setBilling(document.querySelector(".billing-toggle [data-billing].active")?.dataset.billing || "MONTHLY");
  } catch (error) {
    console.warn("PassGram payment configuration unavailable; using the built-in prices", error);
  }
})();
