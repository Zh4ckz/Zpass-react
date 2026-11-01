import "./web-ads.mjs";
let request=0;
async function translate(){
  const version=++request;
  const response=await fetch(`/resources/assets/lang/marketing/${window.ZPassI18n.getLanguage()}.json`);
  if(!response.ok)return;
  const catalog=await response.json();if(version!==request)return;
  document.querySelectorAll('[data-m]').forEach(element=>element.textContent=catalog[element.dataset.m] || element.textContent);
}
window.addEventListener('zpass:languagechange',translate);
await window.ZPassI18n.ready;await translate();
