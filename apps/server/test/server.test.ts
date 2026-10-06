import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { createGameServer, type GameServer } from '../src/server';

let server: GameServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

function connect(port: number) {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const inbox: any[] = [];
  const waiters: { t: string; resolve: (msg: any) => void }[] = [];
  socket.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    const i = waiters.findIndex((w) => w.t === msg.t);
    if (i !== -1) waiters.splice(i, 1)[0].resolve(msg);
    else inbox.push(msg);
  });
  return {
    opened: new Promise<void>((resolve) => socket.once('open', () => resolve())),
    send: (msg: unknown) => socket.send(typeof msg === 'string' ? msg : JSON.stringify(msg)),
    next: (t: string) =>
      new Promise<any>((resolve) => {
        const i = inbox.findIndex((m) => m.t === t);
        if (i !== -1) resolve(inbox.splice(i, 1)[0]);
        else waiters.push({ t, resolve });
      }),
    close: () => socket.close(),
  };
}

describe('WebSocket-server', () => {
  it('forbinder TV og telefon og relayer input', async () => {
    server = createGameServer();
    await new Promise<void>((resolve) => server!.http.listen(0, '127.0.0.1', resolve));
    const { port } = server.http.address() as AddressInfo;

    const tv = connect(port);
    await tv.opened;
    tv.send({ t: 'host_create' });
    const { code } = await tv.next('room_created');

    const phone = connect(port);
    await phone.opened;
    phone.send({ t: 'join', code: code.toLowerCase(), name: 'Bent' });
    expect(await phone.next('joined')).toMatchObject({ slot: 0, name: 'Bent' });
    expect(await tv.next('player_joined')).toMatchObject({ player: { slot: 0, name: 'Bent' } });

    phone.send({ t: 'input', input: { x: 0.5, y: -0.25, a: true, b: false } });
    expect(await tv.next('input')).toEqual({ t: 'input', slot: 0, input: { x: 0.5, y: -0.25, a: true, b: false } });

    phone.send('ikke json');
    expect(await phone.next('error')).toEqual({ t: 'error', reason: 'bad_message' });

    phone.close();
    expect(await tv.next('player_connection')).toEqual({ t: 'player_connection', slot: 0, connected: false });
    tv.close();
  });

  it('svarer på /health', async () => {
    server = createGameServer();
    await new Promise<void>((resolve) => server!.http.listen(0, '127.0.0.1', resolve));
    const { port } = server.http.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(await res.json()).toEqual({ ok: true, rooms: 0 });
  });
});
