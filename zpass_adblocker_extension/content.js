// ZPass Shield - Content Script & Element Picker
(function () {
  "use strict";

  chrome.storage.local.get(["enabled", "whitelistedDomains", "userRules"], function (data) {
    if (data.enabled === false) return;

    const hostname = window.location.hostname;
    const whitelisted = data.whitelistedDomains || [];
    if (whitelisted.some(domain => hostname === domain || hostname.endsWith("." + domain))) {
      return;
    }

    initAdBlocker();
    applyUserRules(data.userRules || []);
  });

  function applyUserRules(rules) {
    if (!rules || !rules.length) return;
    const hostname = window.location.hostname;
    let cssRules = [];

    rules.forEach(rule => {
      if (rule.includes("##")) {
        const [domain, selector] = rule.split("##");
        if (!domain || hostname.includes(domain)) {
          cssRules.push(`${selector} { display: none !important; visibility: hidden !important; }`);
        }
      } else {
        cssRules.push(`${rule} { display: none !important; visibility: hidden !important; }`);
      }
    });

    if (cssRules.length) {
      const style = document.createElement("style");
      style.id = "zpass-user-rules";
      style.textContent = cssRules.join("\n");
      (document.head || document.documentElement).appendChild(style);
    }
  }

  function initAdBlocker() {
    try {
      window.canRunAds = true;
      window.isAdBlockActive = false;
      window.ga = window.ga || function () {};
      window.google_ad_status = 1;
      window.google_api_tracker = true;
    } catch (e) {}

    // Cosmetic Hiding CSS
    try {
      const css = `
        div[class*="ad-"], div[class*="ads-"], div[class*="ad_"], div[class*="ads_"],
        div[id*="ad-"], div[id*="ads-"], div[id*="ad_"], div[id*="ads_"],
        iframe[src*="ad"], iframe[src*="doubleclick"], iframe[src*="banner"],
        .ad-container, .ad-wrapper, .ad-banner, .google-ad, ins.adsbygoogle,
        .ytd-action-companion-ad-renderer, .video-ads, .ytp-ad-module, .ytp-ad-overlay-container,
        ytd-promoted-sparkles-web-renderer, ytd-display-ad-renderer, ytd-companion-ad-renderer,
        #masthead-ad, #player-ads, .ad-slot, .ad-box, .banner-ad, [data-ad-client],
        div[data-ad-unit], .top-ad, .bottom-ad, .sidebar-ad, .sponsor-badge,
        .taboola, .outbrain, .criteo-ad {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          width: 0 !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `;
      const style = document.createElement("style");
      style.id = "zpass-shield-cosmetics";
      style.textContent = css;
      (document.head || document.documentElement).appendChild(style);
    } catch (e) {}

    // YouTube Ad Skipper
    function cleanYouTubeAds() {
      try {
        const skipButtons = document.querySelectorAll(
          ".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-overlay-close-button"
        );
        skipButtons.forEach(btn => btn.click());

        if (location.host.includes("youtube.com")) {
          const video = document.querySelector("video");
          const adContainer = document.querySelector(".ad-showing, .ad-interrupting, .ytp-ad-text");
          if (video && adContainer) {
            video.muted = true;
            video.playbackRate = 16.0;
            if (video.duration && !isNaN(video.duration)) {
              video.currentTime = video.duration;
            }
          }
        }
      } catch (e) {}
    }

    cleanYouTubeAds();
    const observer = new MutationObserver(cleanYouTubeAds);
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  // ==========================================
  // ELEMENT PICKER / BLOCK AN ELEMENT FEATURE
  // ==========================================
  let isPickerActive = false;
  let hoveredElement = null;
  let highlightOverlay = null;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startElementPicker") {
      activateElementPicker();
      sendResponse({ success: true });
      return true;
    }
  });

  function activateElementPicker() {
    if (isPickerActive) return;
    isPickerActive = true;

    // Create highlight frame
    highlightOverlay = document.createElement("div");
    highlightOverlay.id = "zpass-picker-highlight";
    highlightOverlay.style.cssText = `
      position: absolute;
      pointer-events: none;
      border: 2px dashed #EF4444;
      background: rgba(239, 68, 68, 0.15);
      z-index: 2147483640;
      transition: all 0.05s ease-out;
      box-sizing: border-box;
      display: none;
    `;
    document.documentElement.appendChild(highlightOverlay);

    document.addEventListener("mousemove", onPickerMouseMove, true);
    document.addEventListener("click", onPickerClick, true);
    document.addEventListener("keydown", onPickerKeyDown, true);
  }

  function onPickerMouseMove(e) {
    if (!isPickerActive) return;
    const target = e.target;
    if (!target || target === highlightOverlay || target.closest("#zpass-block-modal")) return;

    hoveredElement = target;
    const rect = target.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    highlightOverlay.style.display = "block";
    highlightOverlay.style.top = (rect.top + scrollY) + "px";
    highlightOverlay.style.left = (rect.left + scrollX) + "px";
    highlightOverlay.style.width = rect.width + "px";
    highlightOverlay.style.height = rect.height + "px";
  }

  function onPickerClick(e) {
    if (!isPickerActive) return;
    const target = e.target;
    if (target.closest("#zpass-block-modal")) return;

    e.preventDefault();
    e.stopPropagation();

    deactivatePickerListeners();
    showBlockDialog(target);
  }

  function onPickerKeyDown(e) {
    if (e.key === "Escape") {
      stopElementPicker();
    }
  }

  function deactivatePickerListeners() {
    document.removeEventListener("mousemove", onPickerMouseMove, true);
    document.removeEventListener("click", onPickerClick, true);
    document.removeEventListener("keydown", onPickerKeyDown, true);
    if (highlightOverlay) highlightOverlay.style.display = "none";
  }

  function stopElementPicker() {
    deactivatePickerListeners();
    isPickerActive = false;
    if (highlightOverlay) highlightOverlay.remove();
    highlightOverlay = null;
    const modal = document.getElementById("zpass-block-modal");
    if (modal) modal.remove();
  }

  function getUniqueSelector(el) {
    if (el.id) return `#${el.id}`;
    let path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE && el !== document.body && el !== document.documentElement) {
      let selector = el.nodeName.toLowerCase();
      if (el.className && typeof el.className === "string") {
        const classes = el.className.trim().split(/\s+/).filter(c => !c.startsWith("zpass-")).slice(0, 2);
        if (classes.length) selector += "." + classes.join(".");
      }
      path.unshift(selector);
      el = el.parentNode;
      if (path.length >= 3) break;
    }
    return path.join(" > ");
  }

  // Show "Block an element" Modal (matching Screenshot 5/6/7)
  function showBlockDialog(targetEl) {
    const existing = document.getElementById("zpass-block-modal");
    if (existing) existing.remove();

    const selector = getUniqueSelector(targetEl);
    const domain = window.location.hostname;
    const ruleString = `${domain}##${selector}`;

    const modal = document.createElement("div");
    modal.id = "zpass-block-modal";
    modal.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    modal.innerHTML = `
      <div style="background: #25282A; color: #FFFFFF; width: 440px; border-radius: 12px; padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.08); position: relative;">
        <button id="zpass-modal-close" style="position: absolute; top: 16px; right: 16px; background: none; border: none; color: #9E9E9E; font-size: 20px; cursor: pointer;">&times;</button>
        <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 700;">Block an element</h2>
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #B0B3B8; line-height: 1.4;">
          Click an element you want to block. ZPass will create a user rule for it.
        </p>
        <div style="background: #18191A; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px 14px; font-family: monospace; font-size: 12px; color: #34D399; margin-bottom: 20px; word-break: break-all;">
          ${ruleString}
        </div>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="zpass-modal-cancel" style="padding: 10px 20px; background: #3A3B3C; border: none; border-radius: 8px; color: #FFFFFF; font-size: 14px; font-weight: 600; cursor: pointer;">Cancel</button>
          <button id="zpass-modal-block" style="padding: 10px 24px; background: #10B981; border: none; border-radius: 8px; color: #FFFFFF; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(16,185,129,0.4);">Block</button>
        </div>
      </div>
    `;

    document.documentElement.appendChild(modal);

    document.getElementById("zpass-modal-close").onclick = stopElementPicker;
    document.getElementById("zpass-modal-cancel").onclick = stopElementPicker;
    document.getElementById("zpass-modal-block").onclick = function () {
      chrome.runtime.sendMessage({ action: "addUserRule", rule: ruleString }, function () {
        targetEl.style.display = "none";
        stopElementPicker();
      });
    };
  }
})();
