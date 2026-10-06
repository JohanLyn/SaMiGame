import { describe, expect, it } from 'vitest';
import { generateRoomCode, isValidRoomCode, normalizeRoomCode } from '../src';

describe('rumkoder', () => {
  it('genererer gyldige koder', () => {
    for (let i = 0; i < 200; i++) {
      expect(isValidRoomCode(generateRoomCode())).toBe(true);
    }
  });

  it('bruger den givne tilfældighedskilde', () => {
    expect(generateRoomCode(() => 0)).toBe('AAAA');
    expect(generateRoomCode(() => 0.9999)).toBe('ZZZZ');
  });

  it('normaliserer og afviser ugyldige koder', () => {
    expect(normalizeRoomCode('  abcd ')).toBe('ABCD');
    expect(isValidRoomCode('ABC')).toBe(false);
    expect(isValidRoomCode('ABCO')).toBe(false);
    expect(isValidRoomCode('ab12')).toBe(false);
  });
});
