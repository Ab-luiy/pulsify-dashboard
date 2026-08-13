(() => {
  "use strict";

  const root = document.documentElement;
  const progress = document.querySelector(".progress-line span");
  const reveals = Array.from(document.querySelectorAll("[data-reveal]"));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let progressFrame = 0;

  const updateProgress = () => {
    progressFrame = 0;
    if (!progress) return;

    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const ratio = Math.min(1, Math.max(0, window.scrollY / scrollable));
    progress.style.width = `${ratio * 100}%`;
  };

  const requestProgressUpdate = () => {
    if (progressFrame) return;
    progressFrame = window.requestAnimationFrame(updateProgress);
  };

  updateProgress();
  window.addEventListener("scroll", requestProgressUpdate, { passive: true });
  window.addEventListener("resize", requestProgressUpdate, { passive: true });

  const stageGroups = {
    image: ".hero-frame, .economics-card, .media-card, .baseline-block, .proof-image, .title-reference, .rule-orb, .bar-chart, .terminal, .ig-phone, .account-card, .price-math article",
    annotation: ".hero-frame figcaption, .metric-pill, .image-callout, .proof-annotation, .title-reference figcaption, .missing-slot strong, .profile-change, .flow-mark, .changed-line, .math-mark",
    copy: ".hero-copy, .economics h2, .economics-argument, .finding-copy, .section-intro, .media-copy, .proof-intro-grid > div:first-child, .proof-copy, .title-intro-grid > div, .title-intro-grid > p, .title-copy, .thumb-rule-grid > div:not(.rule-orb), .terminal-note, .profile-note, .account-close"
  };

  Object.entries(stageGroups).forEach(([stage, selector]) => {
    document.querySelectorAll(selector).forEach((element) => {
      if (element.closest("[data-reveal]")) element.dataset.stage = stage;
    });
  });

  if (reducedMotion) {
    root.dataset.motion = "reduced";
    return;
  }

  if (!("IntersectionObserver" in window)) {
    root.dataset.motion = "unsupported";
    return;
  }

  const markInitialSlides = () => {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    reveals.forEach((section) => {
      const bounds = section.getBoundingClientRect();
      const isVisible = bounds.bottom > viewportHeight * 0.12 && bounds.top < viewportHeight * 0.88;
      section.classList.toggle("is-active", isVisible);
    });
  };

  markInitialSlides();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const active = entry.isIntersecting && entry.intersectionRatio >= 0.12;
      entry.target.classList.toggle("is-active", active);
    });
  }, {
    root: null,
    rootMargin: "-10% 0px -10% 0px",
    threshold: [0, 0.06, 0.12, 0.24, 0.5, 0.75]
  });

  reveals.forEach((section) => observer.observe(section));

  window.requestAnimationFrame(() => {
    root.classList.add("motion-ready");
    root.dataset.motion = "ready";
  });
})();
