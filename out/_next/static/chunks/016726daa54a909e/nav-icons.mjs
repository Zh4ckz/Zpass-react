// Animated sidebar icons (useAnimations, MIT — see ../assets/anim/LICENSE.txt), played with lottie-web light (MIT).
// Each icon plays once on hover, on click, and when its section becomes active. The original static SVG stays in the
// page until the animation has loaded, so a failed load never leaves a blank icon. Respects prefers-reduced-motion.
// Paths are literal so the build can rewrite them to the published URLs.
const PLAYER = '/_next/static/chunks/7efa0308c00215a6/lottie_light.min.js';
const ICONS = [
  ['.ap-nav button[data-view="home"]', '/_next/static/chunks/6880659e62156fd7/home.json'],
  ['.ap-nav button[data-view="vault"]', '/_next/static/chunks/6880659e62156fd7/lock.json'],
  ['.ap-nav button[data-view="chats"]', '/_next/static/chunks/6880659e62156fd7/message-circle.json'],
  ['.ap-nav button[data-view="auth"]', '/_next/static/chunks/6880659e62156fd7/key.json'],
  ['.ap-nav button[data-view="secure"]', '/_next/static/chunks/6880659e62156fd7/shield.json'],
  ['#pg-premium-open', '/_next/static/chunks/6880659e62156fd7/star.json'],
  ['.ap-nav button[data-view="settings"]', '/_next/static/chunks/6880659e62156fd7/settings.json'],
  ['.ap-nav .pg-billing-link', '/_next/static/chunks/6880659e62156fd7/credit-card.json'],
  ['.ap-side-foot .ap-row', '/_next/static/chunks/6880659e62156fd7/moon.json'],
  ['#ap-signout', '/_next/static/chunks/6880659e62156fd7/log-out.json'],
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

async function start() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  let lottie;
  try { lottie = await loadPlayer(); } catch { return; }
  for (const [selector, path] of ICONS) {
    const host = document.querySelector(selector);
    const still = host?.querySelector(':scope > svg');
    if (!host || !still) continue;
    const box = document.createElement('span');
    box.className = 'ap-anim';
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
