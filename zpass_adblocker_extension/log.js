document.addEventListener("DOMContentLoaded", () => {
  const logTbody = document.getElementById("logTbody");
  const emptyLog = document.getElementById("emptyLog");
  const searchInput = document.getElementById("searchInput");
  const btnRefresh = document.getElementById("btnRefresh");
  const btnClearLog = document.getElementById("btnClearLog");
  const btnToggleRecording = document.getElementById("btnToggleRecording");
  const domainSelect = document.getElementById("domainSelect");

  let allLogs = [];
  let isRecording = true;
  let activeParty = "all";
  let activeStatus = "all";
  let activeType = "all";
  let currentActiveTabId = null;

  // Query active tab ID
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) currentActiveTabId = tabs[0].id;
    fetchLogs();
  });

  // Auto-refresh interval when recording
  setInterval(() => {
    if (isRecording) {
      fetchLogs(false);
    }
  }, 1500);

  function fetchLogs(renderIfSame = true) {
    chrome.runtime.sendMessage({ action: "getLogs" }, (response) => {
      if (response && response.logs) {
        allLogs = response.logs;
        renderLogs();
      }
    });
  }

  function renderLogs() {
    const query = searchInput.value.toLowerCase().trim();
    const filterByTab = domainSelect.value === "CURRENT" && currentActiveTabId !== null;

    const filtered = allLogs.filter((item) => {
      if (filterByTab && item.tabId !== currentActiveTabId) return false;
      if (query && !item.url.toLowerCase().includes(query)) return false;

      // Party filter
      if (activeParty === "1p" && item.is3P) return false;
      if (activeParty === "3p" && !item.is3P) return false;

      // Status filter
      if (activeStatus === "allowed" && item.status === "BLOCKED") return false;
      if (activeStatus === "blocked" && item.status !== "BLOCKED") return false;

      // Type filter
      if (activeType !== "all" && !item.type.toLowerCase().includes(activeType)) return false;

      return true;
    });

    if (!filtered.length) {
      logTbody.innerHTML = "";
      emptyLog.style.display = "block";
      return;
    }

    emptyLog.style.display = "none";
    logTbody.innerHTML = filtered
      .map((entry) => {
        const isBlocked = entry.status === "BLOCKED";
        const statusClass = isBlocked ? "s-blocked" : "s-200";
        const ruleClass = isBlocked ? "rule-text" : "rule-text allowed";

        return `
          <tr class="${isBlocked ? "blocked-row" : ""}">
            <td>
              <div class="status-cell">
                <span>${entry.time}</span>
                <span class="badge-status ${statusClass}">${entry.status}</span>
                <span class="badge-method">${entry.method}</span>
                ${entry.is3P ? '<span class="badge-3p">3P</span>' : ""}
              </div>
            </td>
            <td>
              <span class="url-text" title="${entry.url}">${escapeHtml(entry.url)}</span>
            </td>
            <td><strong>${entry.type}</strong></td>
            <td>
              <span class="${ruleClass}">* ${escapeHtml(entry.rule)}</span>
            </td>
            <td>
              <span class="filter-name">${escapeHtml(entry.filter)}</span>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Setup Pill Filters
  setupPillGroup("partyFilters", (val) => {
    activeParty = val;
    renderLogs();
  });

  setupPillGroup("statusFilters", (val) => {
    activeStatus = val;
    renderLogs();
  });

  setupPillGroup("typeFilters", (val) => {
    activeType = val;
    renderLogs();
  });

  function setupPillGroup(groupId, onChange) {
    const container = document.getElementById(groupId);
    if (!container) return;
    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".pill");
      if (!btn) return;
      container.querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const val = btn.dataset.party || btn.dataset.status || btn.dataset.type || "all";
      onChange(val);
    });
  }

  // Controls
  searchInput.addEventListener("input", renderLogs);
  domainSelect.addEventListener("change", renderLogs);

  btnRefresh.addEventListener("click", () => {
    fetchLogs();
  });

  btnClearLog.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "clearLogs" }, () => {
      allLogs = [];
      renderLogs();
    });
  });

  btnToggleRecording.addEventListener("click", () => {
    isRecording = !isRecording;
    btnToggleRecording.classList.toggle("active", isRecording);
  });
});
