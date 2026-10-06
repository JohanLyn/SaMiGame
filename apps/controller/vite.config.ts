import { defineConfig } from 'vite';

const serverUrl = process.env.SAMI_SERVER_URL ?? 'http://localhost:3000';

export default defineConfig({
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    proxy: { '/ws': { target: serverUrl, ws: true } },
  },
});
