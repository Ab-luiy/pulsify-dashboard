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

  const proofItems = [
    { src: "assets/proof/proof-cash.webp", tier: "numbers", offset: -22, scale: 0.94 },
    { src: "assets/proof/proof-dashboard.webp", tier: "numbers", offset: 18, scale: 1.02 },
    { src: "assets/proof/proof-closed-list.webp", tier: "numbers", offset: -8, scale: 0.90 },
    { src: "assets/proof/proof-payment.webp", tier: "numbers", offset: 24, scale: 1.06 },
    { src: "assets/proof/proof-nick.webp", tier: "people", offset: 20, scale: 1.04 },
    { src: "assets/proof/proof-jacob.webp", tier: "people", offset: -24, scale: 0.92 },
    { src: "assets/proof/proof-nick-mamba.webp", tier: "people", offset: 8, scale: 1.06 },
    { src: "assets/proof/proof-table.webp", tier: "people", offset: -14, scale: 0.97 }
  ];

  const setupProofConstellation = () => {
    const band = document.querySelector("[data-proof-constellation]");
    const stage = band?.querySelector("[data-proof-stage]");
    if (!band || !stage) return;

    const captureMode = root.hasAttribute("data-proof-freeze");
    const gapPatterns = {
      numbers: [32, 64, 40, 86],
      people: [68, 34, 88, 48]
    };
    const tierSettings = {
      numbers: { speed: 0.0132, initialPhase: 0.02 },
      people: { speed: 0.022, initialPhase: 0.31 }
    };
    const tiers = {};
    let animationFrame = 0;
    let lastFrame = 0;
    let dragging = false;
    let pointerId = null;
    let activeTier = null;
    let activeItem = null;
    let lastPointerX = 0;
    let lastPointerTime = 0;
    let pointerVelocity = 0;

    const normalise = (value, width) => {
      if (!width) return 0;
      return ((value % width) + width) % width;
    };

    const renderItem = (item, itemIndex, tierName) => {
      const image = document.createElement("img");
      const scale = item.scale.toFixed(3);
      const offset = `${item.offset}px`;
      const mobileOffset = `${Math.round(item.offset * 0.67)}px`;
      const gap = gapPatterns[tierName][itemIndex % gapPatterns[tierName].length];

      image.className = "proof-item";
      image.src = item.src;
      image.alt = "";
      image.loading = "eager";
      image.decoding = captureMode ? "sync" : "async";
      image.draggable = false;
      image.style.setProperty("--proof-offset", offset);
      image.style.setProperty("--proof-mobile-offset", mobileOffset);
      image.style.setProperty("--proof-scale", scale);
      image.style.setProperty("--proof-hover-scale", (item.scale * 1.04).toFixed(3));
      image.style.setProperty("--proof-gap", `${gap}px`);
      image.style.setProperty("--proof-mobile-gap", `${Math.max(24, Math.round(gap * 0.62))}px`);

      return image;
    };

    const buildTier = (tierName) => {
      const tierItems = proofItems.filter((item) => item.tier === tierName);
      const tier = document.createElement("div");
      const track = document.createElement("div");
      let firstSequence = null;

      tier.className = `proof-tier proof-tier-${tierName}`;
      tier.dataset.proofTier = tierName;
      track.className = "proof-tier-track";
      track.dataset.proofTrack = tierName;

      for (let copyIndex = 0; copyIndex < 3; copyIndex += 1) {
        const sequence = document.createElement("div");
        sequence.className = "proof-tier-sequence";
        sequence.dataset.proofSequence = tierName;
        if (copyIndex > 0) sequence.setAttribute("aria-hidden", "true");

        tierItems.forEach((item, itemIndex) => {
          sequence.append(renderItem(item, itemIndex, tierName));
        });

        if (!firstSequence) firstSequence = sequence;
        track.append(sequence);
      }

      tier.append(track);
      stage.append(tier);
      tiers[tierName] = {
        element: tier,
        track,
        firstSequence,
        width: 0,
        position: 0,
        momentumVelocity: 0,
        pauseUntil: 0,
        ...tierSettings[tierName]
      };
    };

    buildTier("numbers");
    buildTier("people");

    const applyPositions = () => {
      Object.values(tiers).forEach((tier) => {
        tier.track.style.transform = `translate3d(${-tier.position}px, 0, 0)`;
      });
    };

    const measure = () => {
      Object.values(tiers).forEach((tier) => {
        const oldWidth = tier.width;
        const phase = captureMode
          ? tier.initialPhase
          : oldWidth
            ? normalise(tier.position, oldWidth) / oldWidth
            : tier.initialPhase;
        const measuredWidth = tier.firstSequence.getBoundingClientRect().width;

        if (!measuredWidth) return;
        tier.width = measuredWidth;
        tier.position = captureMode && measuredWidth <= tier.element.clientWidth
          ? -(tier.element.clientWidth - measuredWidth) / 2
          : normalise(phase * measuredWidth, measuredWidth);
      });

      applyPositions();
      band.dataset.proofReady = "true";
    };

    const moveTier = (tier, distance) => {
      if (!tier?.width) return;
      tier.position = normalise(tier.position + distance, tier.width);
      tier.track.style.transform = `translate3d(${-tier.position}px, 0, 0)`;
    };

    const tick = (now) => {
      animationFrame = 0;
      const elapsed = lastFrame ? Math.min(48, now - lastFrame) : 0;
      lastFrame = now;

      if (!motionPreference.matches && !captureMode && !dragging && !document.hidden) {
        Object.values(tiers).forEach((tier) => {
          if (Math.abs(tier.momentumVelocity) > 0.012) {
            moveTier(tier, tier.momentumVelocity * elapsed);
            tier.momentumVelocity *= Math.pow(0.92, elapsed / 16.667);
          } else {
            if (tier.momentumVelocity) {
              tier.momentumVelocity = 0;
              tier.pauseUntil = now + 500;
            }

            if (now >= tier.pauseUntil) {
              moveTier(tier, tier.speed * elapsed);
            }
          }
        });
      }

      if (!motionPreference.matches && !captureMode) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    const startDrift = () => {
      if (animationFrame || motionPreference.matches || captureMode) return;
      lastFrame = 0;
      band.dataset.autoDrift = "on";
      animationFrame = window.requestAnimationFrame(tick);
    };

    const stopDrift = (state = "off") => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      lastFrame = 0;
      Object.values(tiers).forEach((tier) => {
        tier.momentumVelocity = 0;
      });
      band.dataset.autoDrift = state;
    };

    const clearActiveItem = () => {
      if (!activeItem) return;
      activeItem.classList.remove("is-touched");
      activeItem = null;
    };

    const finishPointer = (event) => {
      if (event.pointerId !== pointerId) return;

      if (dragging) {
        dragging = false;
        activeTier?.element.classList.remove("is-dragging");
        if (!motionPreference.matches && activeTier) {
          activeTier.momentumVelocity = pointerVelocity;
        }
      }

      clearActiveItem();
      pointerId = null;
      pointerVelocity = 0;

      if (band.hasPointerCapture?.(event.pointerId)) {
        band.releasePointerCapture(event.pointerId);
      }

      activeTier = null;
    };

    band.addEventListener("pointerdown", (event) => {
      if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;

      const tierElement = event.target.closest(".proof-tier");
      if (!tierElement) return;

      pointerId = event.pointerId;
      activeTier = tiers[tierElement.dataset.proofTier];
      activeItem = event.target.closest(".proof-item");
      if (activeItem) {
        activeItem.classList.add("is-touched");
      }

      if (motionPreference.matches && event.pointerType === "touch") return;

      dragging = true;
      lastPointerX = event.clientX;
      lastPointerTime = event.timeStamp;
      pointerVelocity = 0;
      activeTier.momentumVelocity = 0;
      activeTier.element.classList.add("is-dragging");
      band.setPointerCapture?.(event.pointerId);

      if (event.pointerType === "mouse") event.preventDefault();
    });

    band.addEventListener("pointermove", (event) => {
      if (!dragging || event.pointerId !== pointerId) return;

      const deltaX = event.clientX - lastPointerX;
      const elapsed = Math.max(8, event.timeStamp - lastPointerTime);

      if (motionPreference.matches) {
        activeTier.element.scrollLeft -= deltaX;
      } else {
        moveTier(activeTier, -deltaX);
      }

      pointerVelocity = -deltaX / elapsed;
      lastPointerX = event.clientX;
      lastPointerTime = event.timeStamp;

      if (event.cancelable) event.preventDefault();
    });

    band.addEventListener("pointerup", finishPointer);
    band.addEventListener("pointercancel", finishPointer);
    band.addEventListener("lostpointercapture", finishPointer);

    const handleMotionPreference = () => {
      if (captureMode) {
        stopDrift("frozen");
      } else if (motionPreference.matches) {
        stopDrift();
        Object.values(tiers).forEach((tier) => {
          tier.element.scrollLeft = 0;
          tier.position = 0;
        });
        applyPositions();
      } else {
        measure();
        startDrift();
      }
    };

    const images = Array.from(stage.querySelectorAll("img"));
    const imageReady = images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      });
    });

    measure();
    Promise.all(imageReady).then(measure);
    window.addEventListener("resize", measure, { passive: true });

    if ("ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(band);
    }

    if (motionPreference.addEventListener) {
      motionPreference.addEventListener("change", handleMotionPreference);
    } else {
      motionPreference.addListener(handleMotionPreference);
    }

    handleMotionPreference();
  };

  setupProofConstellation();

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
