export const MAX_PLAYERS = 4;

/** Hvor ofte telefonerne sender input (gange pr. sekund). */
export const INPUT_HZ = 30;

/** Hvor længe et rum overlever, efter at TV'et har mistet forbindelsen. */
export const HOST_GRACE_MS = 20_000;

export const MAX_NAME_LENGTH = 12;

/** Udelader let forvekslelige bogstaver (I, O) så koden er nem at læse op. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const ROOM_CODE_LENGTH = 4;

export interface PlayerColor {
  name: string;
  hex: string;
}

export const PLAYER_COLORS: readonly PlayerColor[] = [
  { name: 'Rød', hex: '#ff4d4d' },
  { name: 'Blå', hex: '#3d8bff' },
  { name: 'Grøn', hex: '#3ccf5a' },
  { name: 'Gul', hex: '#ffc928' },
];
