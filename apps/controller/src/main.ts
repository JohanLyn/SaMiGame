import './style.css';
import {
  INPUT_HZ,
  isValidRoomCode,
  normalizeRoomCode,
  type ControllerInput,
  type ControllerToServer,
  type ErrorReason,
  type ServerToController,
} from '@samigame/shared';
import { ReconnectingSocket, defaultSocketUrl } from '@samigame/shared/browser';
import { HoldButton, Joystick } from './joystick';
import { loadName, loadSession, saveName, saveSession } from './session';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const joinScreen = $('join-screen');
const padScreen = $('pad-screen');
const form = $<HTMLFormElement>('join-form');
const codeInput = $<HTMLInputElement>('code-input');
const nameInput = $<HTMLInputElement>('name-input');
const joinButton = $<HTMLButtonElement>('join-button');
const joinError = $('join-error');
const badge = $('player-badge');
const statusText = $('status-text');
const overlay = $('overlay');
const overlayText = $('overlay-text');

const ERROR_TEXT: Record<ErrorReason, string> = {
  room_not_found: 'Det rum findes ikke. Tjek koden på TV’et.',
  room_full: 'Rummet er fyldt op (max 4 spillere).',
  bad_message: 'Noget gik galt. Prøv igen.',
};

const socket = new ReconnectingSocket<ServerToController, ControllerToServer>(defaultSocketUrl());

/** Rummet vi er i (eller er ved at joine). null = vis join-skærmen. */
let target: { code: string; name: string } | null = null;
let joined = false;
let hostConnected = true;

// ---- Join ----

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
  socket.send({ t: 'join', code: target.code, name: target.name, playerId });
}

function leaveRoom(message: string): void {
  target = null;
  joined = false;
  saveSession(null);
  joinButton.disabled = false;
  joinError.textContent = message;
  padScreen.hidden = true;
  joinScreen.hidden = false;
  overlay.hidden = true;
}

// ---- Netværk ----

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
      showPad(msg.name, msg.color);
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
      navigator.vibrate?.(msg.ms);
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
  statusText.textContent = joined && hostConnected ? `Rum ${target.code}` : '';
}

function showPad(name: string, color: string): void {
  joinScreen.hidden = true;
  padScreen.hidden = false;
  document.documentElement.style.setProperty('--player', color);
  badge.textContent = name;
  updateOverlay(socket.connected);
  navigator.vibrate?.(30);
  void keepAwake();
}

// ---- Controller ----

const stick = new Joystick($('stick-zone'), $('stick-base'), $('stick-knob'));
const buttonA = new HoldButton($('button-a'), () => sendInputNow());
const buttonB = new HoldButton($('button-b'), () => sendInputNow());

let lastSent: ControllerInput = { x: 0, y: 0, a: false, b: false };

function currentInput(): ControllerInput {
  return { x: stick.x, y: stick.y, a: buttonA.pressed, b: buttonB.pressed };
}

function sendInputNow(): void {
  if (!joined) return;
  const input = currentInput();
  if (input.x === lastSent.x && input.y === lastSent.y && input.a === lastSent.a && input.b === lastSent.b) return;
  lastSent = input;
  socket.send({ t: 'input', input });
}

setInterval(sendInputNow, 1000 / INPUT_HZ);

// ---- Telefon-ting ----

async function enterFullscreen(): Promise<void> {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
  } catch {
    // Ikke understøttet (fx iPhone) – helt fint.
  }
}

let wakeLock: { release(): Promise<void> } | null = null;
async function keepAwake(): Promise<void> {
  try {
    wakeLock ??= await (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock?.request('screen') ?? null;
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
