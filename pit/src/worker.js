import PAGE from '../dist/pit.html';

let ZONE, PIT, NEVER, KNOWN, WEBMAIL;
function configure(env) {
  if (ZONE) return;
  const list = (v) => new Set(String(v ?? '').split(',').map((s) => s.trim()));
  ZONE = env.ZONE;
  PIT = `https://${ZONE}/pit/`;
  NEVER = list(env.NEVER);
  KNOWN = list(env.KNOWN);
  WEBMAIL = env.WEBMAIL_URL;
}
const DOWN = new Set([502, 504, 520, 521, 522, 523, 524, 525, 526, 527, 530]);
const PASS_COOKIE = 'ant_pit';

let memo = { at: 0, v: null };
async function maintenance(env) {
  if (Date.now() - memo.at < 15000) return memo.v;
  let v = null;
  try { v = await env.PIT.get('bakim', { type: 'json', cacheTtl: 30 }); } catch { v = memo.v; }
  memo = { at: Date.now(), v };
  return v;
}

const subOf = (host) => (host === ZONE ? '' : host.endsWith('.' + ZONE) ? host.slice(0, -(ZONE.length + 1)) : null);
const keyOf = (sub) => (sub === '' || sub === 'www' ? '@' : sub);

function inMaintenance(m, sub) {
  if (!m || !Array.isArray(m.hosts) || sub === 'webmail') return false;
  return m.hosts.includes('*') || m.hosts.includes(keyOf(sub));
}

function cookie(req, name) {
  const raw = req.headers.get('cookie') || '';
  for (const part of raw.split(/;\s*/)) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i) === name) {
      try { return decodeURIComponent(part.slice(i + 1)); } catch { return null; }
    }
  }
  return null;
}

function same(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
async function passSig(env, exp) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.PIT_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const d = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode('pass:' + exp)));
  return [...d].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function passes(req, env) {
  const v = cookie(req, PASS_COOKIE);
  const m = env.PIT_KEY && v && v.match(/^(\d{10})\.([0-9a-f]{64})$/);
  if (!m || Number(m[1]) < Date.now() / 1000) return false;
  return same(m[2], await passSig(env, m[1]));
}

function isNavigation(req) {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'POST') return false;
  const mode = req.headers.get('sec-fetch-mode');
  if (mode) return mode === 'navigate';
  return req.method !== 'POST' && (req.headers.get('accept') || '').includes('text/html');
}

const noStore = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' };
const toPit = (state, url) =>
  new Response(null, { status: 302, headers: { ...noStore, location: `${PIT}?s=${state}&from=${encodeURIComponent(url.href)}` } });

function langOf(req) {
  const c = cookie(req, 'lang');
  if (c === 'tr' || c === 'en') return c;
  const al = (req.headers.get('accept-language') || '').toLowerCase();
  if (al.startsWith('tr')) return 'tr';
  if (al.startsWith('en')) return 'en';
  return req.headers.get('cf-ipcountry') === 'TR' ? 'tr' : 'en';
}

const CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const etags = {};
async function page(req) {
  const lang = langOf(req);
  const body = PAGE.replace('__LANG__', lang);
  if (!etags[lang]) {
    const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body)));
    etags[lang] = '"' + [...d.slice(0, 10)].map((b) => b.toString(16).padStart(2, '0')).join('') + '"';
  }
  const etag = etags[lang];
  const fresh = (req.headers.get('if-none-match') || '').split(/\s*,\s*/).includes(etag);
  return new Response(req.method === 'HEAD' || fresh ? null : body, {
    status: fresh ? 304 : 200,
    headers: {
      etag,
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'content-security-policy': CSP,
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'strict-transport-security': 'max-age=31536000',
      'x-robots-tag': 'noindex',
      vary: 'Accept-Language, Cookie',
    },
  });
}

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...noStore, 'content-type': 'application/json' } });

const probes = new Map();
async function check(url, env) {
  let target;
  try { target = new URL(url.searchParams.get('u') || `https://${ZONE}/`); } catch { return json({ error: 'bad url' }, 400); }
  const sub = subOf(target.hostname);
  if (target.protocol !== 'https:' || sub === null || NEVER.has(sub) || !KNOWN.has(sub)) return json({ state: 'unknown' });
  const m = await maintenance(env);
  if (inMaintenance(m, sub)) return json({ state: 'maintenance', until: m.until || null });
  const hit = probes.get(target.hostname);
  if (hit && Date.now() - hit.at < 4000) return json({ state: hit.state });
  let state;
  try {
    const r = await fetch(`https://${target.hostname}/`, { redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'ant-pit-check' } });
    state = DOWN.has(r.status) ? 'down' : 'up';
  } catch {
    state = 'down';
  }
  if (probes.size > 64) probes.clear();
  probes.set(target.hostname, { at: Date.now(), state });
  return json({ state });
}
function noTransform(res) {
  if (res.status === 101 || !(res.headers.get('content-type') || '').includes('text/html')) return res;
  const cc = res.headers.get('cache-control') || '';
  if (/no-transform/i.test(cc)) return res;
  const out = new Response(res.body, res);
  out.headers.set('cache-control', cc ? `${cc}, no-transform` : 'no-transform');
  return out;
}

async function pass(url, env) {
  const k = url.searchParams.get('k');
  const base = `${PASS_COOKIE}=; Domain=${ZONE}; Path=/; Secure; HttpOnly; SameSite=Lax`;
  if (url.searchParams.has('kapat')) return new Response('Maintenance bypass disabled.\n', { headers: { ...noStore, 'set-cookie': `${base}; Max-Age=0` } });
  if (!env.PIT_KEY || !same(k, env.PIT_KEY)) return new Response('Invalid key.\n', { status: 403, headers: noStore });
  const exp = String(Math.floor(Date.now() / 1000) + 43200);
  return new Response(null, {
    status: 302,
    headers: { ...noStore, location: `https://${ZONE}/`, 'set-cookie': `${PASS_COOKIE}=${exp}.${await passSig(env, exp)}; Domain=${ZONE}; Path=/; Max-Age=43200; Secure; HttpOnly; SameSite=Lax` },
  });
}

export default {
  async fetch(req, env) {
    configure(env);
    const url = new URL(req.url);
    const sub = subOf(url.hostname);
    if (sub === null || NEVER.has(sub)) return fetch(req);

    if (sub === '') {
      if (url.pathname === '/pit') return Response.redirect(PIT + url.search, 301);
      if (url.pathname === '/pit/') return page(req);
      if (url.pathname === '/pit/check') return check(url, env);
      if (url.pathname === '/pit/gec') return pass(url, env);
    }

    const nav = isNavigation(req);
    const m = await maintenance(env);
    if (inMaintenance(m, sub) && !(await passes(req, env))) {
      if (nav) return toPit('maintenance', url);
      const body = JSON.stringify({ error: 'maintenance', until: m.until || null });
      return new Response(req.method === 'HEAD' ? null : body, { status: 503, headers: { ...noStore, 'content-type': 'application/json', 'retry-after': '120' } });
    }

    if (!nav) return noTransform(await fetch(req));
    let res;
    try {
      res = await fetch(req);
    } catch {
      return sub === 'webmail' ? Response.redirect(WEBMAIL, 302) : toPit('down', url);
    }
    if (DOWN.has(res.status)) return sub === 'webmail' ? Response.redirect(WEBMAIL, 302) : toPit('down', url);
    return noTransform(res);
  },
};
