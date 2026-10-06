// Renderer et ark med alle figur-presets, hatte, ansigter og udstyr til visuel kontrol.
// Kør: npx tsx scripts/avatar-sheet.ts <out.png>
import { chromium } from '@playwright/test';
import {
  AVATAR_PRESETS, EXTRAS, FACES, HATS, renderAvatarPart, renderAvatarSvg, svgDataUri, type Avatar,
} from '../packages/shared/src/index';

const out = process.argv[2] ?? 'avatar-sheet.png';
const base: Avatar = { skin: '#ffd2b0', shirt: '#3d8bff', pants: '#2b2b44', hat: 'none', face: 'happy', extra: 'none' };
const cell = (svg: string, label: string) =>
  `<figure><img src="${svgDataUri(svg)}"/><figcaption>${label}</figcaption></figure>`;

const rows = [
  AVATAR_PRESETS.map((p) => cell(renderAvatarSvg(p.avatar), p.name)).join('') +
    cell(renderAvatarSvg(AVATAR_PRESETS[0].avatar, { blink: true }), 'blink'),
  HATS.map((h) => cell(renderAvatarSvg({ ...base, hat: h }), h)).join(''),
  FACES.map((f) => cell(renderAvatarSvg({ ...base, face: f }), f)).join('') +
    EXTRAS.map((e) => cell(renderAvatarSvg({ ...base, extra: e }), e)).join(''),
  (['head', 'torso', 'arm', 'leg', 'back'] as const)
    .map((p) => cell(renderAvatarPart({ ...AVATAR_PRESETS[0].avatar }, p), p)).join(''),
];

const html = `<html><body style="margin:0;background:linear-gradient(#2a1f7a,#12103a);font:14px sans-serif;color:#fff">
<style>figure{display:inline-block;margin:6px;text-align:center}img{height:150px;background:#ffffff10;border-radius:8px}</style>
${rows.map((r) => `<div>${r}</div>`).join('')}</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.setContent(html);
await page.waitForTimeout(300);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log('Gemt', out);
