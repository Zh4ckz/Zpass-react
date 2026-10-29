(() => {
  "use strict";

  const versionLabels = document.querySelectorAll("[data-release-version]");
  const downloadLinks = document.querySelectorAll("[data-release-download]");
  const noteLabels = document.querySelectorAll("[data-release-note]");
  const integrityPanels = document.querySelectorAll("[data-release-integrity]");
  if (!versionLabels.length && !downloadLinks.length && !noteLabels.length) return;

  fetch("../api/app-releases.json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`Release metadata request failed: HTTP ${response.status}`);
      return response.json();
    })
    .then((metadata) => {
      for (const label of versionLabels) {
        const release = metadata.platforms?.[label.dataset.releaseVersion];
        if (!release) throw new Error(`Missing release metadata for ${label.dataset.releaseVersion}`);
        label.textContent = release.published && release.version
          ? `${release.version}${release.releasedAt ? ` · Released ${release.releasedAt}` : ""}`
          : "No official release published";
      }

      for (const label of noteLabels) {
        const release = metadata.platforms?.[label.dataset.releaseNote];
        if (!release) throw new Error(`Missing release metadata for ${label.dataset.releaseNote}`);
        label.textContent = release.published
          ? `Signed Android release ${release.version} (build ${release.versionCode}). ${release.downloadAvailable ? "Download is available." : (release.availabilityNote || "Download is temporarily unavailable.")}`
          : "There is no official signed package available for download yet.";
      }

      for (const link of downloadLinks) {
        const release = metadata.platforms?.[link.dataset.releaseDownload];
        if (!release) throw new Error(`Missing release metadata for ${link.dataset.releaseDownload}`);
        if (!release.published || !release.downloadAvailable || !release.downloadUrl) {
          link.removeAttribute("href");
          link.setAttribute("aria-disabled", "true");
          link.hidden = true;
          continue;
        }
        const target = new URL(release.downloadUrl, window.location.origin);
        if (target.origin !== window.location.origin) throw new Error("Release URL must use this site origin");
        link.href = release.downloadUrl;
        link.hidden = false;
        link.removeAttribute("aria-disabled");
        link.textContent = link.dataset.downloadLabel || "Download latest release";
      }

      for (const panel of integrityPanels) {
        const release = metadata.platforms?.[panel.dataset.releaseIntegrity];
        if (!release) throw new Error(`Missing release metadata for ${panel.dataset.releaseIntegrity}`);
        if (!release.published || !release.sha256 || !release.signingCertificateSha256) {
          panel.hidden = true;
          continue;
        }
        panel.querySelector("[data-release-sha256]").textContent = release.sha256;
        panel.querySelector("[data-release-cert]").textContent = release.signingCertificateSha256;
        panel.querySelector("[data-release-publisher]").textContent = release.signingCertificate;
        panel.hidden = false;
      }
    })
    .catch((error) => {
      console.error("Unable to load PassGram release information.", error);
      for (const label of versionLabels) label.textContent = "Version information unavailable";
      for (const label of noteLabels) label.textContent = "Release information could not be verified. The download is disabled.";
      for (const link of downloadLinks) {
        link.removeAttribute("href");
        link.setAttribute("aria-disabled", "true");
        link.hidden = true;
      }
      for (const panel of integrityPanels) panel.hidden = true;
    });
})();

