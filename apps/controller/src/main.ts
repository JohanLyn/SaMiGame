import '@fontsource/lilita-one/400.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import './style.css';
import {
  AVATAR_PRESETS,
  INPUT_HZ,
  isValidRoomCode,
  normalizeRoomCode,
  parseAvatar,
  renderAvatarSvg,
  svgDataUri,
  type Avatar,
  type ControllerLayout,
  type ControllerToServer,
  type ErrorReason,
  type ServerToController,
} from '@samigame/shared';
import { ReconnectingSocket, defaultSocketUrl } from '@samigame/shared/browser';
import {
  renderButtons,
  renderChoice,
  renderInfo,
  renderMash,
  renderMic,
  renderReady,
  renderResult,
  renderStick,
  renderTilt,
  renderTouchpad,
  renderWait,
  type Cleanup,
} from './layouts/basic';
import { renderLobby } from './layouts/lobby';
import { loadName, loadSession, saveName, saveSession } from './session';
import { input, resetInput, type Ctx } from './state';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const joinScreen = $('join-screen');
const gameScreen = $('game-screen');
const form = $<HTMLFormElement>('join-form');
const codeInput = $<HTMLInputElement>('code-input');
const nameInput = $<HTMLInputElement>('name-input');
const joinButton = $<HTMLButtonElement>('join-button');
const joinError = $('join-error');
const layoutRoot = $('layout');
const barAvatar = $<HTMLImageElement>('bar-avatar');
const barName = $('bar-name');
const barStatus = $('bar-status');
const overlay = $('overlay');
const overlayText = $('overlay-text');

const AVATAR_KEY = 'sami.avatar';

const ERROR_TEXT: Record<ErrorReason, string> = {
  room_not_found: 'Det rum findes ikke. Tjek koden på TV’et.',
  room_full: 'Rummet er fyldt op (max 4 spillere).',
  bad_message: 'Noget gik galt. Prøv igen.',
};

function loadAvatar(): Avatar {
  try {
    const a = parseAvatar(JSON.parse(localStorage.getItem(AVATAR_KEY) ?? 'null'));
    if (a) return a;
  } catch {
    // ignorer
  }
  return { ...AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)].avatar };
}

function saveAvatar(a: Avatar): void {
  try {
    localStorage.setItem(AVATAR_KEY, JSON.stringify(a));
  } catch {
    // ignorer
  }
}

const socket = new ReconnectingSocket<ServerToController, ControllerToServer>(defaultSocketUrl());

let target: { code: string; name: string } | null = null;
let joined = false;
let hostConnected = true;
let currentLayout: ControllerLayout | null = null;
let currentKey = '';
let cleanup: Cleanup = () => {};

const ctx: Ctx = {
  input,
  tap(choice?: number) {
    input.taps++;
    if (choice !== undefined) input.choice = choice;
    sendInput(true);
  },
  action(name, value) {
    socket.send({ t: 'action', name, value });
  },
  profile(avatar, name) {
    ctx.player.avatar = avatar;
    ctx.player.name = name;
    saveAvatar(avatar);
    saveName(name);
    updateBar();
    socket.send({ t: 'profile', avatar, name });
  },
  player: { name: loadName(), color: '#ffcf3a', avatar: loadAvatar(), slot: 0 },
  vibrate(ms) {
    navigator.vibrate?.(ms);
  },
};

// ---------------------------------------------------------------------------
// Join

const urlCode = normalizeRoomCode(new URLSearchParams(location.search).get('room') ?? '');
const saved = loadSession();
codeInput.value = urlCode || saved?.code || '';
nameInput.value = loadName();

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const code = normalizeRoomCode(codeInput.value);
  if (!isValidRoomCode(code)) {
    joinError.textContent = 'Koden er 4 bogstaver – se TV’et.';
    return;
  }
  const name = nameInput.value.trim();
  saveName(name);
  ctx.player.name = name;
  joinError.textContent = '';
  joinButton.disabled = true;
  target = { code, name };
  sendJoin();
  void enterFullscreen();
});

function sendJoin(): void {
  if (!target) return;
  const session = loadSession();
  const playerId = session?.code === target.code ? session.playerId : undefined;
  socket.send({ t: 'join', code: target.code, name: target.name, playerId, avatar: ctx.player.avatar });
}

function leaveRoom(message: string): void {
  target = null;
  joined = false;
  saveSession(null);
  joinButton.disabled = false;
  joinError.textContent = message;
  gameScreen.hidden = true;
  joinScreen.hidden = false;
  overlay.hidden = true;
  setLayout(null);
}

// ---------------------------------------------------------------------------
// Netværk

socket.onOpen = () => sendJoin();
socket.onStatus = (connected) => {
  if (!connected) joined = false;
  updateOverlay(connected);
};

socket.onMessage = (msg) => {
  switch (msg.t) {
    case 'joined':
      joined = true;
      saveSession({ code: msg.code, playerId: msg.playerId });
      ctx.player.name = msg.name;
      ctx.player.color = msg.color;
      ctx.player.slot = msg.slot;
      document.documentElement.style.setProperty('--player', msg.color);
      socket.send({ t: 'profile', avatar: ctx.player.avatar, name: msg.name });
      showGame();
      break;
    case 'error':
      leaveRoom(ERROR_TEXT[msg.reason]);
      break;
    case 'host_status':
      hostConnected = msg.connected;
      updateOverlay(socket.connected);
      break;
    case 'room_closed':
      leaveRoom('TV’et lukkede rummet. Scan den nye QR-kode.');
      break;
    case 'vibrate':
      ctx.vibrate(msg.ms);
      break;
    case 'layout':
      setLayout(msg.layout);
      break;
  }
};

function updateOverlay(socketConnected: boolean): void {
  if (!target) return;
  let text = '';
  if (!socketConnected) text = 'Forbinder igen…';
  else if (joined && !hostConnected) text = 'Venter på TV’et…';
  overlay.hidden = text === '';
  overlayText.textContent = text;
  barStatus.textContent = joined && hostConnected ? `Rum ${target.code}` : '';
}

function updateBar(): void {
  barName.textContent = ctx.player.name;
  barAvatar.src = svgDataUri(renderAvatarSvg(ctx.player.avatar, { idPrefix: 'b' }));
}

function showGame(): void {
  joinScreen.hidden = true;
  gameScreen.hidden = false;
  updateBar();
  updateOverlay(socket.connected);
  ctx.vibrate(30);
  void keepAwake();
  if (!currentLayout) setLayout({ kind: 'wait', title: 'Du er med!', message: 'Kig på TV’et', emoji: '🎉' });
}

// ---------------------------------------------------------------------------
// Layouts

const RENDERERS: { [K in ControllerLayout['kind']]: (root: HTMLElement, l: Extract<ControllerLayout, { kind: K }>, ctx: Ctx) => Cleanup } = {
  wait: renderWait,
  lobby: renderLobby,
  ready: renderReady,
  stick: renderStick,
  buttons: renderButtons,
  mash: renderMash,
  touchpad: renderTouchpad,
  tilt: renderTilt,
  mic: renderMic,
  info: renderInfo,
  choice: renderChoice,
  result: renderResult,
};

function setLayout(layout: ControllerLayout | null): void {
  const key = JSON.stringify(layout);
  if (key === currentKey) return;
  currentKey = key;
  cleanup();
  cleanup = () => {};
  resetInput();
  sendInput(true);
  currentLayout = layout;
  layoutRoot.innerHTML = '';
  layoutRoot.className = layout ? `layout-${layout.kind}` : '';
  if (!layout) return;
  document.documentElement.style.setProperty('--accent', layout.accent ?? 'var(--player)');
  const page = document.createElement('div');
  page.className = 'page enter';
  layoutRoot.append(page);
  const render = RENDERERS[layout.kind] as (root: HTMLElement, l: ControllerLayout, ctx: Ctx) => Cleanup;
  try {
    cleanup = render(page, layout, ctx);
  } catch (err) {
    console.error('Layout fejlede', layout, err);
  }
}

// ---------------------------------------------------------------------------
// Input → TV (højst INPUT_HZ gange i sekundet, kun ved ændringer)

let lastSent = '';
let lastSendTime = 0;
function sendInput(force = false): void {
  if (!joined) return;
  const key = `${input.x},${input.y},${input.a},${input.b},${input.taps},${input.choice},${input.px.toFixed(3)},${input.py.toFixed(3)},${input.level.toFixed(2)}`;
  if (key === lastSent) return;
  const now = performance.now();
  if (!force && now - lastSendTime < 1000 / INPUT_HZ) return;
  lastSent = key;
  lastSendTime = now;
  socket.send({ t: 'input', input: { ...input } });
}
setInterval(() => sendInput(), 1000 / INPUT_HZ);

// ---------------------------------------------------------------------------
// Telefon-ting

async function enterFullscreen(): Promise<void> {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
  } catch {
    // Ikke understøttet (fx iPhone).
  }
}

let wakeLock: { release(): Promise<void> } | null = null;
async function keepAwake(): Promise<void> {
  try {
    const nav = navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } };
    wakeLock ??= (await nav.wakeLock?.request('screen')) ?? null;
  } catch {
    // ignorer
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && joined) {
    wakeLock = null;
    void keepAwake();
  }
});

// Kom automatisk tilbage i rummet efter refresh, hvis QR-koden peger på samme rum.
if (saved && (!urlCode || urlCode === saved.code)) {
  target = { code: saved.code, name: nameInput.value.trim() };
  joinButton.disabled = true;
}

socket.connect();
