// Frame capture over Chrome DevTools: one screenshot per frame at 30fps, driven by render(t).
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'frames');
mkdirSync(OUT, { recursive: true });
const FPS = 30;
const beatsFile = path.join(HERE, 'beats.json');
const beats = existsSync(beatsFile) ? JSON.parse(readFileSync(beatsFile, 'utf8')) : null;
const total = Number(process.argv[2] || (beats ? beats[beats.length - 1][1] : 27));
const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null;

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
  '--remote-debugging-port=9333', '--window-size=1080,1920', '--user-data-dir=' + path.join(HERE, '.chr'),
  'about:blank'], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let targets;
for (let i = 0; i < 40; i++) {
  try { targets = await (await fetch('http://127.0.0.1:9333/json')).json(); if (targets.length) break; } catch {}
  await sleep(500);
}
const page = targets.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } });
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: pathToFileURL(path.join(HERE, 's9.html')).href });
await sleep(2500);
if (beats) await send('Runtime.evaluate', { expression: 'setBeats(' + JSON.stringify(beats) + ')' });

const n = Math.round(total * FPS);
const frames = only ? only.map(s => Math.round(s * FPS)) : [...Array(n).keys()];
for (const f of frames) {
  await send('Runtime.evaluate', { expression: `render(${f / FPS})` });
  const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 93 });
  writeFileSync(path.join(OUT, String(f).padStart(4, '0') + '.jpg'), Buffer.from(r.result.data, 'base64'));
  if (f % 60 === 0) console.log('frame', f, '/', n);
}
ws.close(); chrome.kill();
process.exit(0);
