// Zero-dependency static file server for the agent-output reports repo.
// Railway injects PORT; we must bind 0.0.0.0 (127.0.0.1 reads as a failed deploy).
import { createServer } from 'node:http';
import { readFile, stat, readdir } from 'node:fs/promises';
import { join, extname, resolve, sep, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';
const START = Date.now();

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Resolve a URL path inside ROOT, or null if it escapes (path traversal guard). */
function safeResolve(urlPath) {
  let p;
  try {
    p = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null; // malformed percent-encoding
  }
  if (p.includes('\0')) return null;
  const abs = resolve(ROOT, '.' + p);
  if (abs !== ROOT && !abs.startsWith(ROOT + sep)) return null;
  return abs;
}

function send(res, code, body, headers = {}) {
  res.writeHead(code, { 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(body);
}

function dirListing(absPath, urlPath) {
  return readdir(absPath, { withFileTypes: true }).then((entries) => {
    const base = urlPath.endsWith('/') ? urlPath : urlPath + '/';
    const items = entries
      .filter((e) => !e.name.startsWith('.'))
      .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
      .map((e) => {
        const label = esc(e.name) + (e.isDirectory() ? '/' : '');
        const href = esc(base + e.name) + (e.isDirectory() ? '/' : '');
        return `<li class="${e.isDirectory() ? 'dir' : 'file'}"><a href="${href}">${label}</a></li>`;
      })
      .join('\n');

    const parent = urlPath === '/' ? '' :
      `<li class="up"><a href="${esc(base.replace(/[^/]+\/$/, ''))}">../</a></li>`;

    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(urlPath)} — agent-output</title>
<style>
  :root{color-scheme:light dark}
  body{margin:0;padding:48px 24px;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#f7f8fa;color:#141a21}
  @media(prefers-color-scheme:dark){body{background:#0f1216;color:#e8edf3}a{color:#3fd8a8}li{border-color:#2b333d}code{background:#1d232b;border-color:#2b333d;color:#9aa7b5}}
  main{max-width:820px;margin:0 auto}
  h1{font-size:20px;letter-spacing:-.01em;margin:0 0 4px}
  p.sub{color:#5a6673;margin:0 0 24px;font-size:14px}
  ul{list-style:none;padding:0;margin:0;border:1px solid #d8dee7;border-radius:12px;overflow:hidden;background:#fff}
  @media(prefers-color-scheme:dark){ul{background:#161b21;border-color:#2b333d}}
  li{border-bottom:1px solid #d8dee7}
  li:last-child{border-bottom:none}
  li a{display:block;padding:12px 18px;text-decoration:none;color:inherit}
  li a:hover{background:#eef1f5}
  @media(prefers-color-scheme:dark){li a:hover{background:#1d232b}}
  li.dir a{font-weight:650}
  li.up a{color:#5a6673;font-size:14px}
  code{font:13px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:#eef1f5;padding:2px 6px;border-radius:6px}
</style></head>
<body><main>
<h1>agent-output</h1>
<p class="sub">Research and analysis deliverables — <code>${esc(urlPath)}</code></p>
<ul>
${parent}
${items || '<li class="file"><a>— empty —</a></li>'}
</ul>
</main></body></html>`;
  });
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method Not Allowed', { 'Content-Type': 'text/plain', Allow: 'GET, HEAD' });
  }

  const urlPath = (req.url || '/').split('?')[0];

  // Liveness probe — cheapest possible response, no filesystem touch.
  if (urlPath === '/healthz') {
    return send(res, 200, JSON.stringify({ status: 'ok', uptime_s: Math.round((Date.now() - START) / 1000) }),
      { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  }

  const abs = safeResolve(urlPath);
  if (!abs) return send(res, 400, 'Bad Request', { 'Content-Type': 'text/plain' });

  let info;
  try {
    info = await stat(abs);
  } catch {
    return send(res, 404, '404 — Not Found', { 'Content-Type': 'text/plain; charset=utf-8' });
  }

  if (info.isDirectory()) {
    if (!urlPath.endsWith('/')) {
      // Canonicalise so relative links resolve correctly.
      return send(res, 301, '', { Location: urlPath + '/' });
    }
    const indexPath = join(abs, 'index.html');
    try {
      const s = await stat(indexPath);
      if (s.isFile()) {
        const body = await readFile(indexPath);
        return send(res, 200, body, {
          'Content-Type': TYPES['.html'],
          'Content-Length': body.length,
          'Cache-Control': 'public, max-age=60',
        });
      }
    } catch { /* fall through to listing */ }

    const html = await dirListing(abs, urlPath);
    return send(res, 200, html, {
      'Content-Type': TYPES['.html'],
      'Content-Length': Buffer.byteLength(html),
      'Cache-Control': 'public, max-age=60',
    });
  }

  if (!info.isFile()) {
    return send(res, 404, '404 — Not Found', { 'Content-Type': 'text/plain; charset=utf-8' });
  }

  try {
    const body = await readFile(abs);
    return send(res, 200, body, {
      'Content-Type': TYPES[extname(abs).toLowerCase()] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': 'public, max-age=300',
    });
  } catch {
    return send(res, 500, '500 — Internal Server Error', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`agent-output listening on http://${HOST}:${PORT} (root: ${relative(process.cwd(), ROOT) || '.'})`);
});

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
