'use strict';

// Carbon Think website + admin portal. No dependencies: Node 18+ only.
//   ADMIN_PASSWORD  password for /admin (required to log in)
//   DATA_DIR        where content, uploads, history and messages are stored (default ./data)
//   PORT            port to listen on (default 3000)

const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const { renderPage } = require('./lib/render');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const HISTORY_DIR = path.join(DATA_DIR, 'history');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const DEFAULT_CONTENT = path.join(ROOT, 'content.default.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SECURE_COOKIE = process.env.NODE_ENV === 'production';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const HISTORY_LIMIT = 50;
const MESSAGES_LIMIT = 2000;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

let content = null;
const sessions = new Map(); // token -> expiry
const limits = new Map(); // key -> { count, resetAt }

// ---------- storage ----------

async function writeJson(file, data) {
  const tmp = `${file}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2));
  await fsp.rename(tmp, file);
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fsp.readFile(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

async function init() {
  await fsp.mkdir(UPLOAD_DIR, { recursive: true });
  await fsp.mkdir(HISTORY_DIR, { recursive: true });
  if (!fs.existsSync(CONTENT_FILE)) await fsp.copyFile(DEFAULT_CONTENT, CONTENT_FILE);
  content = await readJson(CONTENT_FILE);
  if (!ADMIN_PASSWORD) console.warn('ADMIN_PASSWORD is not set: the admin portal will refuse all logins.');
}

// Keep the previous version in history before every save, so any edit can be undone
async function saveContent(next) {
  await writeJson(path.join(HISTORY_DIR, `${Date.now()}.json`), content);
  await writeJson(CONTENT_FILE, next);
  content = next;
  const versions = (await fsp.readdir(HISTORY_DIR)).filter((f) => /^\d+\.json$/.test(f)).sort();
  await Promise.all(versions.slice(0, Math.max(0, versions.length - HISTORY_LIMIT)).map((f) => fsp.unlink(path.join(HISTORY_DIR, f))));
}

// ---------- http helpers ----------

const BASE_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...BASE_HEADERS, ...headers });
  res.end(body);
}

const json = (res, status, data, headers = {}) =>
  send(res, status, JSON.stringify(data), { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store', ...headers });

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('Request too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function readJsonBody(req, limit = 1024 * 1024) {
  if (!String(req.headers['content-type'] || '').includes('application/json')) {
    throw Object.assign(new Error('Expected JSON'), { status: 415 });
  }
  try {
    return JSON.parse(await readBody(req, limit));
  } catch (err) {
    if (err.status) throw err;
    throw Object.assign(new Error('Invalid JSON'), { status: 400 });
  }
}

function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

const clientIp = (req) => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';

// Simple fixed-window rate limit; returns true when the caller is over the limit
function limited(key, max, windowMs) {
  const now = Date.now();
  const entry = limits.get(key);
  if (!entry || entry.resetAt < now) {
    limits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

function isAuthed(req) {
  const token = parseCookies(req).ct_session;
  const expiry = token && sessions.get(token);
  if (!expiry) return false;
  if (expiry < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function passwordMatches(input) {
  if (!ADMIN_PASSWORD) return false;
  const a = crypto.createHash('sha256').update(String(input)).digest();
  const b = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

const sessionCookie = (token, maxAgeSec) =>
  `ct_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec}${SECURE_COOKIE ? '; Secure' : ''}`;

async function serveFile(res, baseDir, relPath, cacheControl) {
  let decoded;
  try {
    decoded = decodeURIComponent(relPath);
  } catch {
    return send(res, 400, 'Bad request');
  }
  const file = path.join(baseDir, decoded);
  if (!file.startsWith(baseDir + path.sep)) return send(res, 403, 'Forbidden');
  try {
    const stat = await fsp.stat(file);
    if (!stat.isFile()) throw Object.assign(new Error(), { code: 'ENOENT' });
    res.writeHead(200, {
      ...BASE_HEADERS,
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': cacheControl,
    });
    fs.createReadStream(file).pipe(res);
  } catch {
    send(res, 404, 'Not found', { 'Content-Type': MIME['.txt'] });
  }
}

// Detect the real image type from its first bytes rather than trusting the file name
function imageExtension(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return '.png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
  if (buf.toString('ascii', 0, 4) === 'GIF8') return '.gif';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return '.webp';
  return null;
}

// ---------- routes ----------

async function handleApi(req, res, pathname) {
  const method = req.method;

  if (pathname === '/api/contact' && method === 'POST') {
    if (limited(`contact:${clientIp(req)}`, 5, 10 * 60 * 1000)) return json(res, 429, { error: 'Too many messages. Please try again in a few minutes.' });
    const body = await readJsonBody(req, 64 * 1024);
    if (body.website) return json(res, 200, { ok: true }); // honeypot filled: quietly drop spam
    const field = (k, max) => String(body[k] || '').trim().slice(0, max);
    const msg = {
      id: crypto.randomBytes(8).toString('hex'),
      date: new Date().toISOString(),
      name: field('name', 120),
      email: field('email', 200),
      org: field('org', 200),
      topic: field('topic', 120),
      message: field('message', 5000),
    };
    if (!msg.name || !/^\S+@\S+\.\S+$/.test(msg.email) || !msg.message) return json(res, 400, { error: 'Please fill in your name, a valid email and a message.' });
    const messages = await readJson(MESSAGES_FILE, []);
    messages.unshift(msg);
    await writeJson(MESSAGES_FILE, messages.slice(0, MESSAGES_LIMIT));
    return json(res, 200, { ok: true });
  }

  if (pathname === '/api/login' && method === 'POST') {
    const ip = clientIp(req);
    if (limited(`login:${ip}`, 10, 15 * 60 * 1000)) return json(res, 429, { error: 'Too many attempts. Wait 15 minutes and try again.' });
    const body = await readJsonBody(req, 4096);
    if (!ADMIN_PASSWORD) return json(res, 503, { error: 'The admin password has not been set on the server (ADMIN_PASSWORD).' });
    if (!passwordMatches(body.password || '')) return json(res, 401, { error: 'That password is not correct.' });
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, Date.now() + SESSION_TTL_MS);
    limits.delete(`login:${ip}`);
    return json(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(token, SESSION_TTL_MS / 1000) });
  }

  if (pathname === '/api/logout' && method === 'POST') {
    sessions.delete(parseCookies(req).ct_session);
    return json(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie('', 0) });
  }

  if (pathname === '/api/session' && method === 'GET') return json(res, 200, { authenticated: isAuthed(req) });

  // Everything below requires an admin session
  if (!isAuthed(req)) return json(res, 401, { error: 'Please log in again.' });

  if (pathname === '/api/content' && method === 'GET') return json(res, 200, content);

  if (pathname === '/api/content' && method === 'PUT') {
    const next = await readJsonBody(req, 2 * 1024 * 1024);
    if (!next || typeof next !== 'object' || Array.isArray(next) || typeof next.site !== 'object') return json(res, 400, { error: 'Content is not in the expected format.' });
    await saveContent(next);
    return json(res, 200, { ok: true });
  }

  if (pathname === '/api/preview' && method === 'POST') {
    const draft = await readJsonBody(req, 2 * 1024 * 1024);
    return send(res, 200, renderPage(draft, { preview: true }), { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
  }

  if (pathname === '/api/uploads' && method === 'GET') {
    const names = (await fsp.readdir(UPLOAD_DIR)).filter((n) => /^[\w.-]+$/.test(n));
    const files = await Promise.all(names.map(async (name) => {
      const stat = await fsp.stat(path.join(UPLOAD_DIR, name));
      return { name, url: `/uploads/${name}`, size: stat.size, date: stat.mtimeMs };
    }));
    return json(res, 200, files.sort((a, b) => b.date - a.date));
  }

  if (pathname === '/api/uploads' && method === 'POST') {
    const body = await readJsonBody(req, Math.ceil(MAX_UPLOAD_BYTES * 1.4));
    const data = String(body.data || '').replace(/^data:[^,]*,/, '');
    const buf = Buffer.from(data, 'base64');
    if (buf.length > MAX_UPLOAD_BYTES) return json(res, 413, { error: 'Images must be 10 MB or smaller.' });
    const ext = imageExtension(buf);
    if (!ext) return json(res, 400, { error: 'Only PNG, JPG, GIF and WebP images can be uploaded.' });
    const base = path.parse(String(body.filename || 'image')).name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'image';
    const name = `${base}-${crypto.randomBytes(3).toString('hex')}${ext}`;
    await fsp.writeFile(path.join(UPLOAD_DIR, name), buf);
    return json(res, 200, { name, url: `/uploads/${name}` });
  }

  const uploadMatch = pathname.match(/^\/api\/uploads\/([\w.-]+)$/);
  if (uploadMatch && method === 'DELETE') {
    await fsp.unlink(path.join(UPLOAD_DIR, uploadMatch[1])).catch(() => {});
    return json(res, 200, { ok: true });
  }

  if (pathname === '/api/history' && method === 'GET') {
    const versions = (await fsp.readdir(HISTORY_DIR)).filter((f) => /^\d+\.json$/.test(f)).map((f) => Number(f.slice(0, -5)));
    return json(res, 200, versions.sort((a, b) => b - a).map((id) => ({ id, date: new Date(id).toISOString() })));
  }

  const restoreMatch = pathname.match(/^\/api\/history\/(\d+)\/restore$/);
  if (restoreMatch && method === 'POST') {
    const version = await readJson(path.join(HISTORY_DIR, `${restoreMatch[1]}.json`), null);
    if (!version) return json(res, 404, { error: 'That version no longer exists.' });
    await saveContent(version);
    return json(res, 200, content);
  }

  if (pathname === '/api/messages' && method === 'GET') return json(res, 200, await readJson(MESSAGES_FILE, []));

  const messageMatch = pathname.match(/^\/api\/messages\/([a-f0-9]+)$/);
  if (messageMatch && method === 'DELETE') {
    const messages = await readJson(MESSAGES_FILE, []);
    await writeJson(MESSAGES_FILE, messages.filter((m) => m.id !== messageMatch[1]));
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { error: 'Not found' });
}

async function handle(req, res) {
  const { pathname } = new URL(req.url, 'http://localhost');

  if (pathname.startsWith('/api/')) return handleApi(req, res, pathname);
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');

  if (pathname === '/' || pathname === '/index.html') {
    return send(res, 200, renderPage(content), { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' });
  }
  if (pathname === '/admin') return send(res, 301, '', { Location: '/admin/' });
  if (pathname === '/admin/') return serveFile(res, PUBLIC_DIR, 'admin/index.html', 'no-cache');
  if (pathname.startsWith('/uploads/')) return serveFile(res, UPLOAD_DIR, pathname.slice('/uploads/'.length), 'public, max-age=31536000, immutable');
  return serveFile(res, PUBLIC_DIR, pathname.slice(1), 'public, max-age=300');
}

init().then(() => {
  http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      if (!err.status) console.error(err);
      if (!res.headersSent) json(res, err.status || 500, { error: err.status ? err.message : 'Something went wrong on the server.' });
    });
  }).listen(PORT, () => console.log(`Carbon Think running on http://localhost:${PORT} (data in ${DATA_DIR})`));
});
