(function () {
  var KEY = 'zpass-theme';
  var root = document.documentElement;
  function get() { try { return localStorage.getItem(KEY) || 'light'; } catch (e) { return 'light'; } }
  function apply(t) { root.setAttribute('data-theme', t); }
  apply(get());
  var SUN = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  function mount() {
    if (document.getElementById('zpThemeToggle')) return;
    var b = document.createElement('button');
    b.id = 'zpThemeToggle'; b.type = 'button';
    function paint() { var t = get(); b.innerHTML = t === 'light' ? MOON : SUN; b.setAttribute('aria-label', t === 'light' ? 'Dark mode' : 'Light mode'); b.title = b.getAttribute('aria-label'); }
    b.addEventListener('click', function () {
      var n = get() === 'light' ? 'dark' : 'light';
      try { localStorage.setItem(KEY, n); } catch (e) {}
      apply(n); paint();
    });
    paint();
    var host = document.querySelector('.nav-actions');
    if (host) host.insertBefore(b, host.firstChild); else { b.className = 'floating'; document.body.appendChild(b); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();

(function () {
  var last = 0, ticking = false;
  function bar() { return document.querySelector('.landing-nav'); }
  function tick() {
    ticking = false;
    var h = bar(); if (!h) return;
    var y = Math.max(0, window.pageYOffset), d = y - last;
    h.classList.toggle('is-scrolled', y > 24);
    var open = h.querySelector('.language-options:not([hidden])') || h.contains(document.activeElement) && /input|textarea/i.test(document.activeElement.tagName);
    h.classList.remove('nav-hide');
    if (Math.abs(d) > 6 || y < 90) last = y;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }, { passive: true });
})();