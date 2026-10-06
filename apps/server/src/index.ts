import { lanAddresses } from './lan';
import { createGameServer } from './server';

const port = Number(process.env.PORT ?? 3000);
const server = createGameServer({ lanAddresses });

server.http.listen(port, () => {
  console.log(`SaMi Party-server kører på port ${port} (LAN: ${lanAddresses().join(', ') || 'ingen'})`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void server.close().then(() => process.exit(0));
  });
}
