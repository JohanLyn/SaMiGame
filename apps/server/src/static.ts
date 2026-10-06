import { createReadStream, existsSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

export interface StaticMount {
  /** URL-prefix, fx '/play/' eller '/'. */
  prefix: string;
  /** Mappe med byggede filer (index.html). */
  dir: string;
}

/**
 * Serverer de byggede apps (TV på '/', telefon på '/play/'), så hele spillet kører fra én port.
 * Returnerer false hvis anmodningen ikke matchede nogen fil (så kalder man 404).
 */
export function serveStatic(mounts: StaticMount[], req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  const url = new URL(req.url ?? '/', 'http://x');
  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return false;
  }
  if (pathname === '/play') {
    res.writeHead(301, { location: `/play/${url.search}` }).end();
    return true;
  }
  // Længste prefix først ('/play/' før '/').
  for (const mount of [...mounts].sort((a, b) => b.prefix.length - a.prefix.length)) {
    if (!pathname.startsWith(mount.prefix)) continue;
    const root = resolve(mount.dir);
    if (!existsSync(root)) continue;
    const rel = normalize(pathname.slice(mount.prefix.length)).replace(/^([/\\])+/, '');
    let file = resolve(join(root, rel));
    if (file !== root && !file.startsWith(root + sep)) return false; // path traversal
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
    if (!existsSync(file)) continue;
    const ext = extname(file);
    const immutable = file.includes(`${sep}assets${sep}`);
    res.writeHead(200, {
      'content-type': MIME[ext] ?? 'application/octet-stream',
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    if (req.method === 'HEAD') res.end();
    else createReadStream(file).pipe(res);
    return true;
  }
  return false;
}
