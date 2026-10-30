// Çevrim dışı koşu oyunu: Wolti yolda koşar, engellerden atlar, dronların altından eğilir, şimşek toplar.
// Hem kesinti/bakım sayfasında (Cloudflare Worker) hem 404 sayfasında kullanılır; dışarıdan hiçbir şey yüklemez.
import { wolti, POSES } from '../wolti.js';

const T = {
  tr: {
    start: 'Başlamak için boşluk tuşuna bas ya da dokun',
    startTouch: 'Başlamak için dokun',
    over: 'Oyun bitti',
    record: 'Yeni rekor!',
    again: 'Tekrar için boşluk ya da dokun',
    againTouch: 'Tekrar için dokun',
    paused: 'Duraklatıldı · devam için dokun',
    best: 'EN İYİ',
    label: 'Wolti koşu oyunu',
  },
  en: {
    start: 'Press space or tap to start',
    startTouch: 'Tap to start',
    over: 'Game over',
    record: 'New record!',
    again: 'Press space or tap to play again',
    againTouch: 'Tap to play again',
    paused: 'Paused · tap to continue',
    best: 'BEST',
    label: 'Wolti runner game',
  },
};

const H = 210; // oyun alanının yüksekliği (CSS px)
const GROUND = H - 36;
const SPRITE_W = 64;
const SPRITE_H = Math.round((SPRITE_W * 300) / 280);
const FEET = 0.9; // görselde ayak tabanının yüksekliğe oranı
const HERO_X = 58;
const GRAVITY = 2700;
const JUMP_V = 780;
const BEST_KEY = 'ant-pit-best';
const SOUND_KEY = 'ant-pit-sound';

// Skor ve ses tercihi yalnızca sayfa açıkken bellekte tutulur; cihaza hiçbir şey yazılmaz
const memory = new Map();
const store = { get: (k) => memory.get(k) ?? null, set: (k, v) => { memory.set(k, v); } };

function frames() {
  const list = {
    idle: POSES.logo,
    blink: { ...POSES.logo, eyes: 'closed' },
    run1: POSES.run1,
    run2: POSES.run2,
    jump: POSES.jump,
    crash: POSES.crash,
    cheer: POSES.cheer,
  };
  const out = {};
  for (const [k, pose] of Object.entries(list)) {
    const img = new Image();
    img.decoding = 'async';
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(wolti({ ...pose, id: 'g' + k, props: (pose.props || []).filter((p) => p !== 'speed') }));
    out[k] = { img, bmp: null };
  }
  return out;
}

// SVG'leri bir kez piksele çevir; her karede SVG çizmek bazı tarayıcılarda yavaş
function bake(f, dpr) {
  if (f.bmp || !f.img.complete || !f.img.naturalWidth) return f.bmp;
  const c = document.createElement('canvas');
  c.width = Math.round(SPRITE_W * dpr * 1.25);
  c.height = Math.round(SPRITE_H * dpr * 1.25);
  c.getContext('2d').drawImage(f.img, 0, 0, c.width, c.height);
  f.bmp = c;
  return c;
}

function sound() {
  let ctx = null;
  let on = store.get(SOUND_KEY) !== '0';
  const blip = (freq, dur, type = 'square', vol = 0.035, slide = 0) => {
    if (!on) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch { /* ses yoksa sessiz devam */ }
  };
  return {
    get on() { return on; },
    toggle() { on = !on; store.set(SOUND_KEY, on ? '1' : '0'); return on; },
    jump: () => blip(520, 0.12, 'square', 0.03, 1.6),
    bolt: () => { blip(880, 0.08, 'triangle', 0.05); setTimeout(() => blip(1320, 0.1, 'triangle', 0.045), 70); },
    crash: () => blip(180, 0.32, 'sawtooth', 0.05, 0.4),
    mile: () => blip(1040, 0.09, 'sine', 0.04),
  };
}

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function createGame(canvas, opts = {}) {
  const lang = opts.lang === 'en' ? 'en' : 'tr';
  let S = T[lang];
  const ctx = canvas.getContext('2d');
  const sprites = frames();
  const sfx = sound();
  const coarse = matchMedia('(pointer: coarse)').matches;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', S.label);
  canvas.tabIndex = 0;

  let W = 600;
  let dpr = 1;
  let colors = {};
  let state = 'idle'; // idle | run | over | paused
  let last = 0;
  let raf = 0;
  let t = 0; // oyun süresi (s)
  let speed = 0;
  let dist = 0; // px
  let bonus = 0;
  let bolts = 0;
  let best = Number(store.get(BEST_KEY)) || 0;
  let record = false;
  let flash = 0;
  let nextMile = 100;
  let hero;
  let obstacles = [];
  let pickups = [];
  let popups = [];
  let posts = [];
  let nextSpawn = 0;
  let hills = [];
  let clouds = [];
  let held = false;
  let holdT = 0;
  let ducking = false;
  let blinkAt = 2;
  let colorTick = 0;
  let alive = true;
  let overAt = 0;

  function readColors() {
    const cs = getComputedStyle(canvas);
    const v = (n, f) => cs.getPropertyValue(n).trim() || f;
    colors = {
      ink: v('--game-ink', '#111513'),
      muted: v('--game-muted', '#5f6964'),
      line: v('--game-line', '#c9d0cd'),
      accent: v('--game-accent', '#4655d4'),
      cone: v('--game-cone', '#ff7a3d'),
      paper: v('--game-paper', '#f6f7f6'),
      font: cs.fontFamily || 'sans-serif',
      mono: v('--game-mono', 'ui-monospace, monospace'),
    };
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(280, Math.round(r.width || canvas.parentElement.clientWidth || 600));
    dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.height = H + 'px';
    for (const f of Object.values(sprites)) f.bmp = null;
    if (!hills.length) seedScenery();
    draw();
  }

  function seedScenery() {
    hills = [];
    let x = 0;
    while (x < 2400) { const w = rand(160, 340); hills.push({ x, w, h: rand(10, 30) }); x += w; }
    clouds = Array.from({ length: 5 }, (_, i) => ({ x: i * 260 + rand(0, 120), y: rand(18, 70), s: rand(0.7, 1.2) }));
  }

  function reset() {
    hero = { y: 0, vy: 0, air: false };
    obstacles = [];
    pickups = [];
    popups = [];
    posts = [];
    t = 0;
    speed = 340;
    dist = 0;
    bonus = 0;
    bolts = 0;
    record = false;
    flash = 0;
    nextMile = 100;
    nextSpawn = W * 0.75;
  }
  reset();

  const score = () => Math.floor(dist / 22) + bonus;

  let runs = 0;
  function start() {
    reset();
    runs += 1;
    // 404 sayfasında analitik onayı varsa ölçüm betiği yüklüdür; pit sayfasında hiç yoktur, çağrı boşa düşer
    try { window.antA?.track('game_start', { where: opts.where || (location.pathname.startsWith('/pit') ? 'pit' : '404'), run: runs }); } catch { /* */ }
    state = 'run';
    last = performance.now();
    loop();
  }

  function jump() {
    if (state !== 'run') return;
    if (!hero.air) {
      hero.vy = -JUMP_V;
      hero.air = true;
      holdT = 0;
      sfx.jump();
    }
  }

  function press() {
    if (state === 'idle' || state === 'over') { if (state === 'over' && performance.now() - overAt < 450) return; start(); jump(); held = true; return; }
    if (state === 'paused') { state = 'run'; last = performance.now(); loop(); return; }
    held = true;
    jump();
  }
  function release() { held = false; }

  function spawn() {
    const s = score();
    const kinds = ['cone', 'cone', 'cones', 'barrier'];
    if (s > 250) kinds.push('drone-low', 'drone-high');
    if (s > 500) kinds.push('cones3', 'drone-low');
    const kind = pick(kinds);
    const x = W + 20;
    if (kind === 'cone') obstacles.push({ kind, x, w: 22, h: 32, y: GROUND - 32 });
    else if (kind === 'cones') obstacles.push({ kind, x, w: 46, h: 32, y: GROUND - 32 });
    else if (kind === 'cones3') obstacles.push({ kind, x, w: 70, h: 32, y: GROUND - 32 });
    else if (kind === 'barrier') obstacles.push({ kind, x, w: 52, h: 38, y: GROUND - 38 });
    else if (kind === 'drone-low') obstacles.push({ kind, x, w: 46, h: 18, y: GROUND - 62, drone: true });
    else obstacles.push({ kind, x, w: 46, h: 18, y: GROUND - 108, drone: true });
    if (Math.random() < 0.45) {
      const gap = rand(110, 200);
      pickups.push({ x: x + gap, y: GROUND - rand(52, 118), got: false, ph: rand(0, 6) });
    }
    const min = speed * 0.62 + 120;
    nextSpawn = rand(min, min + speed * 0.9);
  }

  function heroBox() {
    const top = GROUND - SPRITE_H * FEET + hero.y;
    const cx = HERO_X + SPRITE_W / 2;
    const cy = top + SPRITE_H * 0.52 + (ducking ? SPRITE_H * 0.16 : 0);
    const r = ducking ? 15 : 19;
    return { cx, cy, r };
  }

  function hits(o) {
    const { cx, cy, r } = heroBox();
    const pad = o.drone ? 2 : 3;
    const nx = Math.max(o.x + pad, Math.min(cx, o.x + o.w - pad));
    const ny = Math.max(o.y + pad, Math.min(cy, o.y + o.h));
    return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r;
  }

  function update(dt) {
    t += dt;
    speed = Math.min(800, 340 + t * 9.5);
    const dx = speed * dt;
    dist += dx;

    // fizik: basılı tutunca daha yükseğe zıplar, havada aşağı basınca hızlı iner
    if (hero.air) {
      let g = GRAVITY;
      if (held && hero.vy < 0 && holdT < 0.2) { g *= 0.45; holdT += dt; }
      if (ducking) g *= 2.6;
      hero.vy += g * dt;
      hero.y += hero.vy * dt;
      if (hero.y >= 0) { hero.y = 0; hero.vy = 0; hero.air = false; }
    }

    nextSpawn -= dx;
    if (nextSpawn <= 0) spawn();
    for (const o of obstacles) o.x -= dx;
    obstacles = obstacles.filter((o) => o.x + o.w > -20);
    for (const p of pickups) p.x -= dx;
    pickups = pickups.filter((p) => p.x > -20 && !p.done);
    for (const p of posts) p.x -= dx;
    posts = posts.filter((p) => p.x > -40);
    for (const p of popups) { p.t += dt; p.y -= 30 * dt; }
    popups = popups.filter((p) => p.t < 0.8);
    for (const h of hills) { h.x -= dx * 0.18; }
    if (hills.length && hills[0].x + hills[0].w < 0) { const h = hills.shift(); const lastH = hills[hills.length - 1]; h.x = lastH.x + lastH.w; h.w = rand(160, 340); h.h = rand(10, 30); hills.push(h); }
    for (const c of clouds) { c.x -= dx * 0.06; if (c.x < -80) { c.x = W + rand(20, 200); c.y = rand(18, 70); } }

    const s = score();
    if (Math.floor(dist / 22) >= nextMile) {
      posts.push({ x: W + 10, n: nextMile });
      flash = 0.9;
      sfx.mile();
      nextMile += 100;
    }
    if (flash > 0) flash -= dt;

    const hb = heroBox();
    for (const p of pickups) {
      if (!p.got && (hb.cx - p.x) ** 2 + (hb.cy - p.y) ** 2 < (hb.r + 12) ** 2) {
        p.got = true; p.done = true; bonus += 10; bolts += 1;
        popups.push({ x: p.x, y: p.y - 10, t: 0 });
        sfx.bolt();
      }
    }
    for (const o of obstacles) {
      if (hits(o)) {
        state = 'over';
        overAt = performance.now();
        sfx.crash();
        if (s > best) { best = s; record = true; store.set(BEST_KEY, String(best)); }
        if (opts.onOver) opts.onOver({ score: s, best, record });
        return;
      }
    }
  }

  // --- çizim ---
  function sprite(name, x, y, sy = 1) {
    const f = sprites[name];
    const bmp = bake(f, dpr);
    if (!bmp) return;
    const w = SPRITE_W;
    const h = SPRITE_H;
    if (sy !== 1) {
      ctx.save();
      ctx.translate(x + w / 2, y + h * FEET);
      ctx.scale(1.12, sy);
      ctx.drawImage(bmp, -w / 2, -h * FEET, w, h);
      ctx.restore();
    } else ctx.drawImage(bmp, x, y, w, h);
  }

  function cone(x, y) {
    ctx.fillStyle = colors.cone;
    ctx.beginPath();
    ctx.moveTo(x + 8, y); ctx.lineTo(x + 14, y); ctx.lineTo(x + 21, y + 29); ctx.lineTo(x + 1, y + 29); ctx.closePath(); ctx.fill();
    ctx.fillStyle = colors.paper;
    ctx.beginPath(); ctx.moveTo(x + 6.2, y + 9); ctx.lineTo(x + 15.8, y + 9); ctx.lineTo(x + 17.2, y + 14.5); ctx.lineTo(x + 4.8, y + 14.5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 3.8, y + 19.5); ctx.lineTo(x + 18.2, y + 19.5); ctx.lineTo(x + 19.4, y + 24); ctx.lineTo(x + 2.6, y + 24); ctx.closePath(); ctx.fill();
    ctx.fillStyle = colors.ink;
    ctx.fillRect(x - 1, y + 29, 24, 3);
  }

  function barrier(o) {
    const { x, y, w, h } = o;
    ctx.fillStyle = colors.ink;
    ctx.fillRect(x + 6, y + 14, 4, h - 14);
    ctx.fillRect(x + w - 10, y + 14, 4, h - 14);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, 15); ctx.clip();
    ctx.fillStyle = colors.paper; ctx.fillRect(x, y, w, 15);
    ctx.fillStyle = colors.cone;
    for (let i = -2; i < w / 10 + 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 12, y + 15); ctx.lineTo(x + i * 12 + 6, y + 15); ctx.lineTo(x + i * 12 + 16, y); ctx.lineTo(x + i * 12 + 10, y); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = colors.ink; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, 13);
    ctx.fillStyle = colors.accent; ctx.beginPath(); ctx.arc(x + w / 2, y - 3, 3.2, 0, Math.PI * 2); ctx.fill();
  }

  function drone(o) {
    const { x, y, w } = o;
    const spin = Math.sin(t * 60) * 9;
    ctx.fillStyle = colors.ink;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + 12, y + 6, w - 24, 10, 3) : ctx.rect(x + 12, y + 6, w - 24, 10); ctx.fill();
    ctx.fillRect(x + 4, y + 4, w - 8, 3);
    ctx.fillRect(x + 6, y + 1, 3, 5); ctx.fillRect(x + w - 9, y + 1, 3, 5);
    ctx.strokeStyle = colors.muted; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 7.5 - spin, y); ctx.lineTo(x + 7.5 + spin, y); ctx.moveTo(x + w - 7.5 - spin, y); ctx.lineTo(x + w - 7.5 + spin, y); ctx.stroke();
    ctx.fillStyle = (Math.floor(t * 4) % 2) ? colors.accent : colors.cone;
    ctx.beginPath(); ctx.arc(x + w / 2, y + 18, 2.4, 0, Math.PI * 2); ctx.fill();
  }

  function bolt(x, y, s = 1) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(4, -12); ctx.lineTo(-7, 2); ctx.lineTo(-1, 2); ctx.lineTo(-4, 12); ctx.lineTo(7, -2); ctx.lineTo(1, -2); ctx.closePath();
    ctx.fillStyle = '#ffcf4a'; ctx.fill();
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.8; ctx.strokeStyle = colors.ink; ctx.stroke();
    ctx.restore();
  }

  function text(str, x, y, size, color, align = 'center', font = colors.font, weight = 600) {
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  function draw() {
    if (!colors.ink) readColors();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // uzak tepeler ve bulutlar
    ctx.strokeStyle = colors.line; ctx.lineWidth = 1.5;
    for (const c of clouds) {
      ctx.beginPath();
      const s = c.s;
      ctx.moveTo(c.x, c.y + 8 * s); ctx.lineTo(c.x + 44 * s, c.y + 8 * s);
      ctx.moveTo(c.x + 10 * s, c.y + 8 * s); ctx.arc(c.x + 18 * s, c.y + 4 * s, 8 * s, Math.PI * 0.9, Math.PI * 1.95);
      ctx.arc(c.x + 30 * s, c.y + 4 * s, 6 * s, Math.PI * 1.1, Math.PI * 2.05);
      ctx.stroke();
    }
    ctx.beginPath();
    for (const h of hills) { ctx.moveTo(h.x, GROUND); ctx.quadraticCurveTo(h.x + h.w / 2, GROUND - h.h * 2, h.x + h.w, GROUND); }
    ctx.stroke();

    // yol
    ctx.fillStyle = colors.ink;
    ctx.fillRect(0, GROUND, W, 2);
    ctx.fillStyle = colors.muted;
    const off = dist % 64;
    for (let x = -off; x < W; x += 64) ctx.fillRect(x, GROUND + 14, 26, 2);
    for (let x = -(dist * 1.3 % 37); x < W; x += 37) ctx.fillRect(x + 11, GROUND + 6, 3, 1);

    // mesafe direkleri
    for (const p of posts) {
      ctx.fillStyle = colors.muted; ctx.fillRect(p.x + 14, GROUND - 26, 2, 26);
      ctx.fillStyle = colors.paper; ctx.fillRect(p.x, GROUND - 40, 30, 15);
      ctx.strokeStyle = colors.muted; ctx.lineWidth = 1.2; ctx.strokeRect(p.x + 0.5, GROUND - 39.5, 29, 14);
      text(String(p.n), p.x + 15, GROUND - 32.5, 9, colors.ink, 'center', colors.mono, 600);
    }

    for (const p of pickups) bolt(p.x, p.y + Math.sin(t * 5 + p.ph) * 3, 1.1);
    for (const o of obstacles) {
      if (o.kind === 'cone') cone(o.x, o.y);
      else if (o.kind === 'cones') { cone(o.x, o.y); cone(o.x + 24, o.y); }
      else if (o.kind === 'cones3') { cone(o.x, o.y); cone(o.x + 24, o.y); cone(o.x + 48, o.y); }
      else if (o.kind === 'barrier') barrier(o);
      else drone(o);
    }
    for (const p of popups) { ctx.globalAlpha = 1 - p.t / 0.8; text('+10', p.x, p.y, 13, colors.accent, 'center', colors.mono, 700); ctx.globalAlpha = 1; }

    // Wolti
    const top = GROUND - SPRITE_H * FEET + (hero ? hero.y : 0);
    if (state === 'idle') sprite(t % 4 > blinkAt && t % 4 < blinkAt + 0.14 ? 'blink' : 'idle', HERO_X, top);
    else if (state === 'over') sprite(record ? 'cheer' : 'crash', HERO_X, top);
    else if (hero.air) sprite('jump', HERO_X, top);
    else sprite(Math.floor(dist / Math.max(30, speed * 0.11)) % 2 ? 'run2' : 'run1', HERO_X, top, ducking ? 0.68 : 1);

    // gösterge
    const sc = String(score()).padStart(5, '0');
    const bs = String(best).padStart(5, '0');
    const show = !(flash > 0 && Math.floor(flash * 8) % 2);
    ctx.font = `600 13px ${colors.mono}`;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.muted;
    const scW = ctx.measureText(sc + ' m').width;
    ctx.fillText(`${S.best} ${bs}`, W - 16 - scW - 18, 20);
    if (show) { ctx.fillStyle = colors.ink; ctx.fillText(sc + ' m', W - 16, 20); }
    if (bolts) { bolt(20, 20, 0.75); text('× ' + bolts, 32, 20, 12, colors.ink, 'left', colors.mono, 600); }

    if (state === 'idle') text(coarse ? S.startTouch : S.start, W / 2, 64, 14, colors.ink, 'center', colors.font, 600);
    if (state === 'paused') text(S.paused, W / 2, 64, 14, colors.ink);
    if (state === 'over') {
      text(record ? S.record : S.over, W / 2, 58, 20, record ? colors.accent : colors.ink, 'center', colors.font, 800);
      text(coarse ? S.againTouch : S.again, W / 2, 84, 13, colors.muted, 'center', colors.font, 500);
    }
  }

  function loop() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function frame(now) {
      if (!alive) return;
      const dt = Math.min(0.034, (now - last) / 1000);
      last = now;
      if (++colorTick % 30 === 0) readColors();
      if (state === 'run') update(dt);
      else if (state === 'idle') t += dt;
      draw();
      if (state === 'run' || state === 'idle') raf = requestAnimationFrame(frame);
    });
  }

  // --- girişler ---
  const typing = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
  const active = () => (opts.isActive ? opts.isActive() : true);
  function onKey(e) {
    if (typing(e) || !active()) return;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); if (!e.repeat) press(); }
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); if (state === 'run') ducking = true; }
    else if (e.code === 'KeyM' && !e.repeat) { sfx.toggle(); if (opts.onSound) opts.onSound(sfx.on); }
  }
  function onKeyUp(e) {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') release();
    if (e.code === 'ArrowDown' || e.code === 'KeyS') ducking = false;
  }
  let py = null;
  function onDown(e) { e.preventDefault(); canvas.focus({ preventScroll: true }); py = e.clientY; press(); }
  function onMove(e) { if (py !== null && e.clientY - py > 28 && state === 'run') ducking = true; }
  function onUp() { py = null; ducking = false; release(); }
  function onVis() { if (document.hidden && state === 'run') { state = 'paused'; draw(); } }
  const ro = new ResizeObserver(resize);

  addEventListener('keydown', onKey);
  addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointerdown', onDown);
  addEventListener('pointermove', onMove);
  addEventListener('pointerup', onUp);
  addEventListener('pointercancel', onUp);
  document.addEventListener('visibilitychange', onVis);
  ro.observe(canvas);
  for (const f of Object.values(sprites)) f.img.addEventListener('load', () => draw(), { once: true });
  readColors();
  resize();
  last = performance.now();
  loop();

  return {
    start,
    get playing() { return state === 'run'; },
    setLang(l) { S = T[l === 'en' ? 'en' : 'tr']; canvas.setAttribute('aria-label', S.label); draw(); },
    get sound() { return sfx.on; },
    toggleSound() { return sfx.toggle(); },
    refresh() { readColors(); draw(); },
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      removeEventListener('keydown', onKey);
      removeEventListener('keyup', onKeyUp);
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerup', onUp);
      removeEventListener('pointercancel', onUp);
      document.removeEventListener('visibilitychange', onVis);
      ro.disconnect();
    },
  };
}
