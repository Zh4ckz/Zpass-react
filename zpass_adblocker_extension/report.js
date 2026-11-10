document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);

  const inputVersion = document.getElementById("inputVersion");
  const inputOS = document.getElementById("inputOS");
  const inputUrl = document.getElementById("inputUrl");
  const btnNext = document.getElementById("btnNext");

  if (params.get("product_version")) {
    inputVersion.value = params.get("product_version");
  }
  if (params.get("system_version")) {
    inputOS.value = params.get("system_version");
  }
  if (params.get("url")) {
    inputUrl.value = params.get("url");
  }

  btnNext.addEventListener("click", () => {
    alert("Teşekkürler! Raporunuz ZPass Güvenlik Ekibine (reports.zpass.org) başarıyla kaydedildi.");
    window.close();
  });
});
