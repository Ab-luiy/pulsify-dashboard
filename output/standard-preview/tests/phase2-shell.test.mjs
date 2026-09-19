import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("operator shell mounts dashboard views and the dashboard reads the D1 spine", async () => {
  const [shell, dashboard] = await Promise.all([
    readFile(new URL("admin/phase1.js", root), "utf8"),
    readFile(new URL("admin/dashboard.html", root), "utf8"),
  ]);
  assert.match(shell, /PulsifyNativeDashboard.show/);
  assert.doesNotMatch(shell, /ps-dashboard-frame|embed=1&view=/);
  assert.doesNotMatch(shell, /action\.startsWith\('view:'\).*dashboardViews/);
  assert.match(dashboard, /\/api\/spine\/snapshot\?scope=operator/);
  assert.match(dashboard, /\/api\/spine\/series\?scope=operator/);
  assert.match(dashboard, /\/api\/spine\/leads/);
  assert.doesNotMatch(dashboard, /fetch\("dashboard-data-v2\.json/);
});

test("embedded operator views do not paint the sign-in fallback before authentication resolves", async () => {
  const [view, consoleSource] = await Promise.all([
    readFile(new URL("admin/console-view.html", root), "utf8"),
    readFile(new URL("admin/console.js", root), "utf8"),
  ]);
  assert.match(view, /<section class="auth-screen" id="authScreen" hidden>/);
  assert.match(consoleSource, /\$\("shell"\)\.hidden = true;\s*\$\("authScreen"\)\.hidden = false;\s*showMessage\(\$\("authMessage"\)/);
});
