/** Små farvehjælpere uden afhængigheder – bruges af SVG-tegning på både TV og telefon. */

function parse(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** amount > 0 lysner mod hvid, < 0 mørkner mod sort. [-1, 1]. */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = parse(hex);
  const target = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  return toHex(r + (target - r) * t, g + (target - g) * t, b + (target - b) * t);
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export function hexToNumber(hex: string): number {
  const [r, g, b] = parse(hex);
  return (r << 16) | (g << 8) | b;
}

/** Relativ lysstyrke 0–1 – til at vælge lys/mørk tekst oven på en farve. */
export function luminance(hex: string): number {
  const [r, g, b] = parse(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
