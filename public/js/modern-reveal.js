(function () {
  var els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); }
  else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: .12 });
    els.forEach(function (e) { io.observe(e); });
  }

  var toggle = document.querySelector('.menu-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      setTimeout(function () { document.body.classList.toggle('nav-open', toggle.getAttribute('aria-expanded') === 'true'); }, 0);
    });
    document.querySelectorAll('.main-nav a').forEach(function (a) {
      a.addEventListener('click', function () { document.body.classList.remove('nav-open'); });
    });
  }

  if (document.querySelector('.site-header')) {
    var p = location.pathname;
    var icon = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
    var tabs = [
      ['/', 'Home', icon('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'), p === '/' || p === '/index.html'],
      ['/apps.html', 'Apps', icon('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'), p === '/apps.html'],
      ['https://web.zpas.org/login', 'Open', icon('<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>'), false, 'go'],
      ['/api.html', 'API', icon('<path d="M8 8l-4 4 4 4"/><path d="M16 8l4 4-4 4"/>'), p === '/api.html'],
      ['/faq.html', 'FAQ', icon('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 115 .5c0 1.5-2.5 2-2.5 3.5"/><path d="M12 17h.01"/>'), p === '/faq.html']
    ];
    var nav = document.createElement('nav');
    nav.className = 'm-tabbar';
    nav.setAttribute('aria-label', 'Quick navigation');
    nav.innerHTML = tabs.map(function (t) {
      return '<a href="' + t[0] + '" class="' + (t[3] ? 'on ' : '') + (t[4] || '') + '">' + t[2] + '<span>' + t[1] + '</span></a>';
    }).join('');
    document.body.appendChild(nav);
  }
})();
