const fs = require('node:fs');
const path = require('node:path');
const sharp = require('C:/Users/Abdullah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');

const root = path.resolve(__dirname, '..');
const shared = path.join(root, 'shared', 'brand');
const brand = path.join(root, 'assets', 'brand');
const variations = path.join(brand, 'variations');
fs.mkdirSync(shared, { recursive: true });
fs.mkdirSync(variations, { recursive: true });

const point = (r, degrees) => {
  const radians = degrees * Math.PI / 180;
  return [32 + r * Math.cos(radians), 32 + r * Math.sin(radians)];
};
const n = (value) => Number(value.toFixed(3));
const ringSegment = (outer, inner, start, end) => {
  const a = point(outer, start), b = point(outer, end), c = point(inner, end), d = point(inner, start);
  return `M${n(a[0])} ${n(a[1])}A${outer} ${outer} 0 0 1 ${n(b[0])} ${n(b[1])}L${n(c[0])} ${n(c[1])}A${inner} ${inner} 0 0 0 ${n(d[0])} ${n(d[1])}Z`;
};

const arcs = [];
for (const rotation of [0, 90, 180, 270]) {
  arcs.push(ringSegment(24, 19, -74 + rotation, -16 + rotation));
  arcs.push(ringSegment(16, 11.5, -74 + rotation, -16 + rotation));
}
const markPath = [
  'M32 2A30 30 0 1 1 31.999 62A30 30 0 0 1 32 2Z',
  'M32 7A25 25 0 1 0 32.001 57A25 25 0 0 0 32 7Z',
  'M29.2 8H34.8V29.2H56V34.8H34.8V56H29.2V34.8H8V29.2H29.2Z',
  ...arcs,
].join('');

const markSvg = (color = 'currentColor', background = '') => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Pulsify mark">
  ${background}
  <path fill="${color}" fill-rule="evenodd" d="${markPath}"/>
</svg>`;

const lockupSvg = (color = 'currentColor') => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 224 64" role="img" aria-label="Pulsify">
  <path fill="${color}" fill-rule="evenodd" d="${markPath}" transform="translate(8 15) scale(.53125)"/>
  <text x="54" y="46" fill="${color}" font-family="Inter, Arial, sans-serif" font-size="42" font-weight="600" letter-spacing="-0.84">Pulsify</text>
</svg>`;

const monogramSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Pulsify monogram">
  <rect width="64" height="64" rx="14" fill="hsl(30 6% 13%)"/>
  <path fill="#f4f3f1" fill-rule="evenodd" d="${markPath}" transform="translate(12 12) scale(.625)"/>
</svg>`;

const files = new Map([
  [path.join(shared, 'mark.svg'), markSvg()],
  [path.join(shared, 'lockup.svg'), lockupSvg()],
  [path.join(variations, '01-flat-white.svg'), markSvg('#f4f3f1')],
  [path.join(variations, '02-flat-black.svg'), markSvg('#11100f')],
  [path.join(variations, '03-green-warm-black.svg'), markSvg('hsl(156 64% 60%)', '<rect width="64" height="64" fill="hsl(30 8% 6%)"/>')],
  [path.join(variations, '05-lockup-white.svg'), lockupSvg('#f4f3f1')],
  [path.join(variations, '06-lockup-black.svg'), lockupSvg('#11100f')],
  [path.join(variations, '07-monogram.svg'), monogramSvg],
]);
for (const [filename, value] of files) fs.writeFileSync(filename, value);

const coinMaster = path.join(brand, 'coin-cutout-master.png');
const coinPng = path.join(variations, '04-coin.png');
const coinSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="Pulsify black coin">
  <image href="04-coin.png" width="1024" height="1024"/>
</svg>`;
fs.writeFileSync(path.join(variations, '04-coin.svg'), coinSvg);

const raster = async (svgPath, pngPath, width = 1024, height = width) => {
  await sharp(svgPath, { density: 384 }).resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(pngPath);
};

const ico = (images) => {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, buffer }, index) => {
    const p = 6 + index * 16;
    header[p] = size >= 256 ? 0 : size;
    header[p + 1] = size >= 256 ? 0 : size;
    header[p + 2] = 0;
    header[p + 3] = 0;
    header.writeUInt16LE(1, p + 4);
    header.writeUInt16LE(32, p + 6);
    header.writeUInt32LE(buffer.length, p + 8);
    header.writeUInt32LE(offset, p + 12);
    offset += buffer.length;
  });
  return Buffer.concat([header, ...images.map(({ buffer }) => buffer)]);
};

async function main() {
  await raster(path.join(variations, '01-flat-white.svg'), path.join(variations, '01-flat-white.png'));
  await raster(path.join(variations, '02-flat-black.svg'), path.join(variations, '02-flat-black.png'));
  await raster(path.join(variations, '03-green-warm-black.svg'), path.join(variations, '03-green-warm-black.png'));
  await sharp(coinMaster).resize(1024, 1024, { fit: 'contain' }).png().toFile(coinPng);
  await raster(path.join(variations, '05-lockup-white.svg'), path.join(variations, '05-lockup-white.png'));
  await raster(path.join(variations, '06-lockup-black.svg'), path.join(variations, '06-lockup-black.png'));
  await raster(path.join(variations, '07-monogram.svg'), path.join(variations, '07-monogram.png'));

  const iconSvg = markSvg('#f4f3f1', '<rect width="64" height="64" fill="hsl(30 8% 6%)"/>');
  const iconBuffers = [];
  for (const size of [16, 32, 48]) {
    const buffer = await sharp(Buffer.from(iconSvg), { density: 384 }).resize(size, size).png().toBuffer();
    iconBuffers.push({ size, buffer });
  }
  fs.writeFileSync(path.join(root, 'favicon.ico'), ico(iconBuffers));
  await sharp(Buffer.from(iconSvg), { density: 384 }).resize(180, 180).png().toFile(path.join(root, 'apple-touch-icon.png'));
  await sharp(Buffer.from(iconSvg), { density: 384 }).resize(192, 192).png().toFile(path.join(root, 'icon-192.png'));
  await sharp(Buffer.from(iconSvg), { density: 384 }).resize(512, 512).png().toFile(path.join(root, 'icon-512.png'));

  const reference = path.join(brand, 'login-reference.jpg');
  const meta = await sharp(reference).metadata();
  const left = Math.min(500, Math.max(0, (meta.width || 2000) - 2));
  const crop = sharp(reference).extract({ left, top: 0, width: (meta.width || 2000) - left, height: meta.height || 1117 });
  const source = await crop.toBuffer();
  for (const width of [1600, 2400]) {
    await sharp(source).resize({ width, withoutEnlargement: false }).avif({ quality: 68 }).toFile(path.join(brand, `login-hero-${width}.avif`));
    await sharp(source).resize({ width, withoutEnlargement: false }).webp({ quality: 82 }).toFile(path.join(brand, `login-hero-${width}.webp`));
  }
  await sharp(source).resize({ width: 1600, withoutEnlargement: false }).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(brand, 'login-hero-1600.jpg'));
}

main().catch((error) => { console.error(error); process.exit(1); });
