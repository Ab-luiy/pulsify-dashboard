(() => {
  const root = document.documentElement;
  const meter = document.querySelector('.scroll-meter span');
  const railLinks = Array.from(document.querySelectorAll('[data-rail]'));
  const sections = Array.from(document.querySelectorAll('[data-section]'));

  const updateMeter = () => {
    const max = root.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    meter.style.transform = `scaleX(${progress})`;
  };

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    railLinks.forEach((link) => {
      const active = link.dataset.rail === visible.target.dataset.section;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-20% 0px -58% 0px', threshold: [0.08, 0.2, 0.5] });

  sections.forEach((section) => observer.observe(section));
  window.addEventListener('scroll', updateMeter, { passive: true });
  window.addEventListener('resize', updateMeter);
  updateMeter();
})();
