import Phaser from 'phaser';
import { INK } from '@samigame/shared';

/**
 * SVG → Phaser-tekstur. Al grafik i spillet tegnes som SVG i kode (se docs/STYLE.md).
 *
 * - I `preload()`: `loadSvg(this, key, svg, w, h)` (Phaser venter selv på den).
 * - Senere (fx når en spiller skifter avatar): `await addSvg(scene, key, svg, w, h)`.
 *
 * `w`/`h` er den størrelse teksturen rasteriseres i (i spillets 1920×1080-koordinater).
 * Tegn i et viewBox og lad w/h styre opløsningen.
 */
export function loadSvg(scene: Phaser.Scene, key: string, svg: string, w: number, h: number): void {
  if (scene.textures.exists(key)) return;
  scene.load.svg(key, svgBase64(svg), { width: Math.round(w), height: Math.round(h) });
}

/** Sæt rod-elementets width/height, så billedet rasteriseres i den ønskede opløsning. */
function withSize(svg: string, w: number, h: number): string {
  return svg.replace(/<svg([^>]*?)\swidth="[^"]*"([^>]*?)\sheight="[^"]*"/, `<svg$1 width="${w}"$2 height="${h}"`);
}

/** Phaser's loader kræver base64 i data-URI'er. */
export function svgBase64(svg: string): string {
  // Eksplicit UTF-8-header, så Æ/Ø/Å i <text> ikke bliver forvansket.
  if (!svg.startsWith('<?xml')) svg = `<?xml version="1.0" encoding="UTF-8"?>${svg}`;
  const bytes = new TextEncoder().encode(svg);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return `data:image/svg+xml;charset=utf-8;base64,${btoa(bin)}`;
}

const pending = new Map<string, Promise<string>>();

export function addSvg(scene: Phaser.Scene, key: string, svg: string, w: number, h: number): Promise<string> {
  const textures = scene.textures;
  if (textures.exists(key)) return Promise.resolve(key);
  const existing = pending.get(key);
  if (existing) return existing;

  const promise = new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (!textures.exists(key)) textures.addImage(key, img);
      pending.delete(key);
      resolve(key);
    };
    img.onerror = () => {
      pending.delete(key);
      reject(new Error(`Kunne ikke tegne SVG ${key}`));
    };
    img.src = svgBase64(withSize(svg, Math.round(w), Math.round(h)));
  });
  pending.set(key, promise);
  return promise;
}

/** Pak et SVG-indhold ind i et dokument med viewBox 0 0 w h. */
export function svgDoc(w: number, h: number, body: string, defs = ''): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;
}

/** Standard-kontur: `stroke="#1a1446" stroke-width=... stroke-linejoin="round"`. */
export function ink(width = 6): string {
  return `stroke="${INK}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"`;
}

export function linear(id: string, top: string, bottom: string, horizontal = false): string {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="${horizontal ? 1 : 0}" y2="${horizontal ? 0 : 1}"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`;
}

export function radial(id: string, inner: string, outer: string): string {
  return `<radialGradient id="${id}" cx="0.4" cy="0.35" r="0.75"><stop offset="0" stop-color="${inner}"/><stop offset="1" stop-color="${outer}"/></radialGradient>`;
}

/** Et par søde øjne centreret om (cx, cy). `look` = pupil-forskydning. */
export function eyes(cx: number, cy: number, spacing = 26, r = 11, look: [number, number] = [2, 2]): string {
  const eye = (x: number) =>
    `<ellipse cx="${x}" cy="${cy}" rx="${r}" ry="${r * 1.15}" fill="#fff" ${ink(Math.max(3, r * 0.35))}/>` +
    `<circle cx="${x + look[0]}" cy="${cy + look[1]}" r="${r * 0.55}" fill="${INK}"/>` +
    `<circle cx="${x + look[0] + r * 0.25}" cy="${cy + look[1] - r * 0.3}" r="${r * 0.18}" fill="#fff"/>`;
  return eye(cx - spacing / 2) + eye(cx + spacing / 2);
}

/** Hvid highlight-pille. */
export function shine(x: number, y: number, w: number, h: number, opacity = 0.4): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#fff" opacity="${opacity}"/>`;
}
