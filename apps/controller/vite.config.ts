import { defineConfig, type PluginOption } from 'vite';

const serverUrl = process.env.SAMI_SERVER_URL ?? 'http://localhost:3000';
const https = process.env.HTTPS === '1';

export default defineConfig(async () => ({
  // I produktion serveres telefon-appen af spilserveren under /play/.
  base: process.env.NODE_ENV === 'production' ? '/play/' : '/',
  plugins: [https ? ((await import('@vitejs/plugin-basic-ssl')).default() as PluginOption) : null],
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    proxy: { '/ws': { target: serverUrl, ws: true } },
  },
}));
