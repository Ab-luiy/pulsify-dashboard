// Public home page: the Get started pop-up. Sign-in has its own script, signin.js.
(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);

  // Home: Get started opens the Client or Team pop-up. Someone who has signed in before goes
  // straight to the side they used last (signin.js remembers it), with one quiet link to the
  // other side (founder, 2026-10-01, option 2).
  const SIDES = {
    client: { label: "Continue to Client portal", href: "/login/client", ask: "Not a client?", other: "Team sign in", otherHref: "/login/operator" },
    operator: { label: "Continue to Team console", href: "/login/operator", ask: "Not on the team?", other: "Client sign in", otherHref: "/login/client" },
  };
  let stored = null;
  try { stored = localStorage.getItem("pulsify:side"); } catch { /* private window: first-visit behaviour */ }
  const known = Object.prototype.hasOwnProperty.call(SIDES, stored) ? SIDES[stored] : null;
  const start = $("[data-open-chooser]");
  const chooser = $("dialog.chooser");
  if (start && known) {
    start.textContent = known.label;
    start.addEventListener("click", () => location.assign(known.href));
    const line = document.createElement("div");
    line.className = "hero-switch";
    const link = document.createElement("a");
    link.href = known.otherHref;
    link.textContent = known.other;
    line.append(`${known.ask} `, link);
    start.after(line);
  }
  if (chooser) {
    if (start && !known) start.addEventListener("click", () => chooser.showModal());
    $("[data-close-chooser]")?.addEventListener("click", () => chooser.close());
    // Clicking the dimmed backdrop closes it too.
    chooser.addEventListener("click", (event) => { if (event.target === chooser) chooser.close(); });
  }
})();

// Footer copyright year follows the visitor's clock so it never goes stale.
document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = String(new Date().getFullYear()); });
