import { PLAYER_COLORS, hexToNumber } from '@samigame/shared';

/** Spillets logiske opløsning. Alt placeres i dette koordinatsystem. */
export const W = 1920;
export const H = 1080;

/** Paletten fra docs/STYLE.md. `C` = hex-strenge, `N` = tal til Phaser. */
export const C = {
  ink: '#1a1446',
  night: '#12103a',
  deep: '#2a1f7a',
  sky: '#47b8ff',
  cream: '#fff6e0',
  sun: '#ffcf3a',
  tangerine: '#ff8a2b',
  bubblegum: '#ff5fa2',
  mint: '#3ee6a8',
  grape: '#9b5cff',
  tomato: '#ff4b4b',
} as const;

export const N = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, hexToNumber(v)])) as Record<keyof typeof C, number>;

export const FONT_DISPLAY = '"Lilita One", "Arial Rounded MT Bold", sans-serif';
export const FONT_BODY = 'Nunito, "Trebuchet MS", sans-serif';

export function playerHex(slot: number): string {
  return PLAYER_COLORS[slot % PLAYER_COLORS.length].hex;
}

export function playerColor(slot: number): number {
  return hexToNumber(playerHex(slot));
}

/** Holdfarver til 2v2 og 1v3. */
export const TEAM_HEX = [C.tangerine, C.grape] as const;
export const TEAM_NAMES = ['Hold Orange', 'Hold Lilla'] as const;
