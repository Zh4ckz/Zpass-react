// Animated sidebar icons (useAnimations, MIT — see ../assets/anim/LICENSE.txt), played with lottie-web light (MIT).
// Each icon plays once on hover, on click, and when its section becomes active. The original static SVG stays in the
// page until the animation has loaded, so a failed load never leaves a blank icon. Respects prefers-reduced-motion.
// Paths are literal so the build can rewrite them to the published URLs.
const PLAYER = '/subdomain/web/resources/js/vendor/lottie_light.min.js';
const ICONS = [
  ['.ap-nav button[data-view="home"]', '/subdomain/web/resources/assets/anim/home.json'],
  ['.ap-nav button[data-view="vault"]', '/subdomain/web/resources/assets/anim/lock.json'],
  ['.ap-nav button[data-view="chats"]', '/subdomain/web/resources/assets/anim/message-circle.json'],
  ['.ap-nav button[data-view="auth"]', '/subdomain/web/resources/assets/anim/key.json'],
  ['.ap-nav button[data-view="secure"]', '/subdomain/web/resources/assets/anim/shield.json'],
  ['#pg-premium-open', '/subdomain/web/resources/assets/anim/star.json'],
  ['.ap-nav button[data-view="settings"]', '/subdomain/web/resources/assets/anim/settings.json'],
  ['.ap-nav .pg-billing-link', '/subdomain/web/resources/assets/anim/credit-card.json'],
  ['.ap-side-foot .ap-row', '/subdomain/web/resources/assets/anim/moon.json'],
  ['#ap-signout', '/subdomain/web/resources/assets/anim/log-out.json'],
];

function loadPlayer() {
  if (window.lottie) return Promise.resolve(window.lottie);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = PLAYER;
    s.async = true;
    s.onload = () => (window.lottie ? resolve(window.lottie) : reject(Error('lottie unavailable')));
    s.onerror = () => reject(Error('lottie unavailable'));
    document.head.appendChild(s);
  });
}

// The module ships its own size/colour rules so a stale cached stylesheet can never show huge black icons.
function injectStyle() {
  if (document.getElementById('ap-anim-style')) return;
  const style = document.createElement('style');
  style.id = 'ap-anim-style';
  style.textContent = `
.ap-anim{display:none;width:20px;height:20px;flex:0 0 20px;align-items:center;justify-content:center;line-height:0}
.ap-anim.ready{display:inline-flex}
.ap-anim svg{width:20px!important;height:20px!important}
.ap-anim svg path{stroke:currentColor}
.ap-anim svg path[fill]:not([fill="none"]){fill:currentColor}
#pg-premium-open .ap-anim{color:#f5a524}`;
  document.head.appendChild(style);
}

async function start() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  injectStyle();
  let lottie;
  try { lottie = await loadPlayer(); } catch { return; }
  for (const [selector, path] of ICONS) {
    const host = document.querySelector(selector);
    const still = host?.querySelector(':scope > svg');
    if (!host || !still) continue;
    const box = document.createElement('span');
    box.className = 'ap-anim';
    box.style.cssText = 'width:20px;height:20px;flex:0 0 20px';
    box.setAttribute('aria-hidden', 'true');
    still.insertAdjacentElement('beforebegin', box);
    const anim = lottie.loadAnimation({ container: box, renderer: 'svg', loop: false, autoplay: false, path, rendererSettings: { preserveAspectRatio: 'xMidYMid meet' } });
    anim.addEventListener('DOMLoaded', () => { still.style.display = 'none'; box.classList.add('ready'); anim.goToAndStop(0, true); });
    anim.addEventListener('data_failed', () => box.remove());
    const play = () => { if (box.classList.contains('ready')) anim.goToAndPlay(0, true); };
    host.addEventListener('mouseenter', play);
    host.addEventListener('focus', play);
    host.addEventListener('click', play);
    // play when the section becomes active through keyboard shortcuts or code (class "on" added)
    new MutationObserver(() => { if (host.classList.contains('on')) play(); }).observe(host, { attributes: true, attributeFilter: ['class'] });
  }
}

start();
