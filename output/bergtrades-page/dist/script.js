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
    { src: "assets/proof/proof-cash.webp", layer: "back", offset: -46, scale: 0.94 },
    { src: "assets/proof/proof-nick.webp", layer: "front", offset: 34, scale: 1.04 },
    { src: "assets/proof/proof-dashboard.webp", layer: "back", offset: 54, scale: 1.04 },
    { src: "assets/proof/proof-jacob.webp", layer: "front", offset: -62, scale: 0.91 },
    { src: "assets/proof/proof-closed-list.webp", layer: "back", offset: -12, scale: 0.88 },
    { src: "assets/proof/proof-nick-mamba.webp", layer: "front", offset: 6, scale: 1.08 },
    { src: "assets/proof/proof-payment.webp", layer: "back", offset: 66, scale: 0.98 },
    { src: "assets/proof/proof-table.webp", layer: "front", offset: -38, scale: 0.96 }
  ];

  const setupProofConstellation = () => {
    const band = document.querySelector("[data-proof-constellation]");
    const stage = band?.querySelector("[data-proof-stage]");
    if (!band || !stage) return;

    const captureMode = root.hasAttribute("data-proof-freeze");
    const gapPattern = [34, 76, 48, 90, 62, 28];
    const layers = {};
    let animationFrame = 0;
    let lastFrame = 0;
    let dragging = false;
    let pointerId = null;
    let activeItem = null;
    let lastPointerX = 0;
    let lastPointerTime = 0;
    let pointerVelocity = 0;
    let momentumVelocity = 0;
    let pauseUntil = 0;

    const normalise = (value, width) => {
      if (!width) return 0;
      return ((value % width) + width) % width;
    };

    const renderItem = (item, itemIndex, layerName) => {
      const image = document.createElement("img");
      const scale = item.scale.toFixed(3);
      const offset = `${item.offset}px`;
      const mobileOffset = `${Math.round(item.offset * 0.56)}px`;
      const gapOffset = layerName === "back" ? 1 : 0;

      image.className = "proof-item";
      image.src = item.src;
      image.alt = "";
      image.loading = "eager";
      image.decoding = "async";
      image.draggable = false;
      image.style.setProperty("--proof-offset", offset);
      image.style.setProperty("--proof-mobile-offset", mobileOffset);
      image.style.setProperty("--proof-scale", scale);
      image.style.setProperty("--proof-hover-scale", (item.scale * 1.04).toFixed(3));
      image.style.setProperty("--proof-gap", `${gapPattern[(itemIndex + gapOffset) % gapPattern.length]}px`);

      return image;
    };

    const buildLayer = (layerName) => {
      const layerItems = proofItems.filter((item) => item.layer === layerName);
      const layer = document.createElement("div");
      const track = document.createElement("div");
      let firstSequence = null;

      layer.className = `proof-layer proof-layer-${layerName}`;
      track.className = "proof-layer-track";
      track.dataset.proofTrack = layerName;

      for (let copyIndex = 0; copyIndex < 3; copyIndex += 1) {
        const sequence = document.createElement("div");
        sequence.className = "proof-layer-sequence";
        sequence.dataset.proofSequence = layerName;
        if (copyIndex > 0) sequence.setAttribute("aria-hidden", "true");

        layerItems.forEach((item, itemIndex) => {
          sequence.append(renderItem(item, itemIndex, layerName));
        });

        if (!firstSequence) firstSequence = sequence;
        track.append(sequence);
      }

      layer.append(track);
      stage.append(layer);
      layers[layerName] = {
        layer,
        track,
        firstSequence,
        width: 0,
        position: 0,
        initialPhase: layerName === "front" ? 0.12 : 0.44
      };
    };

    buildLayer("back");
    buildLayer("front");

    const applyPositions = () => {
      Object.values(layers).forEach((layer) => {
        layer.track.style.transform = `translate3d(${-layer.position}px, 0, 0)`;
      });
    };

    const measure = () => {
      let widestLayer = band.clientWidth;

      Object.values(layers).forEach((layer) => {
        const oldWidth = layer.width;
        const phase = oldWidth ? layer.position / oldWidth : layer.initialPhase;
        const measuredWidth = layer.firstSequence.getBoundingClientRect().width;

        if (!measuredWidth) return;
        layer.width = measuredWidth;
        layer.position = normalise(phase * measuredWidth, measuredWidth);
        widestLayer = Math.max(widestLayer, measuredWidth);
      });

      stage.style.width = `${Math.ceil(widestLayer)}px`;
      applyPositions();
      band.dataset.proofReady = "true";
    };

    const moveLayers = (frontDistance) => {
      if (!layers.front.width || !layers.back.width) return;
      layers.front.position = normalise(layers.front.position + frontDistance, layers.front.width);
      layers.back.position = normalise(layers.back.position + frontDistance * 0.55, layers.back.width);
      applyPositions();
    };

    const tick = (now) => {
      animationFrame = 0;
      const elapsed = lastFrame ? Math.min(48, now - lastFrame) : 0;
      lastFrame = now;

      if (!motionPreference.matches && !captureMode && !dragging && !document.hidden) {
        if (Math.abs(momentumVelocity) > 0.012) {
          moveLayers(momentumVelocity * elapsed);
          momentumVelocity *= Math.pow(0.92, elapsed / 16.667);
        } else {
          if (momentumVelocity) {
            momentumVelocity = 0;
            pauseUntil = now + 500;
          }

          if (now >= pauseUntil && layers.front.width) {
            moveLayers((layers.front.width / 52000) * elapsed);
          }
        }
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
      momentumVelocity = 0;
      band.dataset.autoDrift = state;
    };

    const clearActiveItem = () => {
      if (!activeItem) return;
      activeItem.classList.remove("is-touched");
      activeItem.closest(".proof-layer")?.classList.remove("is-interacting");
      activeItem = null;
    };

    const finishPointer = (event) => {
      if (event.pointerId !== pointerId) return;

      if (dragging) {
        dragging = false;
        band.classList.remove("is-dragging");
        if (!motionPreference.matches) momentumVelocity = pointerVelocity;
      }

      clearActiveItem();
      pointerId = null;
      pointerVelocity = 0;

      if (band.hasPointerCapture?.(event.pointerId)) {
        band.releasePointerCapture(event.pointerId);
      }
    };

    band.addEventListener("pointerdown", (event) => {
      if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;

      pointerId = event.pointerId;
      activeItem = event.target.closest(".proof-item");
      if (activeItem) {
        activeItem.classList.add("is-touched");
        activeItem.closest(".proof-layer")?.classList.add("is-interacting");
      }

      if (motionPreference.matches && event.pointerType === "touch") return;

      dragging = true;
      lastPointerX = event.clientX;
      lastPointerTime = event.timeStamp;
      pointerVelocity = 0;
      momentumVelocity = 0;
      band.classList.add("is-dragging");
      band.setPointerCapture?.(event.pointerId);

      if (event.pointerType === "mouse") event.preventDefault();
    });

    band.addEventListener("pointermove", (event) => {
      if (!dragging || event.pointerId !== pointerId) return;

      const deltaX = event.clientX - lastPointerX;
      const elapsed = Math.max(8, event.timeStamp - lastPointerTime);

      if (motionPreference.matches) {
        band.scrollLeft -= deltaX;
      } else {
        moveLayers(-deltaX);
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
      if (motionPreference.matches) {
        stopDrift();
        band.scrollLeft = 0;
        Object.values(layers).forEach((layer) => {
          layer.position = 0;
        });
        applyPositions();
      } else if (captureMode) {
        stopDrift("frozen");
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
