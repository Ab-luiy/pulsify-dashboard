// Public home page: the Get started pop-up. Sign-in has its own script, signin.js.
(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);

  // Home: Get started opens the Operator or Client pop-up.
  const chooser = $("dialog.chooser");
  if (chooser) {
    $("[data-open-chooser]")?.addEventListener("click", () => chooser.showModal());
    $("[data-close-chooser]")?.addEventListener("click", () => chooser.close());
    // Clicking the dimmed backdrop closes it too.
    chooser.addEventListener("click", (event) => { if (event.target === chooser) chooser.close(); });
  }
})();

// Footer copyright year follows the visitor's clock so it never goes stale.
document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = String(new Date().getFullYear()); });
