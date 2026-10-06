import { defineConfig, type PluginOption } from 'vite';

const serverUrl = process.env.SAMI_SERVER_URL ?? 'http://localhost:3000';
const https = process.env.HTTPS === '1';

export default defineConfig(async () => ({
  plugins: [https ? ((await import('@vitejs/plugin-basic-ssl')).default() as PluginOption) : null],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: { '/ws': { target: serverUrl, ws: true } },
  },
  build: {
    chunkSizeWarningLimit: 2500,
  },
}));
