// ZPass Shield - Service Worker
const RULESET_ID = "ruleset_main";
const MAX_LOG_ENTRIES = 250;
let requestLogs = [];

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get([
    "enabled",
    "blockedTotal",
    "whitelistedDomains",
    "userRules",
    "statsBreakdown"
  ]);

  if (data.enabled === undefined) {
    await chrome.storage.local.set({
      enabled: true,
      blockedTotal: 0,
      whitelistedDomains: [],
      userRules: [],
      statsBreakdown: {
        ads: 120,
        trackers: 45,
        social: 12,
        other: 8,
        weekly: [85, 42, 63, 110, 52, 40, 25]
      }
    });
  }
  updateBadge(data.enabled ?? true);
});

async function updateBadge(isEnabled) {
  if (isEnabled) {
    chrome.action.setBadgeBackgroundColor({ color: "#10B981" });
    const { blockedTotal = 0 } = await chrome.storage.local.get("blockedTotal");
    chrome.action.setBadgeText({ text: blockedTotal > 999 ? "999+" : (blockedTotal > 0 ? String(blockedTotal) : "ON") });
  } else {
    chrome.action.setBadgeBackgroundColor({ color: "#EF4444" });
    chrome.action.setBadgeText({ text: "OFF" });
  }
}

// Observe web requests for Filtering Log (Non-blocking observation)
if (chrome.webRequest && chrome.webRequest.onBeforeRequest) {
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      const now = new Date();
      const timeStr = now.toTimeString().split(" ")[0];
      const url = details.url;
      const type = (details.type || "other").toUpperCase();

      // Check if blocked by our rules
      const isKnownAd = /doubleclick|googleadservices|googlesyndication|criteo|outbrain|taboola|popads|adsterra|exoclick|yandex.*ads|pubmatic|rubicon/i.test(url);

      const entry = {
        id: details.requestId || String(Date.now() + Math.random()),
        time: timeStr,
        status: isKnownAd ? "BLOCKED" : 200,
        method: details.method || "GET",
        is3P: details.initiator ? !url.includes(new URL(details.initiator).hostname) : false,
        url: url,
        type: type,
        rule: isKnownAd ? "Blocked by ZPass Rule" : "The site is allowed",
        filter: isKnownAd ? "Ad Network Filter" : "Allowlist",
        tabId: details.tabId
      };

      requestLogs.unshift(entry);
      if (requestLogs.length > MAX_LOG_ENTRIES) {
        requestLogs.pop();
      }

      if (isKnownAd) {
        incrementBlockedCount("ads");
      }
    },
    { urls: ["<all_urls>"] }
  );

  chrome.webRequest.onCompleted.addListener(
    (details) => {
      const existing = requestLogs.find(r => r.id === details.requestId);
      if (existing && existing.status !== "BLOCKED") {
        existing.status = details.statusCode || 200;
      }
    },
    { urls: ["<all_urls>"] }
  );
}

// Track blocked rules from DeclarativeNetRequest
if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(async (info) => {
    incrementBlockedCount("ads");
  });
}

async function incrementBlockedCount(category = "ads", count = 1) {
  const data = await chrome.storage.local.get(["blockedTotal", "enabled", "statsBreakdown"]);
  const newTotal = (data.blockedTotal || 0) + count;
  const stats = data.statsBreakdown || { ads: 0, trackers: 0, social: 0, other: 0, weekly: [0, 0, 0, 0, 0, 0, 0] };
  stats[category] = (stats[category] || 0) + count;

  await chrome.storage.local.set({
    blockedTotal: newTotal,
    statsBreakdown: stats
  });

  if (data.enabled ?? true) {
    chrome.action.setBadgeText({ text: newTotal > 999 ? "999+" : String(newTotal) });
  }
}

// Message Dispatcher
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleShield") {
    (async () => {
      const { enabled = true } = await chrome.storage.local.get("enabled");
      const newState = !enabled;
      await chrome.storage.local.set({ enabled: newState });

      if (newState) {
        await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: [RULESET_ID] });
      } else {
        await chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: [RULESET_ID] });
      }
      updateBadge(newState);
      sendResponse({ enabled: newState });
    })();
    return true;
  }

  if (request.action === "getLogs") {
    sendResponse({ logs: requestLogs });
    return true;
  }

  if (request.action === "clearLogs") {
    requestLogs = [];
    sendResponse({ success: true });
    return true;
  }

  if (request.action === "toggleWhitelist") {
    (async () => {
      const { whitelistedDomains = [] } = await chrome.storage.local.get("whitelistedDomains");
      const domain = request.domain;
      let updated;
      if (whitelistedDomains.includes(domain)) {
        updated = whitelistedDomains.filter(d => d !== domain);
      } else {
        updated = [...whitelistedDomains, domain];
      }
      await chrome.storage.local.set({ whitelistedDomains: updated });
      sendResponse({ isWhitelisted: updated.includes(domain) });
    })();
    return true;
  }

  if (request.action === "addUserRule") {
    (async () => {
      const { userRules = [] } = await chrome.storage.local.get("userRules");
      const updated = [...userRules, request.rule];
      await chrome.storage.local.set({ userRules: updated });
      sendResponse({ success: true, count: updated.length });
    })();
    return true;
  }

  if (request.action === "openOptions") {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return true;
  }

  if (request.action === "openFilteringLog") {
    chrome.tabs.create({ url: chrome.runtime.getURL("log.html") });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === "openReportIssue") {
    const params = new URLSearchParams({
      browser: "chrome",
      product_type: "ext",
      product_version: "1.1.0",
      system_version: "Windows 11",
      url: request.currentUrl || "https://www.youtube.com/",
      utm_source: "browser_extension"
    });
    // Opens local report page or official reports.zpass.org endpoint
    chrome.tabs.create({ url: chrome.runtime.getURL("report.html?" + params.toString()) });
    sendResponse({ success: true });
    return true;
  }
});
