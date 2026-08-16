(() => {
  "use strict";

  const root = document.documentElement;
  const progress = document.querySelector(".progress-line span");
  const reveals = Array.from(document.querySelectorAll("[data-reveal]"));
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reducedMotion = motionPreference.matches;
  const primaryCta = document.getElementById("cta-primary");
  let progressFrame = 0;

  if (primaryCta) {
    primaryCta.addEventListener("click", () => {
      try {
        navigator.sendBeacon('/api/click', JSON.stringify({cta:'implement', t:Date.now(), path:location.pathname}));
      } catch {}
    });
  }

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

  const setupProofRail = () => {
    const rail = document.querySelector("[data-proof-rail]");
    const firstSequence = rail?.querySelector("[data-proof-sequence]");
    if (!rail || !firstSequence) return;

    const driftSpeed = 18;
    let animationFrame = 0;
    let cycleWidth = 0;
    let dragging = false;
    let hovering = false;
    let touching = false;
    let dragStartX = 0;
    let dragStartScroll = 0;
    let lastFrame = 0;
    let pauseUntil = 0;

    const measure = () => {
      cycleWidth = firstSequence.getBoundingClientRect().width;
    };

    const normaliseScroll = () => {
      if (!cycleWidth) return;
      while (rail.scrollLeft >= cycleWidth) rail.scrollLeft -= cycleWidth;
    };

    const pauseBriefly = (duration = 1200) => {
      pauseUntil = performance.now() + duration;
    };

    const tick = (now) => {
      animationFrame = 0;
      const elapsed = lastFrame ? Math.min(48, now - lastFrame) : 0;
      lastFrame = now;

      const paused = hovering || touching || dragging || document.hidden || now < pauseUntil;
      if (!motionPreference.matches && !paused && cycleWidth) {
        rail.scrollLeft += driftSpeed * (elapsed / 1000);
        normaliseScroll();
      }

      if (!motionPreference.matches) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    const startDrift = () => {
      if (animationFrame || motionPreference.matches) return;
      lastFrame = 0;
      rail.dataset.autoDrift = "on";
      animationFrame = window.requestAnimationFrame(tick);
    };

    const stopDrift = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      lastFrame = 0;
      rail.dataset.autoDrift = "off";
    };

    const finishDrag = (event) => {
      if (!dragging) return;
      dragging = false;
      rail.classList.remove("is-dragging");
      pauseBriefly();
      normaliseScroll();

      if (event?.pointerId != null && rail.hasPointerCapture?.(event.pointerId)) {
        rail.releasePointerCapture(event.pointerId);
      }
    };

    rail.addEventListener("mouseenter", () => {
      hovering = true;
    });

    rail.addEventListener("mouseleave", () => {
      hovering = false;
      pauseBriefly(700);
    });

    rail.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch" || (event.pointerType === "mouse" && event.button !== 0)) return;
      dragging = true;
      dragStartX = event.clientX;
      dragStartScroll = rail.scrollLeft;
      rail.classList.add("is-dragging");
      rail.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });

    rail.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      rail.scrollLeft = dragStartScroll - (event.clientX - dragStartX);
      event.preventDefault();
    });

    rail.addEventListener("pointerup", finishDrag);
    rail.addEventListener("pointercancel", finishDrag);
    rail.addEventListener("lostpointercapture", finishDrag);

    rail.addEventListener("touchstart", () => {
      touching = true;
    }, { passive: true });

    const finishTouch = () => {
      touching = false;
      pauseBriefly(1800);
      normaliseScroll();
    };

    rail.addEventListener("touchend", finishTouch, { passive: true });
    rail.addEventListener("touchcancel", finishTouch, { passive: true });
    rail.addEventListener("wheel", () => pauseBriefly(), { passive: true });

    const handleMotionPreference = () => {
      if (motionPreference.matches) {
        stopDrift();
      } else {
        startDrift();
      }
    };

    firstSequence.querySelectorAll("img").forEach((image) => {
      if (!image.complete) image.addEventListener("load", measure, { once: true });
    });

    measure();
    window.addEventListener("resize", measure, { passive: true });
    if ("ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(firstSequence);
    }

    if (motionPreference.addEventListener) {
      motionPreference.addEventListener("change", handleMotionPreference);
    } else {
      motionPreference.addListener(handleMotionPreference);
    }

    handleMotionPreference();
  };

  setupProofRail();

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
