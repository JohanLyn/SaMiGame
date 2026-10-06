import { describe, expect, it } from 'vitest';
import { parseClientMessage, sanitizeName } from '../src';

describe('parseClientMessage', () => {
  it('afviser ikke-JSON og ukendte typer', () => {
    expect(parseClientMessage('ikke json')).toBeNull();
    expect(parseClientMessage('42')).toBeNull();
    expect(parseClientMessage(JSON.stringify({ t: 'hack' }))).toBeNull();
  });

  it('klemmer joystick-værdier og kræver ægte booleans', () => {
    const msg = parseClientMessage(JSON.stringify({ t: 'input', input: { x: 5, y: -9, a: 'ja', b: true } }));
    expect(msg).toEqual({ t: 'input', input: { x: 1, y: -1, a: false, b: true } });
  });

  it('erstatter ikke-endelige tal med 0', () => {
    const msg = parseClientMessage('{"t":"input","input":{"x":null,"y":"1"}}');
    expect(msg).toEqual({ t: 'input', input: { x: 0, y: 0, a: false, b: false } });
  });

  it('normaliserer rumkoden ved join', () => {
    expect(parseClientMessage(JSON.stringify({ t: 'join', code: 'abcd', name: 'Sami' }))).toEqual({
      t: 'join',
      code: 'ABCD',
      name: 'Sami',
      playerId: undefined,
    });
    expect(parseClientMessage(JSON.stringify({ t: 'join', code: 'nope!', name: 'x' }))).toBeNull();
  });

  it('validerer to_player', () => {
    expect(parseClientMessage(JSON.stringify({ t: 'to_player', slot: 4, msg: { t: 'vibrate', ms: 50 } }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ t: 'to_player', slot: 1, msg: { t: 'vibrate', ms: 99999 } }))).toEqual({
      t: 'to_player',
      slot: 1,
      msg: { t: 'vibrate', ms: 1000 },
    });
  });
});

describe('sanitizeName', () => {
  it('trimmer, forkorter og falder tilbage', () => {
    expect(sanitizeName('  Turbo   Mormor  ', 'X')).toBe('Turbo Mormor');
    expect(sanitizeName('Ridder Agurk den Store', 'X')).toBe('Ridder Agurk');
    expect(sanitizeName('   ', 'Spiller 1')).toBe('Spiller 1');
    expect(sanitizeName(42, 'Spiller 2')).toBe('Spiller 2');
  });
});
