// 404 sayfası: kaybolmuş Wolti, istenen adres, ana sayfaya dönüş ve isteyene aynı koşu oyunu.
import '@fontsource-variable/archivo/standard.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import './pit.css';
import { wolti, POSES } from '../wolti.js';
import { createGame } from './game.js';
import { initConsent } from '../consent.js';

const lang = document.documentElement.lang === 'tr' ? 'tr' : 'en';
const $ = (id) => document.getElementById(id);

try { const th = localStorage.getItem('ant-theme'); if (th === 'light' || th === 'dark') document.documentElement.dataset.theme = th; } catch { /* */ }

const art = $('wolti');
art.innerHTML = wolti({ ...POSES.lost, id: 'nf' });
$('path').textContent = location.host + decodeURI(location.pathname).slice(0, 80);

// Wolti imleci izler: gövde hafifçe o yöne eğilir
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!still) {
  let raf = 0;
  addEventListener('pointermove', (e) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const r = art.getBoundingClientRect();
      const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 500));
      const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / 500));
      art.style.transform = `translate(${dx * 6}px, ${dy * 4}px) rotate(${dx * 5}deg)`;
    });
  });
}

let game = null;
const card = $('game-card');
$('play').addEventListener('click', () => {
  card.hidden = false;
  if (!game) {
    game = createGame($('game'), { lang, isActive: () => !card.hidden, onSound: syncSound });
    $('sound').addEventListener('click', () => { game.toggleSound(); syncSound(); });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => game.refresh());
    syncSound();
  }
  card.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' });
  $('game').focus({ preventScroll: true });
});
function syncSound() {
  $('sound').textContent = lang === 'tr' ? (game.sound ? 'Ses açık' : 'Ses kapalı') : (game.sound ? 'Sound on' : 'Sound off');
}

initConsent();
