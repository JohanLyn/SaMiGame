// Starter spilserveren, TV-appen og telefon-appen på én gang, med farvede prefixes.
import { spawn } from 'node:child_process';

const apps = [
  { name: 'server', workspace: '@samigame/server', color: 34 },
  { name: 'host  ', workspace: '@samigame/host', color: 35 },
  { name: 'ctrl  ', workspace: '@samigame/controller', color: 32 },
];

const children = apps.map(({ name, workspace, color }) => {
  const child = spawn('npm', ['run', 'dev', '-w', workspace], { stdio: ['ignore', 'pipe', 'pipe'] });
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  for (const stream of [child.stdout, child.stderr]) {
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) process.stdout.write(prefix + line + '\n');
    });
  }
  child.on('exit', (code) => {
    process.stdout.write(`${prefix}stoppede (kode ${code})\n`);
    shutdown(code ?? 1);
  });
  return child;
});

let stopping = false;
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  setTimeout(() => process.exit(code), 500);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
