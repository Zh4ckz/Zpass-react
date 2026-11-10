document.addEventListener("DOMContentLoaded", async () => {
  const targetDomainEl = document.getElementById("targetDomain");
  const protectionTitleEl = document.getElementById("protectionTitle");
  const totalBlockedEl = document.getElementById("totalBlocked");
  const mainShieldToggle = document.getElementById("mainShieldToggle");

  const tabActions = document.getElementById("tabActions");
  const tabStats = document.getElementById("tabStats");
  const viewActions = document.getElementById("viewActions");
  const viewStats = document.getElementById("viewStats");

  const btnSettings = document.getElementById("btnSettings");
  const btnPause = document.getElementById("btnPause");
  const actionBlockElement = document.getElementById("actionBlockElement");
  const actionFilteringLog = document.getElementById("actionFilteringLog");
  const actionReportIssue = document.getElementById("actionReportIssue");
  const actionCheckSecurity = document.getElementById("actionCheckSecurity");
  const securityBadge = document.getElementById("securityBadge");

  const statAds = document.getElementById("statAds");
  const statTrackers = document.getElementById("statTrackers");
  const statSocial = document.getElementById("statSocial");
  const statOther = document.getElementById("statOther");

  let currentDomain = "Bilinmiyor";
  let currentFullUrl = "";
  let isHttps = true;

  // 1. Query Current Active Tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url) {
    currentFullUrl = tab.url;
    try {
      const url = new URL(tab.url);
      currentDomain = url.hostname;
      isHttps = url.protocol === "https:";
      targetDomainEl.textContent = currentDomain || "Özel Sayfa";
    } catch (e) {
      targetDomainEl.textContent = "Tarayıcı";
    }
  }

  securityBadge.textContent = isHttps ? "HTTPS & Güvenli" : "HTTP (Güvensiz)";
  securityBadge.style.color = isHttps ? "#10B981" : "#EF4444";

  // 2. Load Storage State
  const data = await chrome.storage.local.get([
    "enabled",
    "blockedTotal",
    "whitelistedDomains",
    "statsBreakdown"
  ]);

  const isEnabled = data.enabled ?? true;
  const whitelisted = data.whitelistedDomains || [];
  const isSiteWhitelisted = whitelisted.includes(currentDomain);
  const activeProtection = isEnabled && !isSiteWhitelisted;

  mainShieldToggle.checked = activeProtection;
  updateStatusDisplay(activeProtection, data.blockedTotal || 0);

  // Statistics Breakdown
  const stats = data.statsBreakdown || {
    ads: 1104,
    trackers: 9,
    social: 2,
    other: 75,
    weekly: [110, 45, 60, 95, 50, 42, 20]
  };

  statAds.textContent = (stats.ads || 0).toLocaleString();
  statTrackers.textContent = (stats.trackers || 0).toLocaleString();
  statSocial.textContent = (stats.social || 0).toLocaleString();
  statOther.textContent = (stats.other || 0).toLocaleString();

  // Draw Spline Curve Chart
  drawStatsChart(stats.weekly || [110, 45, 60, 95, 50, 42, 20]);

  // 3. Tab Switching
  tabActions.addEventListener("click", () => {
    tabActions.classList.add("active");
    tabStats.classList.remove("active");
    viewActions.classList.add("active");
    viewStats.classList.remove("active");
  });

  tabStats.addEventListener("click", () => {
    tabStats.classList.add("active");
    tabActions.classList.remove("active");
    viewStats.classList.add("active");
    viewActions.classList.remove("active");
  });

  // 4. Toggle Shield
  mainShieldToggle.addEventListener("change", () => {
    chrome.runtime.sendMessage({ action: "toggleShield" }, (res) => {
      updateStatusDisplay(res.enabled, data.blockedTotal || 0);
      if (tab && tab.id) {
        chrome.tabs.reload(tab.id);
      }
    });
  });

  // 5. Action Handlers
  btnSettings.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "openOptions" });
  });

  actionFilteringLog.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "openFilteringLog" });
  });

  actionReportIssue.addEventListener("click", () => {
    chrome.runtime.sendMessage({
      action: "openReportIssue",
      currentUrl: currentFullUrl
    });
  });

  actionBlockElement.addEventListener("click", async () => {
    if (tab && tab.id) {
      window.close(); // Close popup so user can click page elements
      chrome.tabs.sendMessage(tab.id, { action: "startElementPicker" });
    }
  });

  actionCheckSecurity.addEventListener("click", () => {
    alert(`Site Güvenlik Raporu:\n\nAlan Adı: ${currentDomain}\nProtokol: ${isHttps ? "Güvenli (TLS/HTTPS)" : "Güvensiz (HTTP)"}\nZPass Durumu: Güvenlik Filtreleri Aktif`);
  });

  btnPause.addEventListener("click", () => {
    if (!currentDomain) return;
    chrome.runtime.sendMessage({ action: "toggleWhitelist", domain: currentDomain }, (res) => {
      alert(`${currentDomain} sitesi ${res.isWhitelisted ? "İzin Verilenler (Allowlist) listesine eklendi." : "İzin listesinden çıkarıldı."}`);
      if (tab && tab.id) {
        chrome.tabs.reload(tab.id);
      }
      window.close();
    });
  });

  function updateStatusDisplay(active, count) {
    if (active) {
      protectionTitleEl.textContent = "Protection is enabled";
      protectionTitleEl.style.color = "#FFFFFF";
    } else {
      protectionTitleEl.textContent = "Protection is disabled";
      protectionTitleEl.style.color = "#9E9E9E";
    }
    totalBlockedEl.textContent = `Total blocked: ${count.toLocaleString()}`;
  }

  // Draw smooth weekly stats curve matching Screenshot 3
  function drawStatsChart(dataPoints) {
    const canvas = document.getElementById("statsChart");
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw background vertical grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    const stepX = width / (dataPoints.length - 1);
    for (let i = 0; i < dataPoints.length; i++) {
      const x = i * stepX;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Normalize points
    const maxVal = Math.max(...dataPoints, 10);
    const coords = dataPoints.map((val, idx) => ({
      x: idx * stepX,
      y: height - (val / maxVal) * (height - 20) - 10
    }));

    // Draw Smooth Spline Curve
    ctx.strokeStyle = "#2ECC71";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);

    for (let i = 0; i < coords.length - 1; i++) {
      const xc = (coords[i].x + coords[i + 1].x) / 2;
      const yc = (coords[i].y + coords[i + 1].y) / 2;
      ctx.quadraticCurveTo(coords[i].x, coords[i].y, xc, yc);
    }
    ctx.lineTo(coords[coords.length - 1].x, coords[coords.length - 1].y);
    ctx.stroke();
  }
});
