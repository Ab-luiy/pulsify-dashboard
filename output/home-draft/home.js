// Pulsify homepage draft (pulsify-saas #38): mockups that scale with the screen, the problem chips
// that drive the demo, the views/cash switch and the apply form. No network calls in the draft.
(() => {
  // Product mockups are laid out at a fixed desktop width and scaled to fit, so they stay crisp
  // and identical to the real dashboard on every screen size.
  const fits = [...document.querySelectorAll("[data-fit]")];
  const fit = () => {
    for (const device of fits) {
      const small = innerWidth < 640 && Boolean(device.dataset.fitSm);
      device.classList.toggle("is-sm", small);
      const width = Number(small ? device.dataset.fitSm : device.dataset.fit);
      const screen = device.querySelector(".device-screen");
      const inner = device.querySelector(".fit");
      const scale = Math.min(1, screen.clientWidth / width);
      inner.style.transform = `scale(${scale})`;
      inner.style.width = `${width}px`;
      screen.style.height = `${inner.firstElementChild.offsetHeight * scale}px`;
    }
  };
  addEventListener("resize", fit);
  fit();

  // Demo: each chip brings one fix card forward and shows its math.
  const chips = [...document.querySelectorAll("[data-chip]")];
  for (const chip of chips) {
    chip.addEventListener("click", () => {
      const key = chip.dataset.chip;
      for (const other of chips) {
        const on = other === chip;
        other.classList.toggle("is-on", on);
        other.setAttribute("aria-pressed", String(on));
      }
      for (const card of document.querySelectorAll("[data-fix]")) card.classList.toggle("is-on", card.dataset.fix === key);
      for (const math of document.querySelectorAll("[data-math]")) math.hidden = math.dataset.math !== key;
    });
  }

  // Views or cash: the same eight example videos, ranked two ways.
  const videos = [
    ["A week of my trades, live", 12900, 0, "#2f3a4a", "#16171a"],
    ["Why most traders blow funded accounts", 2140, 6000, "#6b3e37", "#1d2330"],
    ["My risk rules, step by step", 480, 4500, "#4d3f68", "#16171a"],
    ["Reacting to viral trading advice", 9800, 0, "#2d3c38", "#16171a"],
    ["How I passed my first challenge", 1310, 2000, "#3a2b33", "#1d2330"],
    ["Day in my life as a trader", 7400, 0, "#2f3a4a", "#211c20"],
    ["The one setup I still take", 620, 2000, "#4d3f68", "#1b1f27"],
    ["Trading vs a 9 to 5", 5100, 0, "#243432", "#16171a"],
  ];
  const list = document.querySelector("[data-rank]");
  const word = document.querySelector("[data-sort-word]");
  const toggle = document.querySelector("[data-sort-switch]");
  const money = (n) => `$${n.toLocaleString("en")}`;
  const render = (byCash) => {
    const sorted = [...videos].sort((a, b) => (byCash ? b[2] - a[2] || b[1] - a[1] : b[1] - a[1]));
    list.replaceChildren(...sorted.map(([title, views, cash, a, b], index) => {
      const item = document.createElement("li");
      item.style.setProperty("--i", String(index));
      const thumb = document.createElement("span");
      thumb.className = "thumb";
      thumb.style.setProperty("--a", a);
      thumb.style.setProperty("--b", b);
      const text = document.createElement("p");
      text.textContent = title;
      const value = document.createElement("b");
      if (byCash) {
        value.textContent = cash ? `${money(cash)} collected` : "No sales";
        value.className = cash ? "cash" : "none";
      } else {
        value.textContent = `${views.toLocaleString("en")} views`;
      }
      text.append(value);
      item.append(thumb, text);
      return item;
    }));
    word.textContent = byCash ? "cash" : "views";
    toggle.setAttribute("aria-checked", String(byCash));
    toggle.setAttribute("aria-label", byCash ? "Sort by views instead of cash" : "Sort by cash instead of views");
  };
  toggle.addEventListener("click", () => render(toggle.getAttribute("aria-checked") !== "true"));
  render(true);

  // Apply: a short form, then the Instagram DM that is the founder's real next step.
  const dialog = document.querySelector("[data-apply]");
  const form = document.querySelector("[data-apply-form]");
  const error = document.querySelector("[data-apply-error]");
  const step = (name) => {
    for (const panel of form.querySelectorAll("[data-apply-step]")) panel.hidden = panel.dataset.applyStep !== name;
  };
  for (const opener of document.querySelectorAll("[data-open-apply]")) {
    opener.addEventListener("click", () => {
      step("form");
      error.hidden = true;
      dialog.showModal();
      form.querySelector("input")?.focus();
    });
  }
  form.querySelector("[data-apply-submit]").addEventListener("click", () => {
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const ok = String(data.get("name") || "").trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && data.get("stage");
    error.hidden = Boolean(ok);
    if (!ok) return;
    // Draft: nothing is sent. Live, this posts an opt-in to /event so the video that sent them gets the credit.
    const first = String(data.get("name")).trim().split(/\s+/)[0];
    form.querySelector("[data-apply-name]").textContent = first ? `, ${first}` : "";
    step("done");
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
})();
