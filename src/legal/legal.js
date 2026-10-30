// Hukuki metin sayfaları: fontlar, stil, çerez onayı, içindekiler vurgusu ve çerez tercihi özeti.
import '@fontsource-variable/archivo/standard.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import './legal.css';
import { initConsent } from '../consent.js';
import { readConsent } from '../consent-state.js';

try { const th = localStorage.getItem('ant-theme'); if (th === 'light' || th === 'dark') document.documentElement.dataset.theme = th; } catch { /* */ }

initConsent();

const tr = document.documentElement.lang === 'tr';
const links = [...document.querySelectorAll('.lg-toc a')];
const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    links.forEach((a) => a.classList.remove('is-active'));
    map.get(e.target.id)?.classList.add('is-active');
  }
}, { rootMargin: '-20% 0px -70% 0px' });
document.querySelectorAll('.lg-doc > section[id]').forEach((s) => io.observe(s));

const state = document.getElementById('consent-state');
function showState() {
  if (!state) return;
  const c = readConsent();
  const yes = tr ? 'açık' : 'on';
  const no = tr ? 'kapalı' : 'off';
  state.textContent = c
    ? (tr ? `Şu anki seçimin: analitik ${c.analytics ? yes : no}, işlevsel her zaman açık · ${new Date(c.at).toLocaleString('tr-TR')} · onay kimliği ${c.id}`
      : `Your current choice: analytics ${c.analytics ? yes : no}, functional always on · ${new Date(c.at).toLocaleString('en-GB')} · consent ID ${c.id}`)
    : (tr ? 'Henüz bir seçim yapmadın; analitik kapalı. Zorunlu ve işlevsel teknolojiler her zaman açık.' : 'You have not made a choice yet; analytics is off. Strictly necessary and functional technologies are always on.');
}
showState();
addEventListener('ant-consent', showState);
