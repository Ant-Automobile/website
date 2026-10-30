import '@fontsource-variable/archivo/standard.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import './styles.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { hydrateIcons, setIcon } from './icons.js';
import { initConsent } from './consent.js';
import { track } from './consent-state.js';
import { wolti, POSES } from './wolti.js';

hydrateIcons();
initConsent();

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* depolama kapalı olabilir */ } },
};
const once = (el, fn, opts = { threshold: 0.35 }) => {
  if (!el) return;
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { fn(e.target); io.unobserve(e.target); } }), opts);
  io.observe(el);
};

/* ---------- Dil ---------- */
const lang = document.documentElement.lang === 'tr' ? 'tr' : 'en';
const T = {
  tr: {
    pct: (n) => `%${n}`,
    assembly: 'Montaj', assembled: 'Montaj tamam',
    errName: 'Adınızı yazın.', errMail: 'Geçerli bir e-posta adresi yazın.', errMsg: 'Mesajınız en az 10 karakter olmalı.', errKvkk: 'Göndermeden önce KVKK Aydınlatma Metni\'ni okuduğunuzu işaretleyin.',
    kvkkLine: 'KVKK Aydınlatma Metni\'ni (sürüm 1.3) okuduğumu ve bilgilendirildiğimi beyan ederim.',
    steps: ['Kanal açılıyor', 'tamam', 'Alıcı', 'Konu', 'Mesaj', 'e-posta uygulamanıza aktarıldı'],
  },
  en: {
    pct: (n) => `${n}%`,
    assembly: 'Assembly', assembled: 'Assembly complete',
    errName: 'Please enter your name.', errMail: 'Please enter a valid email address.', errMsg: 'Your message must be at least 10 characters.', errKvkk: 'Please confirm that you have read the Privacy Notice before sending.',
    kvkkLine: 'I confirm that I have read the Privacy Notice (version 1.3) and have been informed.',
    steps: ['Opening channel', 'ok', 'Recipient', 'Subject', 'Message', 'handed to your email app'],
  },
}[lang];
// Elle seçilen dil hatırlanır; sunucu ülkeye göre yönlendirmeden önce bu tercihe bakar
$$('[data-lang]').forEach((a) => a.addEventListener('click', () => {
  document.cookie = `lang=${a.dataset.lang}; path=/; max-age=31536000; samesite=lax; secure`;
}));

/* ---------- Tema ---------- */
const themeListeners = [];
function currentTheme() {
  const t = document.documentElement.dataset.theme;
  if (t) return t;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function syncThemeIcon() {
  setIcon($('#themeBtn i'), currentTheme() === 'dark' ? 'moon' : 'sun-dim');
  themeListeners.forEach((f) => f());
}
$('#themeBtn').addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  store.set('ant-theme', next);
  syncThemeIcon();
  track('theme_switch', { to: next });
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncThemeIcon);
syncThemeIcon();

/* ---------- Gösterge paneli: aktif bölüm ibresi + odometre ---------- */
const needle = $('.gears__needle');
const mark = $('.gears__mark');
const gearLinks = $$('.gears a');
function moveNeedle(link) {
  gearLinks.forEach((a) => a.classList.toggle('is-active', a === link));
  if (!link) { needle.style.opacity = '0'; mark.style.opacity = '0'; return; }
  needle.style.opacity = '1';
  mark.style.opacity = '1';
  needle.style.transform = `translateX(${link.offsetLeft}px) scaleX(${link.offsetWidth / 100})`;
  mark.style.transform = `translateX(${link.offsetLeft + link.offsetWidth / 2}px)`;
}
window.addEventListener('resize', () => moveNeedle($('.gears a.is-active')));

const menuBtn = $('#menuBtn');
const mobileNav = $('#mobileNav');
menuBtn.addEventListener('click', () => {
  const open = menuBtn.getAttribute('aria-expanded') !== 'true';
  menuBtn.setAttribute('aria-expanded', String(open));
  mobileNav.hidden = !open;
});
mobileNav.addEventListener('click', (e) => {
  if (e.target.closest('a')) { menuBtn.setAttribute('aria-expanded', 'false'); mobileNav.hidden = true; }
});

/* ---------- Hero: kontak ---------- */
(function hero() {
  const stage = $('#stage');
  const img = $('.car__img', stage);
  const go = () => {
    if (reduced) { stage.classList.add('is-on', 'is-done'); return; }
    requestAnimationFrame(() => stage.classList.add('is-on'));
    setTimeout(() => stage.classList.add('is-done'), 3100);
  };
  if (img.complete) go(); else img.addEventListener('load', go, { once: true });
  if (reduced || !window.matchMedia('(hover: hover)').matches) return;
  // İmleç: araç hafifçe karşı yöne kayar, gövdedeki yansıma imleci izler
  $('#top').addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    stage.style.setProperty('--mx', `${(-x * 14).toFixed(1)}px`);
    stage.style.setProperty('--my', `${(-y * 6).toFixed(1)}px`);
    stage.style.setProperty('--sx', `${(100 - (x + 0.5) * 100).toFixed(1)}%`);
  });
  $('#top').addEventListener('pointerleave', () => {
    stage.style.setProperty('--mx', '0px');
    stage.style.setProperty('--my', '0px');
    stage.style.setProperty('--sx', '50%');
  });
})();

/* ---------- Mekanik sayaçlar ---------- */
$$('.odometer').forEach((el) => {
  const value = el.dataset.value;
  el.setAttribute('aria-label', value);
  const strips = [];
  [...value].forEach((ch) => {
    if (/\d/.test(ch)) {
      const d = document.createElement('span');
      d.className = 'odometer__digit';
      d.setAttribute('aria-hidden', 'true');
      const strip = document.createElement('span');
      strip.className = 'odometer__strip';
      // İki tur: sayaç önce tam döner, sonra değere oturur
      for (let k = 0; k < 20; k++) {
        const s = document.createElement('span');
        s.textContent = k % 10;
        strip.appendChild(s);
      }
      d.appendChild(strip);
      el.appendChild(d);
      strips.push({ strip, n: Number(ch) + 10 });
    } else {
      const s = document.createElement('span');
      s.className = 'odometer__sep';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = ch;
      el.appendChild(s);
    }
  });
  const roll = () => strips.forEach(({ strip, n }, i) => {
    strip.style.transitionDelay = `${i * 0.09}s`;
    strip.style.transform = `translateY(${-n}em)`;
  });
  if (reduced) roll(); else once(el, roll, { threshold: 0.6 });
});

/* ---------- Hakkımızda: montaj ---------- */
(function about() {
  const canvas = $('#viewerCanvas');
  const pct = $('#assemblyPct');
  const label = $('#assemblyLabel');
  let viewer = null;
  let progress = reduced ? 1 : 0;

  const setP = (p) => {
    progress = p;
    pct.textContent = T.pct(Math.round(p * 100));
    label.textContent = p >= 0.999 ? T.assembled : T.assembly;
    viewer?.setProgress(p);
  };

  const supportsGL = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } })();
  if (!supportsGL) {
    $('.viewer__fallback').hidden = false;
    $('#viewerLoading').classList.add('is-done');
    canvas.hidden = true;
  } else {
    once($('.about'), async () => {
      const { createViewer } = await import('./viewer.js');
      viewer = createViewer(canvas, { onProgress: (p) => { $('#viewerProgress').style.transform = `scaleX(${p})`; } });
      themeListeners.push(() => viewer.refreshTheme());
      viewer.ready.then(() => {
        $('#viewerLoading').classList.add('is-done');
        viewer.setProgress(progress);
      }).catch(() => {
        $('.viewer__fallback').hidden = false;
        canvas.hidden = true;
        $('#viewerLoading').classList.add('is-done');
      });
      const io = new IntersectionObserver(([e]) => (e.isIntersecting ? viewer.start() : viewer.stop()));
      io.observe(canvas);
    }, { rootMargin: '600px 0px' });
  }
  setP(progress);
  if (reduced) return;

  const mm = gsap.matchMedia();
  mm.add('(min-width: 981px)', () => {
    ScrollTrigger.create({
      trigger: '#aboutPin',
      start: 'top top',
      end: '+=130%',
      pin: true,
      scrub: true,
      onUpdate: (s) => setP(s.progress),
    });
  });
  mm.add('(max-width: 980px)', () => {
    ScrollTrigger.create({ trigger: '#viewer', start: 'top 85%', end: 'bottom 40%', scrub: true, onUpdate: (s) => setP(s.progress) });
  });
})();

/* ---------- Vizyon: far ışığı kelimeleri aydınlatır ---------- */
(function vision() {
  const el = $('#visionText');
  const words = el.textContent.trim().split(/\s+/);
  el.setAttribute('aria-label', el.textContent.trim());
  el.innerHTML = words.map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
  const spans = $$('.w', el);
  if (reduced) { spans.forEach((s) => s.classList.add('is-lit')); return; }
  ScrollTrigger.create({
    trigger: el,
    start: 'top 78%',
    end: 'bottom 42%',
    scrub: true,
    onUpdate(self) {
      const n = self.progress * (spans.length + 1);
      spans.forEach((s, i) => {
        s.classList.toggle('is-lit', i < n - 1);
        s.classList.toggle('is-edge', i >= n - 1 && i < n);
      });
    },
  });
})();

/* ---------- Misyon: rota ---------- */
(function route() {
  const svg = $('#routeSvg');
  const lit = $('#routeLit');
  const car = $('#routeCar');
  const stops = $$('.stop');
  const len = lit.getTotalLength();
  lit.style.strokeDasharray = `${len}`;
  lit.style.strokeDashoffset = `${len}`;
  const vb = svg.viewBox.baseVal;

  // Her durak için rota üzerinde bir işaret ve metne inen ince bir çizgi
  const pins = stops.map((s) => {
    const pin = document.createElement('span');
    pin.className = 'route__pin';
    const tick = document.createElement('span');
    tick.className = 'route__tick';
    $('#route').append(tick, pin);
    return { at: Number(s.dataset.at), pin, tick, stop: s };
  });
  function layoutPins() {
    const w = svg.clientWidth, h = svg.clientHeight;
    const top = $('.route__stops').offsetTop;
    pins.forEach(({ at, pin, tick }) => {
      const pt = lit.getPointAtLength(len * at);
      const x = pt.x * (w / vb.width), y = pt.y * (h / vb.height);
      pin.style.left = `${x}px`; pin.style.top = `${y}px`;
      tick.style.left = `${x}px`; tick.style.top = `${y + 10}px`; tick.style.height = `${Math.max(0, top - y - 22)}px`;
    });
  }
  layoutPins();
  new ResizeObserver(layoutPins).observe(svg);

  function place(p) {
    lit.style.strokeDashoffset = `${len * (1 - p)}`;
    const w = svg.clientWidth, h = svg.clientHeight;
    const sx = w / vb.width, sy = h / vb.height;
    const a = lit.getPointAtLength(len * p);
    const b = lit.getPointAtLength(Math.min(len, len * p + 1));
    const c = lit.getPointAtLength(Math.max(0, len * p - 1));
    const ang = Math.atan2((b.y - c.y) * sy, (b.x - c.x) * sx);
    car.style.transform = `translate(${a.x * sx}px, ${a.y * sy}px) rotate(${ang}rad)`;
    pins.forEach(({ at, pin, stop }) => { const r = p >= at - 0.02; pin.classList.toggle('is-reached', r); stop.classList.toggle('is-reached', r); });
  }
  if (reduced) { place(1); return; }
  place(0);
  let last = 0;
  ScrollTrigger.create({
    trigger: '#route',
    start: 'top 70%',
    end: 'bottom 55%',
    scrub: 0.6,
    onUpdate: (s) => { last = s.progress; place(last); },
    onRefresh: () => place(last),
  });
})();

/* ---------- Değerler: kalibrasyon ---------- */
$$('.gauge').forEach((g, i) => {
  once(g, () => setTimeout(() => g.classList.add('is-cal'), i * 160), { threshold: 0.6 });
  g.addEventListener('animationend', (e) => {
    // Hover animasyonu bitince yeniden tetiklenebilmesi için
    if (e.animationName === 'recal') g.querySelector('.gauge__needle').style.animation = 'none';
  });
  g.addEventListener('mouseleave', () => { g.querySelector('.gauge__needle').style.animation = ''; });
  g.addEventListener('blur', () => { g.querySelector('.gauge__needle').style.animation = ''; });
});

/* ---------- Çalışma alanları: 3B katmanlar ---------- */
(function layers() {
  const btns = $$('#layersList button');
  const DWELL = 3400;
  let auto = !reduced, timer = 0, cur = 0, l3d = null, explode = reduced ? 1 : 0;
  const select = (i, fromAuto = false) => {
    cur = i;
    btns.forEach((b) => {
      const on = Number(b.dataset.layer) === i;
      b.classList.toggle('is-active', on);
      b.classList.toggle('is-auto', on && fromAuto);
    });
    l3d?.setActive(i);
  };
  const step = () => { select((cur + 1) % btns.length, true); timer = setTimeout(step, DWELL); };
  const stopAuto = () => { auto = false; clearTimeout(timer); btns.forEach((b) => b.classList.remove('is-auto')); };
  btns.forEach((b) => {
    const i = Number(b.dataset.layer);
    b.addEventListener('click', () => { stopAuto(); select(i); });
    b.addEventListener('mouseenter', () => { stopAuto(); select(i); });
    b.addEventListener('focus', () => { stopAuto(); select(i); });
  });
  select(0);

  const canvas = $('#layersCanvas');
  const fallback = () => { canvas.hidden = true; $('.layers3d__fallback').hidden = false; };
  let gl = false;
  try { gl = !!document.createElement('canvas').getContext('webgl2'); } catch { gl = false; }
  if (!gl) fallback();
  else {
    once($('.layers'), async () => {
      const { createLayers } = await import('./layers3d.js');
      l3d = createLayers(canvas);
      themeListeners.push(() => l3d.refreshTheme());
      l3d.setExplode(explode);
      l3d.setActive(cur);
      l3d.ready.catch(fallback);
      new IntersectionObserver(([e]) => (e.isIntersecting ? l3d.start() : l3d.stop())).observe(canvas);
    }, { rootMargin: '700px 0px' });
  }

  // Bölüme girerken model katmanlarına ayrılır
  if (!reduced) {
    ScrollTrigger.create({
      trigger: '#stack', start: 'top 85%', end: 'center 55%', scrub: 0.8,
      onUpdate: (s) => { explode = s.progress; l3d?.setExplode(explode); },
    });
  }

  // Bölüm görünürken katmanları sırayla gezer; kullanıcı dokunduğu anda durur
  const io = new IntersectionObserver(([e]) => {
    clearTimeout(timer);
    if (e.isIntersecting && auto) { select(cur, true); timer = setTimeout(step, DWELL); }
  }, { threshold: 0.5 });
  io.observe($('#stack'));
})();

/* ---------- Yolculuk: ilerleme hattı + görsel paralaksı ---------- */
(function journey() {
  const track = $('#track');
  const items = $$('.milestones li', track);
  items.forEach((li, i) => li.style.setProperty('--i', i));
  // "Şu an": Tasarım tamamlandı, prototipe geçiliyor (ikinci ve üçüncü durak arası)
  const place = () => {
    const a = items[1].offsetLeft + 6, b = items[2].offsetLeft + 6;
    const x = a + (b - a) * 0.45;
    $('#trackFill').style.transform = track.classList.contains('is-on') ? `scaleX(${x / track.clientWidth})` : 'scaleX(0)';
    $('#trackNow').style.left = `${x}px`;
  };
  once(track, () => {
    track.classList.add('is-on');
    place();
    setTimeout(() => $('.journey').classList.add('is-lit'), reduced ? 0 : 1700);
  }, { threshold: 0.5 });
  new ResizeObserver(place).observe(track);
  if (reduced) return;
  gsap.fromTo('#rear', { '--py': '24px' }, {
    '--py': '-24px', ease: 'none',
    scrollTrigger: { trigger: '#journeyFrame', start: 'top bottom', end: 'bottom top', scrub: true },
  });
})();

/* ---------- Ekip: CAN hattı ---------- */
$$('.node').forEach((n, i) => n.style.setProperty('--i', i));
once($('#bus'), (el) => el.classList.add('is-on'), { threshold: 0.4 });

/* ---------- Bölüm girişleri ---------- */
$$('.section .h2, .section .lede, .perks li, .gauges, .contact__addr, .form').forEach((el) => {
  if (reduced) return;
  el.classList.add('reveal');
  once(el, () => el.classList.add('is-in'), { threshold: 0.2 });
});

/* ---------- Konu ön seçimi ---------- */
$$('[data-subject]').forEach((a) => a.addEventListener('click', () => { $('#f-topic').value = a.dataset.subject; }));

/* ---------- İletişim: kanal açma ---------- */
(function contact() {
  const form = $('#contactForm');
  const channel = $('#channel');
  const fields = {
    name: [$('#f-name'), $('#e-name'), (v) => (v.trim().length > 1 ? '' : T.errName)],
    email: [$('#f-mail'), $('#e-mail'), (v) => (/^\S+@\S+\.\S+$/.test(v.trim()) ? '' : T.errMail)],
    message: [$('#f-msg'), $('#e-msg'), (v) => (v.trim().length > 9 ? '' : T.errMsg)],
    kvkk: [$('#f-kvkk'), $('#e-kvkk'), (v) => (v ? '' : T.errKvkk)],
  };
  // Wolti: selam verir, form yazılırken ona bakar, hata olunca endişelenir, gönderince sevinir
  const mascot = $('#wolti');
  const MOODS = {
    hello: POSES.lean,
    listen: { ...POSES.lean, look: [4, 3], brows: 'raised', antennae: 'perk' },
    worried: { ...POSES.lean, look: [3, 3], brows: 'worried', mouth: 'wobble', antennae: 'droop' },
    cheer: { ...POSES.cheer, tail: 'right' },
    love: { ...POSES.lean, eyes: 'wink', props: ['heart'] },
  };
  let mood = '', moodTimer = 0;
  const setMood = (m, back) => {
    clearTimeout(moodTimer);
    if (back) moodTimer = setTimeout(() => setMood(form.contains(document.activeElement) ? 'listen' : 'hello'), back);
    if (m === mood) return;
    mood = m;
    mascot.innerHTML = wolti({ ...MOODS[m], title: 'Wolti', id: 'cw' });
    if (reduced) return;
    mascot.classList.remove('is-pop');
    void mascot.offsetWidth;
    mascot.classList.add('is-pop');
  };
  setMood('hello');
  form.addEventListener('focusin', () => { if (mood === 'hello') setMood('listen'); });
  form.addEventListener('focusout', () => setTimeout(() => { if (!form.contains(document.activeElement) && mood === 'listen') setMood('hello'); }));
  mascot.addEventListener('click', () => setMood('cheer', 1600));

  const check = (key) => {
    const [input, err, rule] = fields[key];
    const msg = rule(input.type === 'checkbox' ? input.checked : input.value);
    err.textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  };
  Object.keys(fields).forEach((k) => {
    const input = fields[k][0];
    if (input.type === 'checkbox') input.addEventListener('change', () => check(k));
    else input.addEventListener('blur', () => { if (input.value) check(k); });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ok = Object.keys(fields).map(check).every(Boolean);
    if (!ok) { setMood('worried', 2600); Object.values(fields).find(([i]) => i.getAttribute('aria-invalid') === 'true')[0].focus(); return; }
    setMood('cheer');
    const d = Object.fromEntries(new FormData(form));
    const subject = `[${d.topic}] ${d.name}${d.org ? `, ${d.org}` : ''}`;
    const body = `${d.message}\n\n${d.name}${d.org ? `\n${d.org}` : ''}\n${d.email}\n\n${T.kvkkLine}`;
    const [sOpen, sOk, sTo, sTopic, sMsg, sHanded] = T.steps;
    const steps = [
      [sOpen, sOk],
      [sTo, 'info@antautomobile.org'],
      [sTopic, d.topic],
      [sMsg, sHanded],
    ];
    channel.hidden = false;
    channel.innerHTML = steps.map(([a, b]) => `<p><span>${a}</span><span>${b.replace(/</g, '&lt;')}</span></p>`).join('');
    const rows = $$('p', channel);
    for (let i = 0; i < rows.length; i++) {
      await new Promise((r) => setTimeout(r, reduced ? 0 : 320));
      rows[i].classList.add('is-in', 'is-ok');
    }
    setMood('love', 4000);
    window.location.href = `mailto:info@antautomobile.org?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
})();

/* ---------- Bölüm ibresi tetikleyicileri (pin'lerden sonra oluşturulmalı) ---------- */
const sectionIds = gearLinks.map((a) => a.dataset.gear);
ScrollTrigger.create({
  start: 0,
  end: 'max',
  onUpdate(self) { $('#odoFill').style.transform = `scaleX(${self.progress})`; },
});
sectionIds.forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  ScrollTrigger.create({
    trigger: el,
    start: 'top 45%',
    end: 'bottom 45%',
    onToggle(self) { if (self.isActive) moveNeedle(gearLinks.find((a) => a.dataset.gear === id)); },
  });
});
ScrollTrigger.create({ trigger: '#top', start: 'top top', end: 'bottom 45%', onToggle: (s) => s.isActive && moveNeedle(null) });
ScrollTrigger.create({ trigger: '.layers', start: 'top 45%', end: 'bottom 45%', onToggle: (s) => s.isActive && moveNeedle(gearLinks[3]) });
ScrollTrigger.create({ trigger: '.support', start: 'top 45%', end: 'max', onToggle: (s) => s.isActive && moveNeedle(null) });

/* ---------- Bölüm geçişi: düğme kısa bir dolumla tepki verir, sayfa yumuşakça kayar ---------- */
(function transit() {
  const navH = () => $('#cluster').offsetHeight;
  let busy = false;

  const arrive = (el) => {
    const line = document.createElement('span');
    line.className = 'arrival';
    const host = el.closest('section') || el;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    line.style.top = '0';
    host.appendChild(line);
    setTimeout(() => line.remove(), 1500);
  };

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const id = a.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    if (busy) return;
    // Hedef her seferinde yeniden ölçülür: sayfa yüklenirken görseller ve 3B model gelince ScrollTrigger
    // yerleşimi yeniden hesaplar ve bölümlerin konumu değişir
    const targetY = () => (id === 'top' ? 0 : target.getBoundingClientRect().top + window.scrollY - (navH() - 1));
    history.replaceState(null, '', `#${id}`);
    if (reduced) {
      window.scrollTo(0, targetY());
      settle();
      target.focus?.({ preventScroll: true });
      return;
    }

    busy = true;
    // 1) Basılan düğme yüklenir
    const isPlug = a.classList.contains('plug');
    const isBtn = a.classList.contains('btn');
    if (isPlug) a.classList.add('is-charging');
    if (isBtn) a.classList.add('is-loading');
    const charge = isPlug ? 360 : isBtn ? 260 : 0;

    // 2) Yumuşak kayış: mesafeye göre 0,6-1,1 sn. autoKill kullanılmaz: ScrollTrigger'ın yeniden
    // hesaplaması da kaydırma konumunu değiştirdiği için kayış yarıda kesiliyordu. Kayışı yalnızca
    // kullanıcının kendi kaydırması durdurur.
    let tween = null;
    const run = () => {
      tween?.kill();
      const y = targetY();
      const dist = Math.abs(y - window.scrollY);
      tween = gsap.to(window, {
        scrollTo: { y, autoKill: false },
        duration: gsap.utils.clamp(0.6, 1.1, 0.5 + dist / 6000),
        ease: 'power3.inOut',
        onComplete: done,
      });
    };
    const onRefresh = () => { if (busy && tween) run(); };
    const userScroll = (ev) => {
      if (ev.type === 'keydown' && !['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(ev.key)) return;
      tween?.kill();
      done(true);
    };
    const stopEvents = ['wheel', 'touchstart', 'keydown'];
    stopEvents.forEach((t) => window.addEventListener(t, userScroll, { passive: true }));
    ScrollTrigger.addEventListener('refresh', onRefresh);
    setTimeout(run, charge);

    function done(byUser) {
      if (!busy) return;
      busy = false;
      stopEvents.forEach((t) => window.removeEventListener(t, userScroll));
      ScrollTrigger.removeEventListener('refresh', onRefresh);
      a.classList.remove('is-charging', 'is-loading');
      if (byUser === true) return;
      if (id !== 'top') arrive(target);
      settle();
      // Mobil menü ve klavye kullanıcıları için odağı hedefe taşı
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }

    // Vardıktan sonraki 2 saniyede yerleşim yeniden hesaplanırsa (geç gelen görsel) hedefte kal;
    // kullanıcı bu arada kendisi kaydırırsa bırak
    function settle() {
      const stay = () => window.scrollTo(0, targetY());
      const off = () => {
        ScrollTrigger.removeEventListener('refresh', stay);
        stopEvents.forEach((t) => window.removeEventListener(t, off));
      };
      ScrollTrigger.addEventListener('refresh', stay);
      stopEvents.forEach((t) => window.addEventListener(t, off, { passive: true, once: true }));
      setTimeout(off, 2000);
    }
  });
})();

window.addEventListener('load', () => ScrollTrigger.refresh());

