import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.SCOUT_PORT || 5190);

function normBase(raw, protocol) {
  let b = String(raw || '').trim().replace(/\/+$/, '');
  if (!b) throw new Error('baseUrl 不能为空');
  if (protocol === 'anthropic') return b;
  if (/\/(v\d+\w*|openai|anthropic|compatible-mode)$/i.test(b) || b.includes('/api/paas')) return b;
  return b + '/v1';
}

function authHeaders(protocol, key) {
  const k = String(key || '').trim();
  if (protocol === 'anthropic') {
    return { 'x-api-key': k, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' };
  }
  return { authorization: `Bearer ${k}`, 'content-type': 'application/json' };
}

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let buf = '';
    req.setEncoding('utf8');
    req.on('data', (c) => { buf += c; if (buf.length > 1e7) { reject(new Error('body too large')); req.destroy(); } });
    req.on('end', () => resolve(buf));
    req.on('error', reject);
  });

const json = (res, code, obj) => {
  const s = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(s);
};

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    if (req.method === 'POST' && u.pathname === '/api/request') {
      const p = JSON.parse(await readBody(req));
      const base = normBase(p.baseUrl, p.protocol);
      const relPath = String(p.path || '/models').replace(/^\/?/, '/');
      const target = base + relPath;
      if (!/^https?:/i.test(target)) return json(res, 400, { error: '非法目标地址: ' + target });
      let upstream;
      try {
        upstream = await fetch(target, {
          method: p.method || (p.body ? 'POST' : 'GET'),
          headers: authHeaders(p.protocol, p.key),
          body: p.body ? JSON.stringify(p.body) : undefined,
          signal: AbortSignal.timeout(Math.min(p.timeoutMs || 30000, 120000)),
        });
      } catch (e) {
        return json(res, 200, { relayError: String(e && e.cause?.message || e.message || e) });
      }
      const text = await upstream.text();
      return json(res, 200, { status: upstream.status, text: text.slice(0, 400000) });
    }

    if (req.method === 'GET' && (u.pathname === '/' || u.pathname === '/index.html')) {
      const html = await readFile(path.join(ROOT, 'public', 'index.html'));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(html);
    }

    if (req.method === 'GET' && u.pathname === '/favicon.svg') {
      const svg = await readFile(path.join(ROOT, 'public', 'favicon.svg'));
      res.writeHead(200, { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=86400' });
      return res.end(svg);
    }

    if (req.method === 'GET' && u.pathname === '/api/health') return json(res, 200, { ok: true });
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
  } catch (e) {
    json(res, 500, { error: String(e && e.message || e) });
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(JSON.stringify({ ok: true, port: PORT, url: `http://localhost:${PORT}` })));