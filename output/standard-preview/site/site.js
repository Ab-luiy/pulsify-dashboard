// Public site behaviour: the Get started pop-up on the home page and the two
// sign-in pages. Text is only ever set with textContent (never HTML), and the
// server re-validates every value passed to /api/propelauth/start.
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

  // Sign-in pages.
  const audience = document.body.dataset.audience;
  if (audience !== "operator" && audience !== "client") return;
  const params = new URLSearchParams(location.search);
  const next = params.get("next") || "";
  const client = audience === "client" ? params.get("client") || "" : "";

  const MESSAGES = {
    not_operator: "This account is not on the Pulsify team. Sign in with your team email.",
    unlinked: audience === "operator"
      ? "This account could not be verified. Confirm your email, then try again."
      : "This sign-in is not linked to a Pulsify workspace yet. Ask your Pulsify contact to add you.",
    expired: "The sign-in took too long. Try again.",
    failed: "Sign-in did not complete. Try again.",
    unavailable: "Sign-in is unavailable right now. Try again shortly.",
  };
  const notice = $("[data-notice]");
  const show = (text, isError) => {
    notice.textContent = text;
    notice.classList.toggle("error", Boolean(isError));
    notice.hidden = false;
  };
  const error = params.get("auth_error");
  if (error) show(MESSAGES[error] || MESSAGES.failed, true);
  else if (params.get("signed_out") === "1") show("You are signed out.");

  const start = new URL("/api/propelauth/start", location.origin);
  start.searchParams.set("as", audience);
  if (next) start.searchParams.set("next", next);
  if (client) start.searchParams.set("client", client);
  const cont = $("[data-continue]");
  cont.href = start.pathname + start.search;

  // Clients who still use a Pulsify password keep that path.
  const password = $("[data-password]");
  if (password) {
    const legacy = new URL("/portal/login", location.origin);
    if (next) legacy.searchParams.set("next", next);
    if (client) legacy.searchParams.set("client", client);
    password.href = legacy.pathname + legacy.search;
  }

  fetch("/api/propelauth/config", { cache: "no-store", credentials: "same-origin" })
    .then((response) => response.json())
    .then((config) => {
      if (config && config.enabled) return;
      cont.setAttribute("aria-disabled", "true");
      cont.removeAttribute("href");
      if (audience === "client" && password) {
        show("Use your Pulsify password to sign in.");
        password.classList.add("button", "full");
        password.parentElement.classList.remove("alt");
        cont.hidden = true;
      } else if (!error) {
        show("Sign-in is being switched on. Try again shortly.");
      }
    })
    .catch(() => {});
})();
