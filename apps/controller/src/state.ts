import { NEUTRAL_INPUT, type ActionValue, type Avatar, type ControllerInput } from '@samigame/shared';

/** Telefonens fælles tilstand, som layouts læser og skriver i. */
export interface Ctx {
  /** Input der sendes til TV'et ~30 gange i sekundet (når det ændrer sig). */
  input: ControllerInput;
  /** Tæl et knaptryk (sætter evt. choice). */
  tap(choice?: number): void;
  /** Send en handling til TV'et (fx 'ready', 'start'). */
  action(name: string, value: ActionValue): void;
  /** Send ny avatar/navn til TV'et. */
  profile(avatar: Avatar, name: string): void;
  player: { name: string; color: string; avatar: Avatar; slot: number };
  vibrate(ms: number): void;
}

export const input: ControllerInput = { ...NEUTRAL_INPUT };

export function resetInput(): void {
  const taps = input.taps;
  Object.assign(input, NEUTRAL_INPUT, { taps });
}

/** Lille DOM-hjælper: h('div.klasse', { ...attrs }, ...børn). */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: `${K}${string}`,
  attrs: Record<string, string | number | boolean | ((e: Event) => void)> | null = null,
  ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name as K);
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (typeof v === 'function') el.addEventListener(k.replace(/^on/, ''), v as EventListener);
    else if (k === 'style') el.setAttribute('style', String(v));
    else if (typeof v === 'boolean') {
      if (v) el.setAttribute(k, '');
    } else el.setAttribute(k, String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}
