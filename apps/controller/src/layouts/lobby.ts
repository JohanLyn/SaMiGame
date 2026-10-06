import {
  AVATAR_PRESETS,
  CLOTH_COLORS,
  EXTRAS,
  FACES,
  HATS,
  SKIN_COLORS,
  renderAvatarSvg,
  sameAvatar,
  svgDataUri,
  type Avatar,
  type ControllerLayout,
} from '@samigame/shared';
import { h, type Ctx } from '../state';
import type { Cleanup } from './basic';

type Lobby = Extract<ControllerLayout, { kind: 'lobby' }>;

const HAT_NAMES: Record<string, string> = {
  none: 'Ingen', party: 'Festhat', crown: 'Krone', cap: 'Kasket', wizard: 'Troldmand', viking: 'Viking', chef: 'Kokkehue',
  propeller: 'Propel', tophat: 'Høj hat', knight: 'Ridderhjelm', bun: 'Knold', gills: 'Gæller', toast: 'Toast', grass: 'Græstop', stem: 'Stilk',
};
const FACE_NAMES: Record<string, string> = {
  happy: 'Glad', grumpy: 'Sur', derp: 'Fjollet', cool: 'Cool', surprised: 'Chokeret', sleepy: 'Søvnig', wink: 'Blink', glasses: 'Briller',
};
const EXTRA_NAMES: Record<string, string> = {
  none: 'Intet', cape: 'Kappe', wings: 'Vinger', backpack: 'Rygsæk', bowtie: 'Butterfly', scarf: 'Halstørklæde', medal: 'Medalje', mustache: 'Overskæg',
};

type Tab = 'presets' | 'hat' | 'face' | 'extra' | 'colors';
let currentTab: Tab = 'presets';

/** Byg-din-Bloks: vælg en figur eller byg din egen. Kaptajnen vælger også antal runder og starter. */
export function renderLobby(root: HTMLElement, l: Lobby, ctx: Ctx): Cleanup {
  let avatar: Avatar = { ...ctx.player.avatar };
  let name = ctx.player.name;

  const preview = h('img.avatar-preview', { alt: 'Din figur' }) as HTMLImageElement;
  const nameInput = h('input.name-edit', { maxlength: 12, value: name, 'aria-label': 'Navn' }) as HTMLInputElement;
  const options = h('div.options');
  const tabs = h('nav.tabs');

  const update = (next: Avatar, send = true) => {
    avatar = next;
    preview.src = svgDataUri(renderAvatarSvg(avatar, { idPrefix: 'p' }));
    preview.classList.remove('wiggle');
    void preview.offsetWidth;
    preview.classList.add('wiggle');
    if (send) ctx.profile(avatar, name);
    drawOptions();
  };

  nameInput.addEventListener('change', () => {
    name = nameInput.value.trim() || name;
    ctx.profile(avatar, name);
  });

  const tabDefs: [Tab, string][] = [
    ['presets', '⭐ Figurer'],
    ['hat', '🎩 Hat'],
    ['face', '😀 Ansigt'],
    ['extra', '🎀 Udstyr'],
    ['colors', '🎨 Farver'],
  ];
  for (const [id, label] of tabDefs) {
    const b = h('button.tab', null, label);
    if (id === currentTab) b.classList.add('active');
    b.addEventListener('click', () => {
      currentTab = id;
      tabs.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      b.classList.add('active');
      drawOptions();
    });
    tabs.append(b);
  }

  function thumb(a: Avatar, label: string, selected: boolean, onPick: () => void): HTMLElement {
    const b = h('button.thumb', null, h('img', { src: svgDataUri(renderAvatarSvg(a, { idPrefix: 't' })), alt: '' }), h('span', null, label));
    if (selected) b.classList.add('selected');
    b.addEventListener('click', () => {
      ctx.vibrate(10);
      onPick();
    });
    return b;
  }

  function swatches(title: string, list: readonly string[], current: string, pick: (c: string) => void): HTMLElement {
    const row = h('div.swatches');
    for (const c of list) {
      const s = h('button.swatch', { style: `background:${c}`, 'aria-label': c });
      if (c === current) s.classList.add('selected');
      s.addEventListener('click', () => pick(c));
      row.append(s);
    }
    return h('div.swatch-group', null, h('h4', null, title), row);
  }

  function drawOptions(): void {
    options.innerHTML = '';
    if (currentTab === 'presets') {
      for (const p of AVATAR_PRESETS) options.append(thumb(p.avatar, p.name, sameAvatar(p.avatar, avatar), () => update({ ...p.avatar })));
    } else if (currentTab === 'hat') {
      for (const hat of HATS) options.append(thumb({ ...avatar, hat }, HAT_NAMES[hat], avatar.hat === hat, () => update({ ...avatar, hat })));
    } else if (currentTab === 'face') {
      for (const face of FACES) options.append(thumb({ ...avatar, face }, FACE_NAMES[face], avatar.face === face, () => update({ ...avatar, face })));
    } else if (currentTab === 'extra') {
      for (const extra of EXTRAS) options.append(thumb({ ...avatar, extra }, EXTRA_NAMES[extra], avatar.extra === extra, () => update({ ...avatar, extra })));
    } else {
      options.append(
        swatches('Hud', SKIN_COLORS, avatar.skin, (skin) => update({ ...avatar, skin })),
        swatches('Trøje', CLOTH_COLORS, avatar.shirt, (shirt) => update({ ...avatar, shirt })),
        swatches('Bukser', CLOTH_COLORS, avatar.pants, (pants) => update({ ...avatar, pants })),
      );
    }
    options.classList.toggle('colors', currentTab === 'colors');
  }

  const cheer = h('button.btn.cheer-btn', null, '🎉 Jubel!');
  cheer.addEventListener('click', () => {
    ctx.action('cheer', true);
    ctx.vibrate(30);
  });

  let captainBox: HTMLElement;
  if (l.captain) {
    const rounds = h('div.rounds');
    for (const r of l.roundOptions) {
      const b = h('button.chip', null, `${r} runder`);
      if (r === l.rounds) b.classList.add('selected');
      b.addEventListener('click', () => ctx.action('rounds', r));
      rounds.append(b);
    }
    const start = h('button.btn.btn-big.start-btn', { disabled: !l.canStart }, '▶ START SPILLET');
    start.addEventListener('click', () => {
      ctx.action('start', true);
      ctx.vibrate(80);
    });
    captainBox = h('div.captain', null, h('p.crown', null, '👑 Du er kaptajn!'), rounds, start);
  } else {
    captainBox = h('div.captain', null, h('p.sub', null, `Venter på at kaptajnen starter… (${l.rounds} runder)`));
  }

  root.append(
    h(
      'div.lobby',
      null,
      h('div.lobby-top', null, h('div.preview-wrap', null, preview), h('div.lobby-side', null, h('label.small', null, 'Navn'), nameInput, cheer)),
      tabs,
      options,
      captainBox,
    ),
  );
  update(avatar, false);
  return () => {};
}
