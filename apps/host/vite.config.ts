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
    // Screenshot-værktøjet slår HMR fra, så andres filændringer ikke genindlæser siden midt i en kørsel.
    hmr: process.env.NO_HMR ? false : undefined,
  },
  build: {
    chunkSizeWarningLimit: 2500,
    // Demoen er én selvstændig HTML-fil, så speakerens lydklip lægges direkte ind i koden.
    assetsInlineLimit: process.env.VITE_DEMO ? (file: string) => (file.endsWith('.mp3') ? true : undefined) : undefined,
  },
}));
