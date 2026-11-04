// PWA 아이콘 PNG 생성: node scripts/render-icons.mjs  (Playwright + Chromium 필요)
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

// 전역 설치된 playwright 도 찾을 수 있도록 CJS require 사용
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const targets = [
  { src: 'public/icon.svg', out: 'public/icons/icon-192.png', size: 192 },
  { src: 'public/icon.svg', out: 'public/icons/icon-512.png', size: 512 },
  { src: 'scripts/icon-maskable.svg', out: 'public/icons/icon-maskable-512.png', size: 512 },
  { src: 'scripts/icon-maskable.svg', out: 'public/icons/apple-touch-icon.png', size: 180 },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const t of targets) {
  const svg = await readFile(t.src, 'utf8');
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${t.size}" height="${t.size}" `)}</body></html>`,
  );
  const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: t.size, height: t.size } });
  await writeFile(t.out, png);
  console.log('wrote', t.out);
}
await browser.close();
