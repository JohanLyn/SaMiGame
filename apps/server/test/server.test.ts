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

    phone.send({ t: 'input', input: { x: 0.5, y: -0.25, a: true, b: false, taps: 3 } });
    expect(await tv.next('input')).toMatchObject({ t: 'input', slot: 0, input: { x: 0.5, y: -0.25, a: true, b: false, taps: 3 } });

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

describe('statiske filer', () => {
  it('serverer TV- og telefon-apps og blokerer path traversal', async () => {
    const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const root = mkdtempSync(join(tmpdir(), 'sami-'));
    mkdirSync(join(root, 'host'));
    mkdirSync(join(root, 'ctrl'));
    writeFileSync(join(root, 'host', 'index.html'), 'TV');
    writeFileSync(join(root, 'ctrl', 'index.html'), 'TELEFON');
    writeFileSync(join(root, 'secret.txt'), 'hemmelig');
    server = createGameServer({
      staticMounts: [
        { prefix: '/play/', dir: join(root, 'ctrl') },
        { prefix: '/', dir: join(root, 'host') },
      ],
    });
    await new Promise<void>((resolve) => server!.http.listen(0, '127.0.0.1', resolve));
    const { port } = server.http.address() as AddressInfo;
    const get = (path: string) => fetch(`http://127.0.0.1:${port}${path}`, { redirect: 'manual' });
    expect(await (await get('/')).text()).toBe('TV');
    expect(await (await get('/play/?room=ABCD')).text()).toBe('TELEFON');
    expect((await get('/play')).status).toBe(301);
    expect(await (await get('/noget/andet')).text()).toBe('TV');
    expect(await (await get('/..%2fsecret.txt')).text()).not.toBe('hemmelig');
  });
});
