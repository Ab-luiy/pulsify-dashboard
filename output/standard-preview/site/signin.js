// The one sign-in page. Served at /login/client, /login/operator, /portal/login and /portal/register.
//   Client tab: email and password in one form, a one-time email link for a forgotten password,
//               a request-access form, and the "set your password" step that the emailed link opens.
//   Team tab:   one button that hands off to the team sign-in.
// Text is only ever set with textContent. The server re-validates every value it receives.
(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const params = new URLSearchParams(location.search);
  const setupToken = params.get("setup") || "";
  const nextRaw = params.get("next") || "";
  let mode = location.pathname.includes("/operator") || params.get("operator") === "1" ? "operator" : "client";
  const finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Where a finished client sign-in may land: their portal or onboarding, never the sign-in pages.
  function safeNext(raw) {
    if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "";
    try {
      const url = new URL(raw, location.origin);
      if (url.origin !== location.origin) return "";
      if (!/^\/(?:onboard|portal|app\/portal)(?:\/|$)/.test(url.pathname) || /^\/portal\/(?:login|register)(?:\/|$)/.test(url.pathname)) return "";
      return url.pathname + url.search + url.hash;
    } catch {
      return "";
    }
  }

  function destination(client) {
    const url = new URL(safeNext(nextRaw) || "/app/portal", location.origin);
    if (client && !url.searchParams.has("client")) url.searchParams.set("client", client);
    return url.pathname + url.search + url.hash;
  }

  // ---------- views ----------

  const TITLES = {
    signin: "Sign in", forgot: "Email me a link", sent: "Check your email", request: "Request access", requested: "Request sent",
    setup: "Set your password", expired: "Link expired", team: "Team sign in", teamcode: "Check your email",
    teamforgot: "Set your team password", teamsent: "Check your email",
  };
  const WITH_TABS = new Set(["signin", "forgot", "request", "team", "teamforgot"]);
  const notice = $("#notice");
  let view = "";
  let cameFrom = "signin";

  function say(text, isError) {
    notice.textContent = text;
    notice.classList.toggle("error", Boolean(isError));
    notice.hidden = !text;
  }

  function show(next, options = {}) {
    // Remember which sign-in screen the request or forgot form was opened from, so Back returns there.
    if ((next === "request" || next === "forgot") && (view === "signin" || view === "team")) cameFrom = view;
    view = next;
    const fresh = $('[data-view="expired"] [data-go]');
    if (fresh) fresh.dataset.go = mode === "operator" ? "teamforgot" : "forgot";
    for (const section of $$("[data-view]")) section.hidden = section.dataset.view !== next;
    $("#tabs").hidden = !WITH_TABS.has(next);
    for (const tab of $$("[data-tab]")) {
      if (tab.dataset.tab === mode) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    }
    document.title = `${TITLES[next] || "Sign in"} · Pulsify`;
    if (!options.keepNotice) say("");
    if (options.focus === false) return;
    const first = $(`[data-view="${next}"] input:not(.si-trap):not([type=hidden]):not([readonly])`);
    const heading = $(`[data-view="${next}"] h1`);
    if (first && (finePointer || next === "setup" || next === "forgot" || next === "request")) first.focus();
    else if (heading) heading.focus({ preventScroll: true });
  }

  function home() {
    return mode === "operator" ? "team" : "signin";
  }

  for (const button of $$("[data-go]")) {
    button.addEventListener("click", () => {
      const target = button.dataset.go;
      if (target === "forgot") {
        const typed = $("#email").value.trim();
        if (typed && !$("#forgotEmail").value) $("#forgotEmail").value = typed;
      }
      show(target === "back" ? (cameFrom === "team" && mode === "operator" ? "team" : home()) : target);
    });
  }

  for (const tab of $$("[data-tab]")) {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      mode = tab.dataset.tab;
      const keep = new URLSearchParams();
      for (const key of ["next", "client"]) if (params.get(key)) keep.set(key, params.get(key));
      const query = keep.toString();
      history.replaceState(null, "", tab.getAttribute("href") + (query ? `?${query}` : ""));
      show(home());
    });
  }

  for (const toggle of $$("[data-toggle]")) {
    toggle.addEventListener("click", () => {
      const input = document.getElementById(toggle.dataset.toggle);
      const reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      toggle.textContent = reveal ? "Hide" : "Show";
      toggle.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
      toggle.setAttribute("aria-pressed", String(reveal));
    });
  }

  // ---------- forms ----------

  async function post(path, body) {
    let response;
    try {
      response = await fetch(path, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    } catch {
      return { ok: false, status: 0, error: "Could not reach Pulsify. Check your connection and try again." };
    }
    const data = await response.json().catch(() => ({}));
    const fallback = response.status >= 500 ? "Something went wrong on our side. Try again in a moment." : "That did not work. Try again.";
    return { ok: response.ok && data.ok !== false, status: response.status, data, error: typeof data.error === "string" && data.error ? data.error : fallback };
  }

  function fail(id, text, focusTarget) {
    const box = document.getElementById(id);
    box.textContent = text;
    box.hidden = false;
    if (focusTarget) {
      focusTarget.setAttribute("aria-invalid", "true");
      focusTarget.setAttribute("aria-describedby", id);
      focusTarget.focus();
    }
  }

  function clearErrors(form) {
    for (const box of $$(".field-error", form)) { box.hidden = true; box.textContent = ""; }
    for (const input of $$("[aria-invalid]", form)) { input.removeAttribute("aria-invalid"); }
  }

  function busy(button, working, label, idle) {
    button.disabled = working;
    button.textContent = working ? label : idle;
  }

  const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  // Sign in
  const signinForm = $("#signinForm");
  signinForm.addEventListener("input", () => clearErrors(signinForm));
  signinForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(signinForm);
    const email = $("#email").value.trim().toLowerCase();
    const password = $("#password").value;
    if (!validEmail(email)) return fail("signinError", "Enter the email address you signed up with.", $("#email"));
    if (!password) return fail("signinError", "Enter your password.", $("#password"));
    const button = $("#signinButton");
    busy(button, true, "Signing in", "Sign in");
    const result = await post("/api/client-login", { email, password });
    if (result.ok) {
      $("#password").value = "";
      location.replace(destination(result.data.client));
      return;
    }
    busy(button, false, "", "Sign in");
    if (result.status === 401 || result.status === 429) {
      fail("signinError", result.error, $("#password"));
      if (result.status === 401) $("#password").select();
    } else {
      fail("signinError", result.error);
    }
  });

  // Forgot password: always the same answer, so the page never says who has a workspace.
  const forgotForm = $("#forgotForm");
  forgotForm.addEventListener("input", () => clearErrors(forgotForm));
  forgotForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(forgotForm);
    const email = $("#forgotEmail").value.trim().toLowerCase();
    if (!validEmail(email)) return fail("forgotError", "Enter your email address.", $("#forgotEmail"));
    const button = $("#forgotButton");
    busy(button, true, "Sending", "Send link");
    const result = await post("/api/login-lookup", { email, action: "link" });
    busy(button, false, "", "Send link");
    if (result.status === 0) return fail("forgotError", result.error);
    if (typeof result.data.message === "string" && result.data.message) $("#sentText").textContent = result.data.message;
    show("sent");
  });

  // Request access
  const requestForm = $("#requestForm");
  requestForm.addEventListener("input", () => clearErrors(requestForm));
  requestForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(requestForm);
    const name = $("#reqName").value.trim();
    const email = $("#reqEmail").value.trim().toLowerCase();
    if (!name) return fail("requestError", "Add your name.", $("#reqName"));
    if (!validEmail(email)) return fail("requestError", "Enter a valid email address.", $("#reqEmail"));
    const button = $("#requestButton");
    busy(button, true, "Sending", "Request access");
    const result = await post("/api/access-request", { name, email, link: $("#reqLink").value.trim(), website: $("#reqWebsite").value });
    busy(button, false, "", "Request access");
    if (!result.ok) return fail("requestError", result.error);
    if (typeof result.data.message === "string" && result.data.message) $("#requestedText").textContent = result.data.message;
    show("requested");
  });

  // Setup: set a password from the emailed link
  const setupForm = $("#setupForm");
  const state = { needsCode: false };
  let resendTimer = 0;
  setupForm.addEventListener("input", () => clearErrors(setupForm));

  function cooldown(seconds) {
    const button = $("#resendCode");
    clearInterval(resendTimer);
    let left = seconds;
    button.disabled = true;
    const tick = () => {
      if (left <= 0) { clearInterval(resendTimer); button.disabled = false; button.textContent = "Send a new code"; return; }
      button.textContent = `Send a new code (${left})`;
      left -= 1;
    };
    tick();
    resendTimer = setInterval(tick, 1000);
  }

  async function sendCode() {
    if (mode === "operator") {
      state.needsCode = false;
      $("#codeField").hidden = true;
      $("#resendCode").hidden = true;
      $("#setupCode").required = false;
      $("#setupLead").textContent = "Choose a password for the Pulsify team console.";
      $("#setupHint").textContent = "At least 12 characters.";
      $("#setupPassword").minLength = 12;
      return;
    }
    const result = await post("/api/client-email-code", { setup_token: setupToken });
    if (result.status === 401) return show("expired");
    if (!result.ok) return fail("setupError", result.error);
    state.needsCode = Boolean(result.data.requires_code);
    $("#codeField").hidden = !state.needsCode;
    $("#resendCode").hidden = !state.needsCode;
    $("#setupCode").required = state.needsCode;
    if (state.needsCode) {
      if (typeof result.data.email === "string") $("#setupUsername").value = result.data.email;
      $("#codeHint").textContent = `We emailed a 6-digit code to ${result.data.email || "your inbox"}. It expires in 10 minutes.`;
      cooldown(30);
    }
  }

  $("#resendCode").addEventListener("click", async () => {
    clearErrors(setupForm);
    cooldown(30);
    await sendCode();
  });

  setupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(setupForm);
    const password = $("#setupPassword").value;
    const code = $("#setupCode").value.trim();
    const minimum = mode === "operator" ? 12 : 10;
    if (password.length < minimum) return fail("setupError", `Use at least ${minimum} characters.`, $("#setupPassword"));
    if (state.needsCode && !/^\d{6}$/.test(code)) return fail("setupError", "Enter the 6-digit code from your email.", $("#setupCode"));
    const button = $("#setupButton");
    busy(button, true, "Saving", "Save password and open workspace");
    const result = mode === "operator"
      ? await post("/api/operator-auth", { action: "setup", setup_token: setupToken, password, trust: true, next: nextRaw })
      : await post("/api/client-set-password", { setup_token: setupToken, code: state.needsCode ? code : "", password });
    if (result.ok) {
      $("#setupPassword").value = "";
      const target = typeof result.data.redirect === "string" && result.data.redirect.startsWith("/") && !result.data.redirect.startsWith("//") ? result.data.redirect : "/app/portal";
      location.replace(target);
      return;
    }
    busy(button, false, "", "Save password and open workspace");
    if (result.status === 401 && /setup link/i.test(result.error)) return show("expired");
    const codeProblem = /code/i.test(result.error);
    fail("setupError", result.error, codeProblem ? $("#setupCode") : $("#setupPassword"));
  });

  // Team: email and password, then an emailed code on a device we have not seen
  const teamForm = $("#teamForm");
  let challenge = "";
  teamForm.addEventListener("input", () => clearErrors(teamForm));
  teamForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(teamForm);
    const email = $("#teamEmail").value.trim().toLowerCase();
    const password = $("#teamPassword").value;
    if (!validEmail(email)) return fail("teamError", "Enter your team email address.", $("#teamEmail"));
    if (!password) return fail("teamError", "Enter your password.", $("#teamPassword"));
    const button = $("#teamButton");
    busy(button, true, "Signing in", "Sign in");
    const result = await post("/api/operator-auth", { action: "login", email, password, trust: $("#teamTrust").checked, next: nextRaw });
    busy(button, false, "", "Sign in");
    if (!result.ok) {
      fail("teamError", result.error, result.status === 401 || result.status === 429 ? $("#teamPassword") : undefined);
      if (result.status === 401) $("#teamPassword").select();
      return;
    }
    $("#teamPassword").value = "";
    if (result.data.step === "code") {
      challenge = result.data.challenge;
      $("#teamCodeLead").textContent = `We sent a 6-digit code to ${result.data.email || email}. It expires in 10 minutes.`;
      $("#teamCode").value = "";
      show("teamcode");
      return;
    }
    location.replace(result.data.redirect || "/app/");
  });

  const teamCodeForm = $("#teamCodeForm");
  teamCodeForm.addEventListener("input", () => clearErrors(teamCodeForm));
  teamCodeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(teamCodeForm);
    const code = $("#teamCode").value.replace(/\s+/g, "");
    if (!/^\d{6}$/.test(code)) return fail("teamCodeError", "Enter the 6-digit code from your email.", $("#teamCode"));
    const button = $("#teamCodeButton");
    busy(button, true, "Checking", "Verify and sign in");
    const result = await post("/api/operator-auth", { action: "verify", challenge, code });
    busy(button, false, "", "Verify and sign in");
    if (result.ok) {
      location.replace(result.data.redirect || "/app/");
      return;
    }
    if (result.data && result.data.expired) {
      show("team", { keepNotice: true });
      say(result.error, true);
      return;
    }
    fail("teamCodeError", result.error, $("#teamCode"));
  });

  const teamForgotForm = $("#teamForgotForm");
  teamForgotForm.addEventListener("input", () => clearErrors(teamForgotForm));
  teamForgotForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(teamForgotForm);
    const email = $("#teamForgotEmail").value.trim().toLowerCase();
    if (!validEmail(email)) return fail("teamForgotError", "Enter your team email address.", $("#teamForgotEmail"));
    const button = $("#teamForgotButton");
    busy(button, true, "Sending", "Send link");
    const result = await post("/api/operator-auth", { action: "link", email });
    busy(button, false, "", "Send link");
    if (result.status === 0 || !result.ok) return fail("teamForgotError", result.error);
    if (typeof result.data.message === "string" && result.data.message) $("#teamSentText").textContent = result.data.message;
    show("teamsent");
  });

  const MESSAGES = {
    not_operator: "This account is not on the Pulsify team. Sign in with your team email, or request access.",
    unlinked: "This sign-in is not linked to a Pulsify workspace yet. Ask your Pulsify contact to add you.",
    expired: "The sign-in took too long. Try again.",
    failed: "Sign-in did not complete. Try again.",
    unavailable: "Sign-in is unavailable right now. Try again shortly.",
  };
  const teamContinue = $("#teamContinue");
  const start = new URL("/api/propelauth/start", location.origin);
  start.searchParams.set("as", "operator");
  if (nextRaw) start.searchParams.set("next", nextRaw);
  teamContinue.href = start.pathname + start.search;
  fetch("/api/propelauth/config", { cache: "no-store", credentials: "same-origin" })
    .then((response) => response.json())
    .then((config) => {
      if (config && config.enabled) return;
      // A link without an address stops being a link to assistive tech, so keep the role.
      teamContinue.setAttribute("role", "link");
      teamContinue.setAttribute("aria-disabled", "true");
      teamContinue.removeAttribute("href");
      // The Google and magic-link fallback is off; the password form above is unaffected.
      teamContinue.hidden = true;
      if (teamContinue.parentElement) teamContinue.parentElement.hidden = true;
    })
    .catch(() => {});

  // ---------- start ----------

  const authError = params.get("auth_error");
  let initial = setupToken ? "setup" : location.pathname.includes("/register") || params.get("view") === "request" ? "request" : home();
  show(initial, { focus: !authError });
  if (authError) {
    say(MESSAGES[authError] || MESSAGES.failed, true);
    history.replaceState(null, "", location.pathname);
  } else if (params.get("signed_out") === "1") {
    say("You are signed out.");
    history.replaceState(null, "", location.pathname);
  }
  if (setupToken) sendCode();

  for (const el of $$("[data-year]")) el.textContent = String(new Date().getFullYear());

  // Back button from a finished sign-in must not show a stuck "Signing in" button.
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    busy($("#signinButton"), false, "", "Sign in");
  });
})();
