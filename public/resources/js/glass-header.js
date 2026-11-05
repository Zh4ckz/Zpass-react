(() => {
  const previous = document.querySelector('.site-header, body:not(.embedded) > header.top');
  if (!previous || document.querySelector('.pg-glass-header')) return;
  const header = document.createElement('header');
  header.className = 'pg-glass-header';
  const primary = [
    ['https://zpas.org/', 'Home'], ['https://zpas.org/apps', 'Apps'], ['https://api.zpas.org/', 'API'],
    ['https://zpas.org/faq', 'FAQ'], ['https://zpas.org/legal/security', 'Safety']
  ];
  const secondary = [
    ['https://zpas.org/about/pricing', 'Pricing'], ['https://developers.zpas.org/', 'Developers'],
    ['https://docs.zpas.org/', 'Docs'], ['https://core.zpas.org/', 'Core'], ['https://bots.zpas.org/', 'Bots'], ['https://zpas.org/legal/terms', 'Terms'],
    ['https://zpas.org/legal/privacy', 'Privacy'], ['https://zpas.org/support', 'Support']
  ];
  const link = ([href, label], mobile = false) => `<a href="${href}"${mobile ? ' class="pg-glass-mobile"' : ''}>${label}</a>`;
  header.innerHTML = `<a class="pg-glass-brand" href="https://zpas.org/" aria-label="PassGram home"><img src="/resources/assets/app-logo/zpass.png" alt="" width="31" height="31"><span>PassGram</span></a><nav class="pg-glass-links" aria-label="Main navigation">${primary.map(item => link(item)).join('')}<details class="pg-glass-menu"><summary>Menu</summary><div class="pg-glass-panel">${primary.map(item => link(item, true)).join('')}${secondary.map(item => link(item)).join('')}</div></details></nav><div class="pg-glass-actions"><a class="pg-glass-x" href="https://x.com/4rezan" target="_blank" rel="noopener noreferrer" aria-label="PassGram on X (opens in a new tab)"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a><a class="pg-glass-cta" href="https://zpas.org/apps">Get Started <span aria-hidden="true">↗</span></a></div>`;
  // Keep the current site open when following another origin.
  header.querySelectorAll('a').forEach(a => {
    if (a.origin !== location.origin) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
  });
  const normalized = path => path.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  header.querySelectorAll('a').forEach(a => {
    if (a.origin === location.origin && normalized(a.pathname) === normalized(location.pathname)) a.setAttribute('aria-current', 'page');
  });
  previous.replaceWith(header);
  const menu = header.querySelector('details');
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const update = () => header.classList.toggle('is-scrolled', scrollY > 24);
  update();
  window.addEventListener('scroll', update, { passive: true, ...options });
  document.addEventListener('click', event => { if (!header.contains(event.target)) menu.open = false; }, options);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
  }, options);
  window.addEventListener('pagehide', () => controller.abort(), { once: true });
})();
