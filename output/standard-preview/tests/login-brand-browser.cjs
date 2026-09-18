const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/Abdullah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const root = path.resolve(__dirname, '..');
const qa = path.resolve(root, '../qa/2026-09-brand');
fs.mkdirSync(qa, { recursive: true });
const requests = [];

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.avif': 'image/avif', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  requests.push(url.pathname);
  if (url.pathname === '/api/client-login' && req.method === 'POST') {
    let raw = '';
    req.on('data', chunk => raw += chunk);
    req.on('end', () => {
      const body = JSON.parse(raw);
      assert.equal(body.email, 'demo@example.test');
      assert.equal(body.password, 'test-password');
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true, client: 'demo-rio', redirect: '/portal?client=demo-rio' }));
    });
    return;
  }
  if (url.pathname === '/portal') {
    res.setHeader('content-type', 'text/html');
    res.end('<!doctype html><title>Demo Rio</title><h1>Demo Rio workspace</h1>');
    return;
  }
  if (url.pathname === '/favicon-proof') {
    res.setHeader('content-type', 'text/html');
    res.end('<!doctype html><style>html{background:#ebe9e5}body{margin:20px;display:flex;align-items:center;gap:10px;font:12px Arial;color:#333}img{width:16px;height:16px}</style><img src="/favicon.ico" alt="Pulsify favicon"><span>16 px browser tab asset</span>');
    return;
  }
  const route = url.pathname === '/portal/login' || url.pathname === '/portal/register' ? '/portal/login/index.html' : url.pathname;
  const file = path.resolve(root, '.' + route);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  res.setHeader('content-type', types[path.extname(file).toLowerCase()] || 'application/octet-stream');
  res.end(fs.readFileSync(file));
});

(async () => {
  await new Promise(resolve => server.listen(8773, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1536, height: 960 }, colorScheme: 'light' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    for (const width of [1536, 390]) {
      requests.length = 0;
      await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
      await page.goto('http://127.0.0.1:8773/portal/login', { waitUntil: 'networkidle' });
      await page.locator('#email').waitFor();
      assert.equal(await page.locator('h1').innerText(), 'Welcome back');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `sign-in overflow at ${width}`);
      assert.match(await page.locator('.auth-panel').evaluate(el => getComputedStyle(el).backgroundColor), /rgb\((17|18), (16|17), (15|16)\)/);
      await page.screenshot({ path: path.join(qa, `login-signin-${width}.png`), fullPage: true });
      if (width === 390) assert.equal(requests.some(item => /login-hero-\d+\.(avif|webp|jpg)$/.test(item)), false, 'mobile downloaded the desktop hero');
      else assert.equal(requests.some(item => /login-hero-\d+\.(avif|webp)$/.test(item)), true, 'desktop did not load a responsive hero');

      await page.goto('http://127.0.0.1:8773/portal/register', { waitUntil: 'networkidle' });
      assert.equal(await page.locator('h1').innerText(), 'Get started with Pulsify');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `create-account overflow at ${width}`);
      await page.screenshot({ path: path.join(qa, `login-create-${width}.png`), fullPage: true });
    }

    await page.setViewportSize({ width: 1536, height: 960 });
    await page.goto('http://127.0.0.1:8773/portal/login');
    await page.locator('#moreOptions').click();
    assert.equal(await page.locator('#emailCodeOption').isVisible(), true);
    await page.locator('#email').fill('demo@example.test');
    await page.locator('#password').fill('test-password');
    await page.locator('#loginButton').click();
    await page.waitForURL('**/portal?client=demo-rio');
    assert.match(await page.locator('h1').innerText(), /Demo Rio/);

    await page.setViewportSize({ width: 220, height: 64 });
    await page.goto('http://127.0.0.1:8773/favicon-proof', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(qa, 'favicon-16.png') });
    assert.deepEqual(errors, []);
    console.log('PASS login brand: source states, 1536/390 layouts, responsive hero, dark-only surface, options reveal, demo-rio auth redirect and 16 px favicon.');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
