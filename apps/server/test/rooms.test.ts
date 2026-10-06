import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ClientToServer, ServerToController, ServerToHost } from '@samigame/shared';
import { RoomManager, type PeerRole } from '../src/rooms';

class FakePeer {
  inbox: (ServerToHost | ServerToController)[] = [];
  role: PeerRole = { kind: 'none' };
  send(msg: ServerToHost | ServerToController) {
    this.inbox.push(msg);
  }
  last() {
    return this.inbox[this.inbox.length - 1];
  }
  ofType<T extends string>(t: T) {
    return this.inbox.filter((m) => m.t === t);
  }
}

function setup() {
  const rooms = new RoomManager({ lanAddresses: () => ['192.168.1.20'], hostGraceMs: 1000 });
  const send = (peer: FakePeer, msg: ClientToServer) => {
    peer.role = rooms.handleMessage(peer, peer.role, msg);
  };
  const disconnect = (peer: FakePeer) => rooms.handleDisconnect(peer, peer.role);

  const host = new FakePeer();
  send(host, { t: 'host_create' });
  const created = host.inbox[0];
  if (created.t !== 'room_created') throw new Error('intet rum');
  return { rooms, send, disconnect, host, code: created.code };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('RoomManager', () => {
  it('opretter et rum med LAN-adresser', () => {
    const { host, code, rooms } = setup();
    expect(host.inbox[0]).toEqual({ t: 'room_created', code, lanAddresses: ['192.168.1.20'] });
    expect(rooms.roomCount).toBe(1);
  });

  it('giver spillere hver sin plads og farve, og fortæller TV’et det', () => {
    const { host, code, send } = setup();
    const a = new FakePeer();
    const b = new FakePeer();
    send(a, { t: 'join', code, name: 'Agurk' });
    send(b, { t: 'join', code, name: '' });

    expect(a.inbox[0]).toMatchObject({ t: 'joined', slot: 0, name: 'Agurk', color: '#ff4d4d' });
    expect(b.inbox[0]).toMatchObject({ t: 'joined', slot: 1, name: 'Spiller 2' });
    expect(a.inbox[1]).toEqual({ t: 'host_status', connected: true });
    expect(host.ofType('player_joined')).toHaveLength(2);
  });

  it('afviser ukendte rum og en femte spiller', () => {
    const { code, send } = setup();
    const lost = new FakePeer();
    send(lost, { t: 'join', code: 'ZZZZ', name: 'x' });
    expect(lost.last()).toEqual({ t: 'error', reason: 'room_not_found' });

    for (let i = 0; i < 4; i++) send(new FakePeer(), { t: 'join', code, name: `p${i}` });
    const fifth = new FakePeer();
    send(fifth, { t: 'join', code, name: 'for mange' });
    expect(fifth.last()).toEqual({ t: 'error', reason: 'room_full' });
    expect(fifth.role).toEqual({ kind: 'none' });
  });

  it('videresender input til TV’et med spillerens plads', () => {
    const { host, code, send } = setup();
    const a = new FakePeer();
    const b = new FakePeer();
    send(a, { t: 'join', code, name: 'a' });
    send(b, { t: 'join', code, name: 'b' });
    send(b, { t: 'input', input: { x: 1, y: 0, a: true, b: false } });
    expect(host.last()).toEqual({ t: 'input', slot: 1, input: { x: 1, y: 0, a: true, b: false } });
  });

  it('ignorerer input fra forbindelser der ikke har joinet', () => {
    const { host, send } = setup();
    const before = host.inbox.length;
    send(new FakePeer(), { t: 'input', input: { x: 1, y: 1, a: false, b: false } });
    expect(host.inbox.length).toBe(before);
  });

  it('lader TV’et sende vibration til én telefon', () => {
    const { host, code, send } = setup();
    const a = new FakePeer();
    send(a, { t: 'join', code, name: 'a' });
    send(host, { t: 'to_player', slot: 0, msg: { t: 'vibrate', ms: 40 } });
    expect(a.last()).toEqual({ t: 'vibrate', ms: 40 });
  });

  it('giver en genforbundet telefon samme plads', () => {
    const { host, code, send, disconnect } = setup();
    const a = new FakePeer();
    send(a, { t: 'join', code, name: 'Mormor' });
    const joined = a.inbox[0];
    if (joined.t !== 'joined') throw new Error();

    disconnect(a);
    expect(host.last()).toEqual({ t: 'player_connection', slot: 0, connected: false });

    const again = new FakePeer();
    send(again, { t: 'join', code, name: '', playerId: joined.playerId });
    expect(again.inbox[0]).toMatchObject({ t: 'joined', slot: 0, name: 'Mormor', playerId: joined.playerId });
    expect(host.last()).toMatchObject({ t: 'player_joined', reconnected: true, player: { slot: 0, connected: true } });
  });

  it('ignorerer en gammel forbindelses disconnect efter genforbindelse', () => {
    const { host, code, send, disconnect } = setup();
    const a = new FakePeer();
    send(a, { t: 'join', code, name: 'a' });
    const joined = a.inbox[0];
    if (joined.t !== 'joined') throw new Error();
    const again = new FakePeer();
    send(again, { t: 'join', code, name: 'a', playerId: joined.playerId });
    const before = host.inbox.length;
    disconnect(a);
    expect(host.inbox.length).toBe(before);
  });

  it('lader en ny spiller overtage en afbrudt plads når rummet er fuldt', () => {
    const { code, send, disconnect } = setup();
    const peers = [0, 1, 2, 3].map(() => new FakePeer());
    peers.forEach((p, i) => send(p, { t: 'join', code, name: `p${i}` }));
    disconnect(peers[2]);
    const newcomer = new FakePeer();
    send(newcomer, { t: 'join', code, name: 'Ny' });
    expect(newcomer.inbox[0]).toMatchObject({ t: 'joined', slot: 2, name: 'Ny' });
  });

  it('holder rummet åbent et stykke tid efter TV’et forsvinder', () => {
    vi.useFakeTimers();
    const { host, code, send, disconnect, rooms } = setup();
    const a = new FakePeer();
    send(a, { t: 'join', code, name: 'a' });

    disconnect(host);
    expect(a.last()).toEqual({ t: 'host_status', connected: false });

    const tv = new FakePeer();
    send(tv, { t: 'host_resume', code });
    expect(tv.inbox[0]).toMatchObject({ t: 'room_resumed', code, players: [{ slot: 0, name: 'a', connected: true }] });
    expect(a.last()).toEqual({ t: 'host_status', connected: true });

    vi.advanceTimersByTime(5000);
    expect(rooms.roomCount).toBe(1);
  });

  it('lukker rummet når TV’et ikke kommer tilbage', () => {
    vi.useFakeTimers();
    const { host, code, send, disconnect, rooms } = setup();
    const a = new FakePeer();
    send(a, { t: 'join', code, name: 'a' });
    disconnect(host);
    vi.advanceTimersByTime(1000);
    expect(a.last()).toEqual({ t: 'room_closed' });
    expect(rooms.roomCount).toBe(0);
  });

  it('opretter et nyt rum hvis det gamle ikke kan genoptages', () => {
    const { send } = setup();
    const tv = new FakePeer();
    send(tv, { t: 'host_resume', code: 'QQQQ' });
    expect(tv.inbox[0].t).toBe('room_created');
  });
});
