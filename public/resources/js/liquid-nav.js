(() => {
  'use strict';
  const nav = document.querySelector('.topbar .marketing-nav');
  if (!nav) return;
  const indicator = document.createElement('span');
  indicator.className = 'nav-indicator';
  nav.prepend(indicator);
  const links = [...nav.querySelectorAll('a')];
  const sectionLinks = links.filter((link) => link.hash && document.querySelector(link.hash));

  function paint(target) {
    links.forEach((link) => link.classList.toggle('is-active', link === target));
    if (!target) { indicator.style.opacity = '0'; return; }
    const rect = target.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    const indicatorOrigin = nav.clientLeft;
    indicator.style.width = `${rect.width}px`;
    indicator.style.transform = `translateX(${rect.left - navRect.left - indicatorOrigin}px)`;
    indicator.style.opacity = '1';
  }

  sectionLinks.forEach((link) => {
    link.addEventListener('click', () => paint(link));
  });

  const initialLink = sectionLinks.find((link) => link.hash === window.location.hash);
  if (initialLink) paint(initialLink);

  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const visibleSections = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      const activeSection = visibleSections[0];
      if (activeSection) {
        paint(sectionLinks.find((link) => link.hash === `#${activeSection.target.id}`) || null);
      }
    }, { threshold: [0.15, 0.35, 0.6], rootMargin: '-15% 0px -55% 0px' });
    sectionLinks.forEach((link) => sectionObserver.observe(document.querySelector(link.hash)));
  }

  window.addEventListener('hashchange', () => {
    paint(sectionLinks.find((link) => link.hash === window.location.hash) || null);
  });
  window.addEventListener('resize', () => {
    paint(links.find((link) => link.classList.contains('is-active')) || null);
  });
})();
