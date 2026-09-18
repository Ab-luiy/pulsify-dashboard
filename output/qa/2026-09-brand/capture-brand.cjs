const { chromium } = require('C:/Users/Abdullah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const target = 'file:///' + path.resolve(__dirname, 'source-candidates.html').replace(/\\/g, '/');
  await page.goto(target, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.resolve(__dirname, 'source-candidates.png'), fullPage: true });
  await page.goto('file:///' + path.resolve(__dirname, 'contact-sheet.html').replace(/\\/g, '/'), { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.resolve(__dirname, 'contact-sheet.png'), fullPage: true });
  await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });
