import {
  MAX_PLAYERS,
  NEUTRAL_INPUT,
  type ActionValue,
  type ControllerInput,
  type ControllerLayout,
  type HostToServer,
  type PlayerInfo,
  type ServerToHost,
} from '@samigame/shared';
import { ReconnectingSocket, defaultSocketUrl } from '@samigame/shared/browser';
import { controllerUrl } from './controllerUrl';
import type { Net } from './types';

const ROOM_KEY = 'sami.hostRoom';

type Listener = () => void;
type ActionListener = (slot: number, name: string, value: ActionValue) => void;

/**
 * TV'ets forbindelse til spilserveren: rumkode, hvem der er med, og hver spillers seneste input.
 */
export class HostSession implements Net {
  code: string | null = null;
  joinUrl: string | null = null;
  connected = false;
  readonly offline = false;
  readonly players: (PlayerInfo | null)[] = Array(MAX_PLAYERS).fill(null);
  readonly inputs: ControllerInput[] = Array.from({ length: MAX_PLAYERS }, () => ({ ...NEUTRAL_INPUT }));

  private readonly socket = new ReconnectingSocket<ServerToHost, HostToServer>(defaultSocketUrl());
  private readonly listeners = new Set<Listener>();
  private readonly actionListeners = new Set<ActionListener>();
  /** Seneste layout pr. plads – sendes igen når en telefon (gen)forbinder. */
  private readonly layouts: (ControllerLayout | null)[] = Array(MAX_PLAYERS).fill(null);

  constructor() {
    this.socket.onOpen = () => {
      const previous = sessionStorage.getItem(ROOM_KEY);
      this.socket.send(previous ? { t: 'host_resume', code: previous } : { t: 'host_create' });
    };
    this.socket.onStatus = (connected) => {
      this.connected = connected;
      this.emit();
    };
    this.socket.onMessage = (msg) => this.handle(msg);
  }

  start(): void {
    this.socket.connect();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onAction(listener: ActionListener): () => void {
    this.actionListeners.add(listener);
    return () => this.actionListeners.delete(listener);
  }

  setLayout(slot: number, layout: ControllerLayout): void {
    const prev = this.layouts[slot];
    if (prev && JSON.stringify(prev) === JSON.stringify(layout)) return;
    this.layouts[slot] = layout;
    if (this.players[slot]?.connected) this.socket.send({ t: 'to_player', slot, msg: { t: 'layout', layout } });
  }

  vibrate(slot: number, ms: number): void {
    if (this.players[slot]?.connected) this.socket.send({ t: 'to_player', slot, msg: { t: 'vibrate', ms } });
  }

  private resendLayout(slot: number): void {
    const layout = this.layouts[slot];
    if (layout) this.socket.send({ t: 'to_player', slot, msg: { t: 'layout', layout } });
  }

  private handle(msg: ServerToHost): void {
    switch (msg.t) {
      case 'room_created':
        this.players.fill(null);
        this.inputs.forEach((input) => Object.assign(input, NEUTRAL_INPUT));
        this.setRoom(msg.code, msg.lanAddresses);
        break;
      case 'room_resumed':
        this.players.fill(null);
        for (const p of msg.players) this.players[p.slot] = p;
        this.setRoom(msg.code, msg.lanAddresses);
        msg.players.forEach((p) => this.resendLayout(p.slot));
        break;
      case 'player_joined':
        this.players[msg.player.slot] = msg.player;
        this.resendLayout(msg.player.slot);
        break;
      case 'player_connection': {
        const player = this.players[msg.slot];
        if (player) player.connected = msg.connected;
        if (!msg.connected) Object.assign(this.inputs[msg.slot], NEUTRAL_INPUT);
        break;
      }
      case 'player_profile': {
        const player = this.players[msg.slot];
        if (player) {
          player.avatar = msg.avatar;
          player.name = msg.name;
        }
        break;
      }
      case 'action':
        for (const listener of this.actionListeners) listener(msg.slot, msg.name, msg.value);
        return;
      case 'input':
        // Input læses hvert frame af scenerne – ingen emit.
        Object.assign(this.inputs[msg.slot], msg.input);
        return;
      case 'error':
        console.warn('Serverfejl:', msg.reason);
        return;
    }
    this.emit();
  }

  private setRoom(code: string, lanAddresses: string[]): void {
    this.code = code;
    this.joinUrl = controllerUrl(code, lanAddresses);
    sessionStorage.setItem(ROOM_KEY, code);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
