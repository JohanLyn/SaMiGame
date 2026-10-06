import { fileURLToPath } from 'node:url';
import { lanAddresses } from './lan';
import { createGameServer } from './server';

const port = Number(process.env.PORT ?? 3000);
const apps = fileURLToPath(new URL('../../', import.meta.url));
// Byggede apps (npm run build) serveres herfra: TV på '/', telefon på '/play/'.
const server = createGameServer({
  lanAddresses,
  staticMounts: [
    { prefix: '/play/', dir: `${apps}controller/dist` },
    { prefix: '/', dir: `${apps}host/dist` },
  ],
});

server.http.listen(port, () => {
  console.log(`SaMi Party-server kører på port ${port} (LAN: ${lanAddresses().join(', ') || 'ingen'})`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void server.close().then(() => process.exit(0));
  });
}
