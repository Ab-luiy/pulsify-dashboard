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

  const setupProofField = () => {
    const field = document.querySelector("[data-proof-field]");
    const stage = field?.querySelector("[data-proof-stage]");
    if (!field || !stage) return;

    const rings = stage.querySelector("[data-pf-rings]");
    const captureMode = root.hasAttribute("data-proof-freeze");
    const nodes = Array.from(stage.querySelectorAll(".pf-node")).map((element, index) => ({
      element,
      depth: Number.parseFloat(element.dataset.depth || "1"),
      phase: index * 1.31,
      swayX: 4 + (index % 3) * 3.2,
      swayY: 3.4 + (index % 4) * 2.1,
      period: 8200 + index * 1450,
      restX: 0,
      restY: 0
    }));

    if (!nodes.length) return;

    // rest offsets are read untransformed: with left/top set and a -50%
    // translate, offsetLeft/offsetTop already sit on the node's centre.
    const measure = () => {
      const midX = stage.clientWidth / 2;
      const midY = stage.clientHeight / 2;

      nodes.forEach((node) => {
        node.restX = node.element.offsetLeft - midX;
        node.restY = node.element.offsetTop - midY;
      });
    };

    let spread = 1;
    let pointerX = 0;
    let pointerY = 0;
    let targetPointerX = 0;
    let targetPointerY = 0;
    let inView = false;
    let fieldFrame = 0;

    const readSpread = () => {
      if (motionPreference.matches || captureMode) {
        spread = 1;
        return;
      }

      const bounds = field.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
      const travelled = (viewportHeight - bounds.top) / (viewportHeight * 0.72);
      const clamped = Math.min(1, Math.max(0, travelled));
      const eased = 1 - Math.pow(1 - clamped, 3);

      spread = 0.44 + 0.56 * eased;
    };

    const paint = (now) => {
      const settled = (spread - 0.44) / 0.56;

      pointerX += (targetPointerX - pointerX) * 0.08;
      pointerY += (targetPointerY - pointerY) * 0.08;

      nodes.forEach((node) => {
        const pull = spread - 1;
        const sway = motionPreference.matches || captureMode ? 0 : 1;
        const swayX = Math.sin(now / node.period + node.phase) * node.swayX * node.depth * sway;
        const swayY = Math.cos(now / (node.period * 1.27) + node.phase) * node.swayY * node.depth * sway;
        const driftX = pointerX * 15 * node.depth;
        const driftY = pointerY * 9 * node.depth;

        node.element.style.setProperty("--tx", `${(node.restX * pull + swayX + driftX).toFixed(2)}px`);
        node.element.style.setProperty("--ty", `${(node.restY * pull + swayY + driftY).toFixed(2)}px`);
        node.element.style.setProperty("--sc", (0.8 + 0.2 * spread).toFixed(4));
      });

      if (rings) {
        rings.style.setProperty("--ring-scale", (0.66 + 0.34 * spread).toFixed(4));
      }

      field.style.setProperty("--glow", settled.toFixed(3));
    };

    const tick = (now) => {
      fieldFrame = 0;
      readSpread();
      paint(now);

      if (inView && !captureMode) {
        fieldFrame = window.requestAnimationFrame(tick);
      }
    };

    const start = () => {
      if (fieldFrame || captureMode) return;
      fieldFrame = window.requestAnimationFrame(tick);
    };

    const stop = () => {
      if (fieldFrame) window.cancelAnimationFrame(fieldFrame);
      fieldFrame = 0;
    };

    const settle = () => {
      measure();
      readSpread();
      paint(0);
    };

    // spread is driven straight off scroll as well as off the ambient loop, so
    // it stays correct even when the loop is paused, throttled or offscreen.
    window.addEventListener("scroll", () => {
      if (captureMode) return;
      readSpread();
      paint(window.performance ? performance.now() : 0);
    }, { passive: true });

    field.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse" || motionPreference.matches) return;

      const bounds = field.getBoundingClientRect();
      targetPointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      targetPointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    }, { passive: true });

    field.addEventListener("pointerleave", () => {
      targetPointerX = 0;
      targetPointerY = 0;
    }, { passive: true });

    const images = Array.from(stage.querySelectorAll("img"));
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
      new ResizeObserver(settle).observe(stage);
    }

    if (captureMode) {
      spread = 1;
      paint(0);
      field.dataset.proofReady = "true";
      return;
    }

    if ("IntersectionObserver" in window) {
      const watcher = new IntersectionObserver((entries) => {
        inView = entries.some((entry) => entry.isIntersecting);
        if (inView) {
          start();
        } else {
          stop();
        }
      }, { rootMargin: "220px 0px 220px 0px", threshold: 0 });

      watcher.observe(field);
    } else {
      inView = true;
      start();
    }

    const handleMotionPreference = () => {
      if (motionPreference.matches) {
        stop();
        targetPointerX = 0;
        targetPointerY = 0;
        pointerX = 0;
        pointerY = 0;
        measure();
        spread = 1;
        paint(0);
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
    field.dataset.proofReady = "true";
  };

  setupProofField();


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
