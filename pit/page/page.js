import { wolti, POSES } from '../../src/wolti.js';
import { createGame } from '../../src/pit/game.js';

const ZONE = 'antautomobile.org';
const EVERY = 5;

const SERVICES = {
  tr: { '': 'Web sitesi', www: 'Web sitesi', git: 'Git', docs: 'Belgeler', office: 'Ofis', go: 'Kısa linkler', status: 'Durum paneli', mcp: 'Uygulama API\'si', qr: 'QR aktarım', invite: 'Davet', console: 'Konsol', analytics: 'Analytics', verify: 'Belge doğrulama', api: 'API', webmail: 'Webmail' },
  en: { '': 'Website', www: 'Website', git: 'Git', docs: 'Documents', office: 'Office', go: 'Short links', status: 'Status panel', mcp: 'App API', qr: 'QR transfer', invite: 'Invitations', console: 'Console', analytics: 'Analytics', verify: 'Document verification', api: 'API', webmail: 'Webmail' },
};

const T = {
  tr: {
    maintenance: { eyebrow: 'Planlı bakım', title: 'Kısa bir pit stop.', lead: (s) => `${s} şu an bakımda. Ekibimiz üzerinde çalışıyor; bitince seni kendiliğinden geri götüreceğiz.`, state: 'Bakımda', pose: 'pit' },
    down: { eyebrow: 'Bağlantı kesildi', title: 'Wolti biraz kestiriyor.', lead: (s) => `${s} şu an yanıt vermiyor. Sorun bize ulaştı; düzelir düzelmez seni geri götüreceğiz.`, state: 'Yanıt yok', pose: 'sleep' },
    offline: { eyebrow: 'İnternet yok', title: 'Bağlantın koptu.', lead: () => 'Görünüşe göre internete bağlı değilsin. Bağlantı gelince sayfa kendiliğinden yenilenir; o zamana kadar Wolti\'yle bir tur at.', state: 'Çevrim dışı', pose: 'sleep' },
    idle: { eyebrow: 'Pit alanı', title: 'Burası pit alanı.', lead: () => 'Bir hizmetimiz bakımdayken ya da yanıt vermediğinde buraya gelirsin. Şu an her şey yolunda; yine de bir tur atabilirsin.', state: 'Her şey yolunda', pose: 'hello' },
    up: { eyebrow: 'Hazır', title: 'Yeniden yoldayız!', lead: (s, n) => (n > 0 ? `${s} hazır. ${n} saniye içinde kaldığın yere yönlendiriliyorsun.` : `${s} hazır. Hazır olduğunda “Şimdi dön”e dokun.`), state: 'Çalışıyor', pose: 'cheer' },
    fallback: 'Yönlendirme gerçekleşmezse', fallbackLink: 'buraya tıklayın', ready: (s) => `✓ ${s} hazır`,
    service: 'Hizmet', status: 'Durum', checked: 'Son kontrol', eta: 'Tahmini dönüş',
    connection: 'İnternet bağlantın', never: 'henüz yok', ago: (n) => (n < 3 ? 'şimdi' : `${n} sn önce`), every: `her ${EVERY} sn`,
    back: 'Şimdi dön', backIn: (n) => `${n} sn içinde dönülüyor`, stay: 'Oyuna devam et', site: 'Siteye git', retry: 'Yeniden dene',
    keys: ['zıpla', 'eğil', 'ses'], touch: 'Dokun: zıpla · aşağı kaydır: eğil', sound: (on) => (on ? 'Ses açık' : 'Ses kapalı'),
    mail: 'Bize yaz:', game: 'Beklerken bir tur at', legal: [['KVKK Aydınlatma Metni', '/tr/kvkk/'], ['Çerez Politikası', '/tr/cerez-politikasi/']],
  },
  en: {
    maintenance: { eyebrow: 'Planned maintenance', title: 'A quick pit stop.', lead: (s) => `${s} is down for maintenance. The team is on it, and this page will take you back as soon as it is done.`, state: 'Maintenance', pose: 'pit' },
    down: { eyebrow: 'Connection lost', title: 'Wolti is taking a nap.', lead: (s) => `${s} is not responding right now. We already know about it, and this page will take you back as soon as it is fixed.`, state: 'Not responding', pose: 'sleep' },
    offline: { eyebrow: 'No internet', title: 'You are offline.', lead: () => 'It looks like you are not connected to the internet. The page reloads by itself when the connection is back. Until then, take Wolti for a run.', state: 'Offline', pose: 'sleep' },
    idle: { eyebrow: 'Pit lane', title: 'This is the pit lane.', lead: () => 'You land here when one of our services is under maintenance or not responding. Everything is running fine right now, but you can still take a lap.', state: 'All good', pose: 'hello' },
    up: { eyebrow: 'Ready', title: 'We are back on track!', lead: (s, n) => (n > 0 ? `${s} is ready. Taking you back in ${n} seconds.` : `${s} is ready. Tap “Go back now” whenever you like.`), state: 'Running', pose: 'cheer' },
    fallback: 'If nothing happens,', fallbackLink: 'click here', ready: (s) => `✓ ${s} is ready`,
    service: 'Service', status: 'Status', checked: 'Last check', eta: 'Expected back',
    connection: 'Your connection', never: 'not yet', ago: (n) => (n < 3 ? 'just now' : `${n} s ago`), every: `every ${EVERY} s`,
    back: 'Go back now', backIn: (n) => `Going back in ${n} s`, stay: 'Keep playing', site: 'Go to the website', retry: 'Try again',
    keys: ['jump', 'duck', 'sound'], touch: 'Tap: jump · swipe down: duck', sound: (on) => (on ? 'Sound on' : 'Sound off'),
    mail: 'Write to us:', game: 'Take a lap while you wait', legal: [['Privacy Notice', '/privacy/'], ['Cookie Policy', '/cookies/']],
  },
};

const $ = (id) => document.getElementById(id);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set() { /* dil seçimi yalnızca bu sayfa açıkken geçerli; cihaza yazılmaz */ },
};

try { const th = store.get('ant-theme'); if (th === 'light' || th === 'dark') document.documentElement.dataset.theme = th; } catch { /* */ }

const q = new URLSearchParams(location.search);
const onPit = location.pathname.replace(/\/+$/, '') === '/pit';
let mode = onPit ? (['maintenance', 'down', 'offline'].includes(q.get('s')) ? q.get('s') : 'idle') : 'offline';
const initial = mode;
if (!navigator.onLine) mode = 'offline';

function safeFrom(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return null;
    if (u.hostname !== ZONE && !u.hostname.endsWith('.' + ZONE)) return null;
    if (u.hostname === ZONE && u.pathname.startsWith('/pit')) return null;
    const sub = u.hostname === ZONE ? '' : u.hostname.endsWith('.' + ZONE) ? u.hostname.slice(0, -(ZONE.length + 1)) : null;
    if (sub === null || !(sub in SERVICES.tr)) return null;
    return u;
  } catch { return null; }
}
const from = safeFrom(onPit ? q.get('from') || '' : location.href);
if (onPit && !from && mode !== 'offline') mode = 'idle';

let lang = (store.get('ant-pit-lang') || document.documentElement.lang || navigator.language || 'tr').slice(0, 2) === 'en' ? 'en' : 'tr';
let L = T[lang];
let eta = null;
let lastCheck = 0;
let countdown = 0;
let cdTimer = 0;
let game;

function serviceName() {
  if (!from) return SERVICES[lang][''];
  const sub = from.hostname === ZONE ? '' : from.hostname.slice(0, -(ZONE.length + 1));
  if (sub === 'docs' && from.pathname.startsWith('/office')) return SERVICES[lang].office;
  return SERVICES[lang][sub] || from.hostname;
}

let shownPose = '';
function render() {
  const s = L[mode];
  document.documentElement.lang = lang;
  document.title = mode === 'up' ? `${L.ready(serviceName())} · ANT Automobile` : `${s.title.replace(/[.!]$/, '')} · ANT Automobile`;
  if (shownPose !== s.pose) { $('wolti').innerHTML = wolti({ ...POSES[s.pose], id: 'h' + s.pose }); shownPose = s.pose; }
  $('eyebrow-text').textContent = s.eyebrow;
  $('lamp').className = 'lamp' + (mode === 'up' || mode === 'idle' ? ' lamp--ok' : mode === 'maintenance' ? ' lamp--accent' : '');
  $('title').textContent = s.title;
  $('lead').textContent = s.lead(serviceName(), countdown);
  if (mode === 'up') {
    const p = document.createElement('span');
    p.className = 'pit__fallback';
    const a = document.createElement('a');
    a.href = from ? from.href : '/';
    a.textContent = L.fallbackLink;
    a.addEventListener('click', () => stopCountdown());
    p.append(' ' + L.fallback + ' ', a, '.');
    $('lead').append(p);
  }

  const tel = $('telemetry');
  tel.hidden = mode === 'idle';
  $('t-service-k').textContent = L.service;
  $('t-service').innerHTML = '';
  $('t-service').append(mode === 'offline' ? L.connection : serviceName());
  if (from && mode !== 'offline') { const sm = document.createElement('small'); sm.textContent = from.hostname; $('t-service').append(' ', sm); }
  $('t-status-k').textContent = L.status;
  $('t-status').textContent = s.state;
  const showEta = mode === 'maintenance' && eta;
  $('t-check-k').textContent = showEta ? L.eta : L.checked;
  tickCheck();

  const actions = $('actions');
  actions.innerHTML = '';
  const btn = (label, href, ghost, onClick) => {
    const a = document.createElement(href ? 'a' : 'button');
    a.className = 'btn' + (ghost ? ' btn--ghost' : '');
    a.textContent = label;
    if (href) a.href = href; else a.type = 'button';
    if (onClick) a.addEventListener('click', onClick);
    actions.append(a);
    return a;
  };
  if (mode === 'up') {
    btn(countdown > 0 ? `${L.back} · ${countdown}` : L.back, from ? from.href : '/', false, () => stopCountdown());
    if (countdown > 0) btn(L.stay, null, true, () => { stopCountdown(); render(); $('game').focus({ preventScroll: true }); });
  } else if (mode === 'idle') btn(L.site, lang === 'tr' ? '/tr/' : '/', false);
  else if (mode === 'offline') btn(L.retry, null, true, () => location.reload());
  actions.hidden = !actions.children.length;

  $('lang-tr').setAttribute('aria-pressed', String(lang === 'tr'));
  $('lang-en').setAttribute('aria-pressed', String(lang === 'en'));
  $('game-title').textContent = L.game;
  const k = $('keys').querySelectorAll('[data-k]');
  k.forEach((el, i) => { el.lastChild.textContent = L.keys[i]; });
  $('touch').textContent = L.touch;
  $('sound').textContent = L.sound(game ? game.sound : true);
  $('mail-text').textContent = L.mail;
  $('legal').innerHTML = L.legal.map(([t, h]) => `<a href="${h}">${t}</a>`).join(' · ');
}

function tickCheck() {
  const el = $('t-check');
  if (mode === 'maintenance' && eta) {
    el.textContent = new Intl.DateTimeFormat(lang === 'tr' ? 'tr-TR' : 'en-GB', { hour: '2-digit', minute: '2-digit' }).format(eta);
    return;
  }
  const ago = lastCheck ? Math.round((Date.now() - lastCheck) / 1000) : null;
  el.innerHTML = '';
  el.append(ago === null ? L.never : L.ago(ago));
  const sm = document.createElement('small'); sm.textContent = L.every; el.append(' ', sm);
}

function stopCountdown() { clearInterval(cdTimer); cdTimer = 0; countdown = 0; }

function recovered() {
  if (mode === 'up') return;
  mode = 'up';
  const playing = game && game.playing;
  if (!playing) {
    countdown = 5;
    cdTimer = setInterval(() => {
      countdown -= 1;
      if (countdown <= 0) { stopCountdown(); location.href = from ? from.href : '/'; return; }
      render();
    }, 1000);
  }
  render();
}

async function check() {
  if (mode === 'idle' || mode === 'up') return;
  if (mode === 'offline') {
    lastCheck = Date.now();
    if (!navigator.onLine) { tickCheck(); return; }
    try {
      await fetch('/', { method: 'HEAD', cache: 'no-store', redirect: 'manual' });
    } catch { tickCheck(); return; }
    if (!onPit) { location.reload(); return; }
    mode = initial === 'offline' ? 'down' : initial;
    render();
  }
  try {
    const r = await fetch('/pit/check' + (from ? '?u=' + encodeURIComponent(from.href) : ''), { cache: 'no-store' });
    const j = await r.json();
    lastCheck = Date.now();
    const nextEta = j.until ? new Date(j.until) : null;
    const etaChanged = String(nextEta) !== String(eta);
    eta = nextEta;
    if (j.state === 'up') recovered();
    else if (etaChanged && j.state === mode) render();
    else if (j.state === 'maintenance' || j.state === 'down') { if (j.state !== mode) { mode = j.state; render(); } else tickCheck(); }
  } catch {
    lastCheck = Date.now();
    if (!navigator.onLine) { mode = 'offline'; render(); } else tickCheck();
  }
}

function setLang(l) { lang = l; L = T[l]; store.set('ant-pit-lang', l); game.setLang(l); render(); }
$('lang-tr').addEventListener('click', () => setLang('tr'));
$('lang-en').addEventListener('click', () => setLang('en'));

game = createGame($('game'), {
  lang,
  onSound: () => render(),
  onOver: () => { if (mode === 'up' && !countdown) render(); },
});
$('sound').addEventListener('click', () => { game.toggleSound(); render(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => game.refresh());

addEventListener('online', () => check());
document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
addEventListener('focus', () => check());
addEventListener('offline', () => { if (mode !== 'up') { mode = 'offline'; render(); } });
render();
check();
setInterval(check, EVERY * 1000);
setInterval(tickCheck, 1000);
