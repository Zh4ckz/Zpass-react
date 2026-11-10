document.addEventListener("DOMContentLoaded", async () => {
  const navItems = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll(".settings-section");

  const allowlistContainer = document.getElementById("allowlistContainer");
  const newWhitelistInput = document.getElementById("newWhitelistInput");
  const btnAddWhitelist = document.getElementById("btnAddWhitelist");

  const userRulesTextarea = document.getElementById("userRulesTextarea");
  const btnSaveRules = document.getElementById("btnSaveRules");

  const btnExport = document.getElementById("btnExport");
  const btnImport = document.getElementById("btnImport");
  const btnReportBug = document.getElementById("btnReportBug");

  // 1. Sidebar Navigation
  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      navItems.forEach((n) => n.classList.remove("active"));
      sections.forEach((s) => s.classList.remove("active"));

      item.classList.add("active");
      const targetId = item.dataset.target;
      const targetSec = document.getElementById(targetId);
      if (targetSec) targetSec.classList.add("active");
    });
  });

  // 2. Load Stored Data
  const data = await chrome.storage.local.get(["whitelistedDomains", "userRules"]);
  const whitelisted = data.whitelistedDomains || [];
  const rules = data.userRules || [];

  renderAllowlist(whitelisted);
  userRulesTextarea.value = rules.join("\n");

  // 3. Allowlist Management
  btnAddWhitelist.addEventListener("click", async () => {
    let domain = newWhitelistInput.value.trim().toLowerCase();
    domain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!domain) return;

    const current = (await chrome.storage.local.get("whitelistedDomains")).whitelistedDomains || [];
    if (!current.includes(domain)) {
      current.push(domain);
      await chrome.storage.local.set({ whitelistedDomains: current });
      renderAllowlist(current);
      newWhitelistInput.value = "";
    }
  });

  function renderAllowlist(domains) {
    if (!domains.length) {
      allowlistContainer.innerHTML = '<div style="color: #6B7280; padding: 12px 0;">Henüz izin verilen site eklenmedi.</div>';
      return;
    }

    allowlistContainer.innerHTML = domains
      .map(
        (domain) => `
        <div class="list-row">
          <span>${domain}</span>
          <button class="delete-btn" data-domain="${domain}">Remove</button>
        </div>
      `
      )
      .join("");

    allowlistContainer.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const d = btn.dataset.domain;
        const current = (await chrome.storage.local.get("whitelistedDomains")).whitelistedDomains || [];
        const updated = current.filter((item) => item !== d);
        await chrome.storage.local.set({ whitelistedDomains: updated });
        renderAllowlist(updated);
      });
    });
  }

  // 4. Save User Rules
  btnSaveRules.addEventListener("click", async () => {
    const raw = userRulesTextarea.value;
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("!"));

    await chrome.storage.local.set({ userRules: lines });
    alert("Kullanıcı kuralları başarıyla kaydedildi!");
  });

  // 5. Actions (Export/Import/Report)
  btnExport.addEventListener("click", async (e) => {
    e.preventDefault();
    const all = await chrome.storage.local.get(null);
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "zpass_shield_backup.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  btnReportBug.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.sendMessage({
      action: "openReportIssue",
      currentUrl: "https://www.youtube.com/"
    });
  });
});
