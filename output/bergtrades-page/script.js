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

  const setupProofWall = () => {
    const wall = document.querySelector("[data-proof-wall]");
    if (!wall) return;

    const captureMode = root.hasAttribute("data-proof-freeze");
    const items = Array.from(wall.querySelectorAll(".pw-item")).map((element, index) => ({
      element,
      isPerson: element.classList.contains("pw-person"),
      lag: 0.72 + ((index * 0.37) % 1) * 0.5,
      restX: 0,
      restY: 0
    }));

    if (!items.length) return;

    let spread = 1;
    let inView = false;
    let wallFrame = 0;

    // offsetLeft/offsetTop are untransformed, so the rest geometry stays
    // correct no matter what the current frame has applied.
    const measure = () => {
      const midX = wall.clientWidth / 2;
      const midY = wall.clientHeight / 2;

      items.forEach((item) => {
        item.restX = item.element.offsetLeft + item.element.offsetWidth / 2 - midX;
        item.restY = item.element.offsetTop + item.element.offsetHeight / 2 - midY;
      });
    };

    const readSpread = () => {
      if (motionPreference.matches || captureMode) {
        spread = 1;
        return;
      }

      const bounds = wall.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
      const travelled = (viewportHeight - bounds.top) / (viewportHeight * 0.78);
      const clamped = Math.min(1, Math.max(0, travelled));

      spread = 0.999 - Math.pow(1 - clamped, 3);
    };

    const paint = () => {
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
      const viewportMiddle = viewportHeight / 2;
      const revealReach = viewportHeight * 0.62;
      const gather = spread - 1;

      items.forEach((item) => {
        const pull = gather * 0.34 * item.lag;

        item.element.style.setProperty("--tx", `${(item.restX * pull).toFixed(2)}px`);
        item.element.style.setProperty("--ty", `${(item.restY * pull).toFixed(2)}px`);
        item.element.style.setProperty("--sc", (0.9 + 0.1 * spread).toFixed(4));

        const box = item.element.getBoundingClientRect();
        const offCentre = Math.abs(box.top + box.height / 2 - viewportMiddle);
        const reveal = Math.max(0, 1 - offCentre / revealReach);

        item.element.style.setProperty("--reveal", (reveal * reveal * (3 - 2 * reveal)).toFixed(3));
      });
    };

    const frame = () => {
      wallFrame = 0;
      readSpread();
      paint();

      if (inView && !captureMode && !motionPreference.matches) {
        wallFrame = window.requestAnimationFrame(frame);
      }
    };

    const start = () => {
      if (wallFrame || captureMode || motionPreference.matches) return;
      wallFrame = window.requestAnimationFrame(frame);
    };

    const stop = () => {
      if (wallFrame) window.cancelAnimationFrame(wallFrame);
      wallFrame = 0;
    };

    const settle = () => {
      measure();
      readSpread();
      paint();
    };

    // driven off scroll as well as off the frame loop, so it stays correct
    // when the loop is paused, throttled or the section is offscreen.
    window.addEventListener("scroll", () => {
      if (captureMode) return;
      readSpread();
      paint();
    }, { passive: true });

    const images = Array.from(wall.querySelectorAll("img"));
    const imagesReady = images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      });
    });

    settle();
    Promise.all(imagesReady).then(settle);
    window.addEventListener("resize", settle, { passive: true });

    if ("ResizeObserver" in window) {
      new ResizeObserver(settle).observe(wall);
    }

    if (!captureMode && "IntersectionObserver" in window) {
      const watcher = new IntersectionObserver((entries) => {
        inView = entries.some((entry) => entry.isIntersecting);
        if (inView) {
          start();
        } else {
          stop();
        }
      }, { rootMargin: "300px 0px 300px 0px", threshold: 0 });

      watcher.observe(wall);
    } else if (!captureMode) {
      inView = true;
      start();
    }

    const handleMotionPreference = () => {
      if (motionPreference.matches) {
        stop();
        measure();
        spread = 1;
        paint();
      } else if (inView) {
        start();
      }
    };

    if (motionPreference.addEventListener) {
      motionPreference.addEventListener("change", handleMotionPreference);
    } else {
      motionPreference.addListener(handleMotionPreference);
    }

    handleMotionPreference();
    wall.dataset.proofReady = "true";
  };

  setupProofWall();



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
