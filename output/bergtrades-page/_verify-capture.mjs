import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const pageUrl = "http://127.0.0.1:4173/_capture.html";
const shotsDir = resolve("shots");
const profileDir = mkdtempSync(join(tmpdir(), "bergtrades-v8-chrome-"));
const debugPort = 9300 + Math.floor(Math.random() * 500);

mkdirSync(shotsDir, { recursive: true });

const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  "--hide-scrollbars",
  "--high-dpi-support=1",
  "--force-device-scale-factor=1",
  `--remote-debugging-port=${debugPort}`,
  "--remote-debugging-address=127.0.0.1",
  `--user-data-dir=${profileDir}`,
  "--window-size=500,900",
  "about:blank"
], {
  stdio: "ignore",
  windowsHide: true
});

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

async function getPageTarget() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === "page");
      if (page?.webSocketDebuggerUrl) return page;
    } catch {}
    await delay(100);
  }
  throw new Error("Chrome DevTools endpoint did not become ready");
}

let socket;

try {
  const target = await getPageTarget();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener("open", resolveOpen, { once: true });
    socket.addEventListener("error", rejectOpen, { once: true });
  });

  let commandId = 0;
  const pending = new Map();
  const eventWaiters = new Map();
  const browserErrors = [];

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const handler = pending.get(message.id);
      if (!handler) return;
      pending.delete(message.id);
      if (message.error) handler.reject(new Error(message.error.message));
      else handler.resolve(message.result);
      return;
    }

    if (message.method === "Runtime.exceptionThrown") {
      browserErrors.push(message.params.exceptionDetails.text);
    }
    if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
      browserErrors.push(message.params.entry.text);
    }

    const waiters = eventWaiters.get(message.method);
    if (!waiters) return;
    eventWaiters.delete(message.method);
    waiters.forEach((resolveEvent) => resolveEvent(message.params));
  });

  const send = (method, params = {}) => new Promise((resolveCommand, rejectCommand) => {
    commandId += 1;
    pending.set(commandId, { resolve: resolveCommand, reject: rejectCommand });
    socket.send(JSON.stringify({ id: commandId, method, params }));
  });

  const waitForEvent = (method) => new Promise((resolveEvent) => {
    const waiters = eventWaiters.get(method) || [];
    waiters.push(resolveEvent);
    eventWaiters.set(method, waiters);
  });

  await Promise.all([
    send("Page.enable"),
    send("Runtime.enable"),
    send("Log.enable")
  ]);

  const loaded = waitForEvent("Page.loadEventFired");
  await send("Page.navigate", { url: pageUrl });
  await loaded;

  const evaluation = await send("Runtime.evaluate", {
    expression: `(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, (image) => image.complete
        ? Promise.resolve()
        : new Promise((resolveImage) => {
            image.addEventListener('load', resolveImage, { once: true });
            image.addEventListener('error', resolveImage, { once: true });
          })));
      return {
        innerWidth: window.innerWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        devicePixelRatio: window.devicePixelRatio,
        fonts: document.fonts.status,
        images: Array.from(document.images, (image) => ({
          src: image.getAttribute('src'),
          complete: image.complete,
          naturalWidth: image.naturalWidth
        })),
        sections: document.querySelectorAll('main > section').length,
        sectionRects: Array.from(document.querySelectorAll('main > section'), (section) => ({
          className: section.className,
          top: Math.round(section.getBoundingClientRect().top),
          bottom: Math.round(section.getBoundingClientRect().bottom),
          height: Math.round(section.getBoundingClientRect().height)
        })),
        videoRows: document.querySelectorAll('.video-idea-row').length,
        nickCards: document.querySelectorAll('.packaging-card').length
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  const metrics = evaluation.result?.value || { evaluation };
  const layout = await send("Page.getLayoutMetrics");
  const contentHeight = Math.ceil(layout.cssContentSize.height);

  const topCapture = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  });
  writeFileSync(join(shotsDir, "v8-top-500.png"), Buffer.from(topCapture.data, "base64"));

  const fullCapture = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: 500, height: contentHeight, scale: 1 }
  });
  writeFileSync(join(shotsDir, "v8-full-500.png"), Buffer.from(fullCapture.data, "base64"));

  const sectionShots = [
    ["v8-01-proof-500.png", 1, 1],
    ["v8-02-content-titles-500.png", 2, 3],
    ["v8-03-frames-500.png", 4, 4],
    ["v8-04-bio-500.png", 5, 5],
    ["v8-05-close-500.png", 6, 7]
  ];

  for (const [filename, firstIndex, lastIndex] of sectionShots) {
    const top = metrics.sectionRects[firstIndex].top;
    const bottom = metrics.sectionRects[lastIndex].bottom;
    const capture = await send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: true,
      clip: { x: 0, y: top, width: 500, height: bottom - top, scale: 1 }
    });
    writeFileSync(join(shotsDir, filename), Buffer.from(capture.data, "base64"));
  }

  process.stdout.write(`${JSON.stringify({ ...metrics, contentHeight, browserErrors }, null, 2)}\n`);
} finally {
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  chrome.kill();
  const safeProfile = resolve(profileDir);
  const safeTemp = resolve(tmpdir());
  if (safeProfile.startsWith(`${safeTemp}\\`)) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        rmSync(safeProfile, { recursive: true, force: true });
        break;
      } catch {
        await delay(100);
      }
    }
  }
}
