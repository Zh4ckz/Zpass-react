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

  var sideNav = document.querySelector('.main-nav');
  if (sideNav && toggle) {
    var foot = document.createElement('div');
    foot.className = 'nav-side-foot';
    foot.innerHTML = '<a class="button button-dark" href="https://zpas.org/apps">Download the apps</a><a class="button button-light" href="https://x.com/4rezan" target="_blank" rel="noopener" style="color:#000!important">Follow on X</a>';
    sideNav.appendChild(foot);
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'nav-close';
    closeBtn.setAttribute('aria-label', 'Close menu');
    closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    closeBtn.addEventListener('click', function () { if (toggle.getAttribute('aria-expanded') === 'true') toggle.click(); });
    sideNav.insertBefore(closeBtn, sideNav.firstChild);
    var head = document.createElement('div');
    head.className = 'nav-brand';
    head.innerHTML = '<span class="nb-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg></span><span class="nb-text"><b>PassGram</b><small>Protect in the Trust</small></span>';
    sideNav.insertBefore(head, closeBtn.nextSibling);
    var navIcons = {
      features: '<path d="M12 3l2.5 5.5L20 9.3l-4 4 1 5.7-5-2.8-5 2.8 1-5.7-4-4 5.5-.8z"/>',
      apps: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
      api: '<path d="M8 8l-4 4 4 4"/><path d="M16 8l4 4-4 4"/><path d="M13.5 5l-3 14"/>',
      faq: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 115 .5c0 1.5-2.5 2-2.5 3.5"/><path d="M12 17h.01"/>',
      security: '<path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
      privacy: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
      docs: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 13h7M9 17h7"/>'
    };
    sideNav.querySelectorAll(':scope > a').forEach(function (a) {
      var h = (a.getAttribute('href') || '').toLowerCase(), key = null;
      if (h.indexOf('#features') > -1) key = 'features';
      else if (h.indexOf('apps') > -1) key = 'apps';
      else if (h.indexOf('api') > -1) key = 'api';
      else if (h.indexOf('faq') > -1) key = 'faq';
      else if (h.indexOf('security') > -1) key = 'security';
      else if (h.indexOf('privacy') > -1) key = 'privacy';
      else if (h.indexOf('docs') > -1) key = 'docs';
      if (!key) return;
      a.insertAdjacentHTML('afterbegin', '<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + navIcons[key] + '</svg>');
    });
    var back = document.createElement('div');
    back.className = 'nav-backdrop';
    back.addEventListener('click', function () { if (toggle.getAttribute('aria-expanded') === 'true') toggle.click(); });
    document.body.appendChild(back);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') toggle.click(); });
  }
  if (document.querySelector('.site-header') && !document.querySelector('.pg-home-main')) {
    var p = location.pathname;
    var icon = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
    var tabs = [
      ['https://zpas.org/', 'Home', icon('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'), p === '/' || p === '/'],
      ['https://zpas.org/apps', 'Apps', icon('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'), p === '/apps'],
      ['https://web.zpas.org/', 'Open', icon('<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>'), false, 'go'],
      ['https://api.zpas.org/', 'API', icon('<path d="M8 8l-4 4 4 4"/><path d="M16 8l4 4-4 4"/>'), p === '/api'],
      ['https://zpas.org/faq', 'FAQ', icon('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 115 .5c0 1.5-2.5 2-2.5 3.5"/><path d="M12 17h.01"/>'), p === '/faq']
    ];
    var nav = document.createElement('nav');
    nav.className = 'm-tabbar';
    nav.setAttribute('aria-label', 'Quick navigation');
    nav.innerHTML = tabs.map(function (t) {
      return '<a href="' + t[0] + '" class="' + (t[3] ? 'on ' : '') + (t[4] || '') + '">' + t[2] + '<span>' + t[1] + '</span></a>';
    }).join('');
    document.body.appendChild(nav);
  }

  // On phones the account lives in the app, so "Open" launches it instead of the web login.
  var ua = navigator.userAgent || '';
  if (/Android.+Mobile|iPhone|iPod/i.test(ua)) {
    var fallback = location.origin + '/apps/android';
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || !/^https:\/\/web\.zpas\.org\/login/.test(a.href)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (/Android/i.test(ua)) {
        location.href = 'intent://web.zpas.org/login#Intent;scheme=https;package=com.zpass;S.browser_fallback_url=' + encodeURIComponent(fallback) + ';end';
      } else {
        location.href = 'https://zpas.org/apps';
      }
    }, true);
  }
})();
