import { createServer, type Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { parseClientMessage } from '@samigame/shared';
import { RoomManager, type PeerRole, type RoomManagerOptions } from './rooms';

const HEARTBEAT_MS = 10_000;

export interface GameServer {
  http: Server;
  rooms: RoomManager;
  close(): Promise<void>;
}

export function createGameServer(options: RoomManagerOptions = {}): GameServer {
  const rooms = new RoomManager(options);
  const http = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, rooms: rooms.roomCount }));
      return;
    }
    res.writeHead(404).end();
  });

  const wss = new WebSocketServer({ server: http, path: '/ws' });
  const alive = new WeakMap<WebSocket, boolean>();

  wss.on('connection', (socket) => {
    let role: PeerRole = { kind: 'none' };
    const peer = {
      send(msg: unknown) {
        if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(msg));
      },
    };

    alive.set(socket, true);
    socket.on('pong', () => alive.set(socket, true));

    socket.on('message', (data) => {
      const msg = parseClientMessage(data.toString());
      if (!msg) {
        peer.send({ t: 'error', reason: 'bad_message' });
        return;
      }
      role = rooms.handleMessage(peer, role, msg);
    });

    socket.on('close', () => rooms.handleDisconnect(peer, role));
  });

  // Telefoner der går i dvale lukker ikke altid forbindelsen pænt – ping dem.
  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (!alive.get(socket)) {
        socket.terminate();
        continue;
      }
      alive.set(socket, false);
      socket.ping();
    }
  }, HEARTBEAT_MS);

  return {
    http,
    rooms,
    close: () =>
      new Promise((resolve) => {
        clearInterval(heartbeat);
        rooms.dispose();
        for (const socket of wss.clients) socket.terminate();
        wss.close();
        http.close(() => resolve());
      }),
  };
}
