// Çerez onayı arayüzü: ilk ziyarette alt bant, ayrıntılı tercih penceresi ve onayın etkileri.
// İşlevsel (çevrim dışı bekleme sayfası) zorunlu sayılır ve her zaman açıktır. Analitik (yalnızca kendi
// ölçüm sistemimiz: /a/t.js + birinci taraf ant_a çerezi) varsayılan olarak kapalıdır; onay verilmeden
// betik yüklenmez, çerez yazılmaz ve sunucumuza ölçüm isteği gitmez. Üçüncü taraf ölçüm aracı yoktur.
import './consent.css';
import { readConsent, writeConsent, previousAnalyticsConsent, POLICY_VERSION } from './consent-state.js';

// Kendi ölçüm betiğimiz (aynı origin, /a/ → analitik sunucusu). İstemci kimliği ant_a çerezindedir: sunucu
// yazar ve her ziyarette yeniler (Domain=antautomobile.org, 13 ay); HttpOnly değildir ki onay yokken burada
// sunucuya gitmeden silinebilsin. ant_a_cid/ant_a_s eski sürümün yerel depolama kayıtlarıdır: betik onaylı ilk
// açılışta kimliği çereze taşır ve siler; onay yoksa burada silinir.
const TRACKER_SRC = '/a/t.js';
const TRACKER_COOKIE = 'ant_a';
const TRACKER_LS = ['ant_a_cid', 'ant_a_s'];
const TRACKER_SS = ['ant_a_dbg'];
// Eski sürümlerin bıraktığı kayıtlar; artık kullanılmıyor, her açılışta temizlenir
const LEGACY_KEYS = ['ant-pit-best', 'ant-pit-sound', 'ant-pit-lang'];

const T = {
  tr: {
    region: 'Çerez tercihleri',
    bannerTitle: 'Çerezler ve benzeri teknolojiler',
    bannerText: 'Sitenin çalışması için gereken zorunlu ve işlevsel teknolojileri (internet yokken bekleme sayfamızı göstermek gibi) her zaman kullanıyoruz. Ziyaretleri kendi ölçüm sistemimizle ve birinci taraf bir çerezle ölçmek (analitik) için ise onayına ihtiyacımız var; bu veriler yalnızca kendi sunucumuzda tutulur. İstediğin zaman değiştirebilirsin.',
    policy: 'Çerez Politikası', notice: 'KVKK Aydınlatma Metni',
    acceptAll: 'Tümünü kabul et', rejectAll: 'Tümünü reddet', manage: 'Tercihleri yönet', save: 'Seçimlerimi kaydet',
    dialogTitle: 'Çerez tercihleri',
    dialogLead: 'Her kategori için ne kullandığımızı aşağıda görebilirsin. Zorunlu ve işlevsel olanlar dışındakiler yalnızca sen açarsan çalışır. Onayını aynı yerden istediğin an geri alabilirsin; geri almak, o zamana kadarki işlemelerin hukuka uygunluğunu etkilemez.',
    always: 'Her zaman açık', off: 'Kapalı', on: 'Açık', unused: 'Kullanılmıyor',
    name: 'Ad', kind: 'Tür', purpose: 'Amaç', duration: 'Süre', provider: 'Sağlayıcı',
    saved: 'Tercihlerin kaydedildi.', close: 'Kapat', current: (c) => (c ? `Son seçim: ${new Date(c.at).toLocaleString('tr-TR')} · Kimlik ${c.id}` : 'Henüz bir seçim yapmadın.') + (trackerId() ? ` · Ölçüm kimliği ${trackerId()}` : ''),
    cats: {
      necessary: ['Zorunlu', 'Sitenin güvenli ve senin seçtiğin şekilde çalışması için gereklidir. Kapatılamaz; hukuki dayanağı KVKK m. 5/2-c ve 5/2-f ile GDPR m. 6/1-b ve 6/1-f\'dir.'],
      functional: ['İşlevsel', 'İnternet bağlantın koptuğunda tarayıcının hata sayfası yerine bekleme sayfamızı gösterebilmek için o sayfanın bir kopyası tarayıcına kaydedilir. Bu kopya bize hiçbir şey göndermez. Zorunlu sayılır ve kapatılamaz; dilersen tarayıcının site verilerini temizleyerek silebilirsin.'],
      analytics: ['Analitik', 'Hangi sayfaların ne kadar ziyaret edildiğini, ziyaretçilerin siteye nereden geldiğini ve sitede nasıl gezindiğini görmek için kendi ölçüm sistemimizi kullanırız. Sunucumuz tarayıcına takma adlı bir istemci kimliği taşıyan birinci taraf bir çerez (ant_a) yazar; sayfa görüntüleme, kaydırma, tıklama gibi her etkileşim bu kimlikle bir olay olarak yalnızca kendi sunucumuza gönderilir. IP adresin saklanmaz, veriler Türkiye\'deki sunucumuzda 14 ay tutulur, kimseyle paylaşılmaz. Reklam ya da profil oluşturma için kullanılmaz.'],
      marketing: ['Pazarlama ve reklam', 'Reklam, yeniden hedefleme veya sosyal medya izleme araçları kullanmıyoruz. Sayfalarımıza üçüncü taraf içerik gömülmez.'],
    },
    stmtTitle: 'Açık rıza beyanı', stmtLink: 'Açık rıza metninin tamamı', stmtAnchor: '#acik-riza',
    stmt: {
      analytics: 'Bu düğmeyi açarak, ziyaretimin site istatistikleri amacıyla sitenin kendi ölçüm sistemiyle ölçülmesine ve bunun için tarayıcıma takma adlı bir istemci kimliği taşıyan birinci taraf bir çerez (ant_a) kaydedilmesine açık rıza veriyorum.',
    },
    kinds: { cookie: 'Çerez (birinci taraf)', cookie3: 'Çerez (Cloudflare)', ls: 'Yerel depolama', ss: 'Oturum deposu', sw: 'Service worker ve önbellek', script1: 'Betik (birinci taraf)' },
  },
  en: {
    region: 'Cookie preferences',
    bannerTitle: 'Cookies and similar technologies',
    bannerText: 'We always use the strictly necessary and functional technologies the site needs to work (such as showing our waiting page when you lose your connection). To measure visits with our own measurement system and a first-party cookie (analytics), we need your consent; this data stays on our own server. You can change this at any time.',
    policy: 'Cookie Policy', notice: 'Privacy Notice',
    acceptAll: 'Accept all', rejectAll: 'Reject all', manage: 'Manage preferences', save: 'Save my choices',
    dialogTitle: 'Cookie preferences',
    dialogLead: 'Below you can see what we use in each category. Everything except the strictly necessary and functional items only runs if you switch it on. You can withdraw your consent here at any time; withdrawing does not affect the lawfulness of processing before the withdrawal.',
    always: 'Always on', off: 'Off', on: 'On', unused: 'Not used',
    name: 'Name', kind: 'Type', purpose: 'Purpose', duration: 'Duration', provider: 'Provider',
    saved: 'Your preferences have been saved.', close: 'Close', current: (c) => (c ? `Last choice: ${new Date(c.at).toLocaleString('en-GB')} · ID ${c.id}` : 'You have not made a choice yet.') + (trackerId() ? ` · Analytics ID ${trackerId()}` : ''),
    cats: {
      necessary: ['Strictly necessary', 'Needed for the site to work securely and the way you chose. They cannot be switched off; the legal basis is Art. 6(1)(b) and 6(1)(f) GDPR and Art. 5(2)(c) and 5(2)(f) of the Turkish KVKK.'],
      functional: ['Functional', 'To show our waiting page instead of a browser error when your connection drops, a copy of that page is stored in your browser. This copy sends nothing to us. It is treated as strictly necessary and cannot be switched off; you can remove it by clearing this site\'s data in your browser.'],
      analytics: ['Analytics', 'We use our own measurement system to see which pages are visited, where visitors come from and how they move through the site. Our server stores a first-party cookie (ant_a) with a pseudonymous client ID in your browser; each interaction, such as a page view, scroll or click, is sent with this ID as an event to our own server only. Your IP address is not stored, the data is kept on our server in Türkiye for 14 months and is not shared with anyone. It is never used for advertising or profiling.'],
      marketing: ['Marketing and advertising', 'We do not use advertising, retargeting or social media tracking tools. No third-party content is embedded in our pages.'],
    },
    stmtTitle: 'Consent statement', stmtLink: 'Full consent statement', stmtAnchor: '#statements',
    stmt: {
      analytics: 'By switching this on, I consent to my visit being measured with the site\'s own measurement system for site statistics, and to a first-party cookie (ant_a) with a pseudonymous client ID being stored in my browser for that purpose.',
    },
    kinds: { cookie: 'Cookie (first party)', cookie3: 'Cookie (Cloudflare)', ls: 'Local storage', ss: 'Session storage', sw: 'Service worker and cache', script1: 'Script (first party)' },
  },
};

const ITEMS = {
  necessary: [
    ['ant_consent', 'cookie', { tr: 'Çerez tercihlerini, seçim tarihini ve rastgele bir onay kimliğini saklar.', en: 'Stores your cookie choices, the date of the choice and a random consent ID.' }, { tr: '180 gün', en: '180 days' }],
    ['lang', 'cookie', { tr: 'TR/EN düğmesiyle seçtiğin dili hatırlar.', en: 'Remembers the language you picked with the TR/EN button.' }, { tr: '1 yıl', en: '1 year' }],
    ['ant-theme', 'ls', { tr: 'Açık/koyu tema düğmesiyle yaptığın seçimi hatırlar.', en: 'Remembers your light/dark theme choice.' }, { tr: 'Sen silene kadar', en: 'Until you clear it' }],
    ['__cf_bm, cf_clearance, _cfuvid', 'cookie3', { tr: 'Cloudflare\'in bot ve saldırı koruması; yalnızca Cloudflare gerekli gördüğünde bırakılır.', en: 'Cloudflare bot and attack protection; only set when Cloudflare deems it necessary.' }, { tr: 'Oturum – 1 yıl', en: 'Session to 1 year' }],
  ],
  functional: [
    ['sw.js · ant-pit-v1', 'sw', { tr: 'İnternet yokken gösterilen bekleme sayfasının kopyası.', en: 'Copy of the waiting page shown when you are offline.' }, { tr: 'Site verilerini temizleyene kadar', en: 'Until you clear site data' }],
  ],
  analytics: [
    ['/a/t.js', 'script1', { tr: 'Kendi ölçüm betiğimiz: sayfa görüntüleme, oturum başlangıcı, ilk ziyaret, sayfada geçen etkin süre, kaydırma, dış bağlantı ve dosya tıklamaları, form başlatma ve gönderme (içerik hiçbir zaman), dil ve tema düğmeleri, oyun ve bulunamayan sayfa gibi etkileşimleri olay olarak sunucumuza gönderir; her olayda sayfa adresi ve başlığı, yönlendiren sayfa, kampanya parametreleri (UTM), ekran boyutu ve dil bulunur. Veriler Türkiye\'deki sunucumuzda 14 ay saklanır, IP adresi saklanmaz.', en: 'Our own measurement script: sends interactions such as page views, session starts, first visits, time actively spent on the page, scrolling, outbound link and file clicks, starting and sending forms (never their content), the language and theme buttons, the game and page-not-found views to our server as events; each event carries the page address and title, referrer, campaign parameters (UTM), screen size and language. Data is kept on our server in Türkiye for 14 months; IP addresses are not stored.' }, { tr: 'Betiğin kendisi bir şey saklamaz', en: 'The script itself stores nothing' }],
    ['ant_a', 'cookie', { tr: 'Rastgele, takma adlı istemci kimliği; geri dönen ziyaretleri saymak ve ziyaretleri oturumlara ayırmak için. Sunucumuz yazar ve her ziyarette yeniler; antautomobile.org ve alt alan adlarında geçerlidir. Oturumlar cihazında değil, sunucumuzda bu kimlikten hesaplanır (30 dakika işlem yapılmazsa oturum biter).', en: 'Random pseudonymous client ID, to count returning visits and group visits into sessions. Set and renewed on each visit by our server; valid on antautomobile.org and its subdomains. Sessions are worked out on our server from this ID, not on your device (a session ends after 30 minutes without activity).' }, { tr: '13 ay, her ziyarette yenilenir; rızanı geri alınca hemen silinir', en: '13 months, renewed on each visit; deleted at once when you withdraw consent' }],
    ['ant_a_dbg', 'ss', { tr: 'Geliştirici test işareti; yalnızca adreste ?ant_debug=1 varsa yazılır.', en: 'Developer test flag; only set when the address contains ?ant_debug=1.' }, { tr: 'Sekme kapanana kadar', en: 'Until the tab is closed' }],
  ],
};

const lang = document.documentElement.lang === 'tr' ? 'tr' : 'en';
const L = T[lang];
const policyUrl = lang === 'tr' ? '/tr/cerez-politikasi/' : '/cookies/';
const noticeUrl = lang === 'tr' ? '/tr/kvkk/' : '/privacy/';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

let banner = null;
let dialog = null;

// Analitik istemci kimliği (ant_a): tercih penceresinde gösterilir ki ziyaretçi silme başvurusunda bildirebilsin
// (onayı geri alınca çerez silindiği için önce burada görünür)
function trackerId() {
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${TRACKER_COOKIE}=(1\\.[0-9a-f]{16,40})(?:;|$)`));
  return m ? m[1] : '';
}

function clearTracker({ keepLegacy = false } = {}) {
  try { if (window.antA && typeof window.antA.optOut === 'function') window.antA.optOut(); } catch { /* */ }
  // Çerez sunucuda yazılır ama HttpOnly değildir: aynı Domain/Path ile süresi geçmiş olarak yazınca silinir
  const host = location.hostname.endsWith('antautomobile.org') ? '; Domain=antautomobile.org' : '';
  try {
    if (new RegExp(`(?:^|;\\s*)${TRACKER_COOKIE}=`).test(document.cookie)) {
      document.cookie = `${TRACKER_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${host}${location.protocol === 'https:' ? '; Secure' : ''}`;
    }
  } catch { /* */ }
  if (!keepLegacy) { try { TRACKER_LS.forEach((k) => localStorage.removeItem(k)); } catch { /* depolama kapalı */ } }
  try { TRACKER_SS.forEach((k) => sessionStorage.removeItem(k)); } catch { /* depolama kapalı */ }
}

function applyEffects(c, prev) {
  // Analitik: kendi ölçüm betiğimiz yalnızca onay varsa yüklenir; onay geri alınırsa çerezi ve kayıtları sil,
  // sayfayı yenile ki betik bellekte kalmasın. Önceki sürümle onay verip henüz yeniden karar vermeyen
  // ziyaretçinin eski yerel kimliği, kabul ederse çereze taşınsın diye karar verene kadar bekler (çerez yine silinir).
  if (c?.analytics && location.hostname === 'antautomobile.org' && !document.getElementById('ant-a')) {
    const s = document.createElement('script');
    s.id = 'ant-a';
    s.async = true;
    s.src = TRACKER_SRC;
    document.head.append(s);
  }
  if (!c?.analytics) clearTracker({ keepLegacy: !c && !!previousAnalyticsConsent() });
  const sw = 'serviceWorker' in navigator && location.hostname === 'antautomobile.org';
  // İşlevsel zorunlu sayılır: bekleme sayfasının service worker'ı seçimden bağımsız kaydedilir
  if (sw) navigator.serviceWorker.register('/sw.js').catch(() => {});
  try { LEGACY_KEYS.forEach((k) => localStorage.removeItem(k)); } catch { /* depolama kapalı */ }
  if (prev?.analytics && !c?.analytics && document.getElementById('ant-a')) location.reload();
}

function record(c) {
  // Onayın ispatı için: rastgele kimlik + seçim + metin sürümü + zaman. IP adresi ya da tarayıcı bilgisi saklanmaz.
  if (location.hostname !== 'antautomobile.org') return;
  const body = JSON.stringify({ id: c.id, a: c.analytics, f: c.functional, policy: POLICY_VERSION, lang });
  try { fetch('/pit/consent', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {}); } catch { /* */ }
}

function save(choice) {
  const prev = readConsent();
  const c = writeConsent(choice, prev?.id || previousAnalyticsConsent()?.id);
  record(c);
  applyEffects(c, prev);
  hideBanner();
  window.dispatchEvent(new CustomEvent('ant-consent', { detail: c }));
  return c;
}

function hideBanner() {
  if (!banner) return;
  banner.classList.add('is-out');
  setTimeout(() => { banner?.remove(); banner = null; }, 260);
}

function showBanner() {
  banner = document.createElement('section');
  banner.className = 'consent';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', L.region);
  banner.innerHTML = `
    <div class="consent__text">
      <h2 class="consent__title">${L.bannerTitle}</h2>
      <p>${L.bannerText} <a href="${policyUrl}">${L.policy}</a> · <a href="${noticeUrl}">${L.notice}</a></p>
    </div>
    <div class="consent__actions">
      <button type="button" class="consent__btn" data-c="reject">${L.rejectAll}</button>
      <button type="button" class="consent__btn" data-c="accept">${L.acceptAll}</button>
      <button type="button" class="consent__link" data-c="manage">${L.manage}</button>
    </div>`;
  banner.addEventListener('click', (e) => {
    const b = e.target.closest('[data-c]');
    if (!b) return;
    if (b.dataset.c === 'accept') save({ analytics: true });
    else if (b.dataset.c === 'reject') save({ analytics: false });
    else openPreferences();
  });
  document.body.append(banner);
}

function table(cat) {
  const rows = ITEMS[cat] || [];
  if (!rows.length) return '';
  return `<div class="consent__table"><table>
    <thead><tr><th scope="col">${L.name}</th><th scope="col">${L.kind}</th><th scope="col">${L.purpose}</th><th scope="col">${L.duration}</th></tr></thead>
    <tbody>${rows.map(([n, k, p, d]) => `<tr><td><code>${esc(n)}</code></td><td>${L.kinds[k]}</td><td>${esc(p[lang])}</td><td>${esc(d[lang])}</td></tr>`).join('')}</tbody>
  </table></div>`;
}

function category(cat, state) {
  const [title, text] = L.cats[cat];
  const fixed = cat !== 'analytics';
  const label = cat === 'necessary' || cat === 'functional' ? L.always : cat === 'marketing' ? L.unused : '';
  return `<section class="consent__cat">
    <div class="consent__cat-head">
      <h3 id="cc-${cat}">${title}</h3>
      ${fixed ? `<span class="consent__fixed">${label}</span>` : `<label class="consent__switch"><input type="checkbox" role="switch" id="cs-${cat}" name="${cat}" aria-labelledby="cc-${cat}" ${state ? 'checked' : ''}/><span aria-hidden="true"></span><em data-on="${L.on}" data-off="${L.off}"></em></label>`}
    </div>
    <p>${text}</p>
    ${L.stmt[cat] ? `<p class="consent__stmt"><strong>${L.stmtTitle}:</strong> ${L.stmt[cat]} <a href="${policyUrl}${L.stmtAnchor}">${L.stmtLink}</a></p>` : ''}
    ${table(cat)}
  </section>`;
}

export function openPreferences() {
  const c = readConsent();
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.className = 'consent__dialog';
    dialog.setAttribute('aria-labelledby', 'consent-title');
    document.body.append(dialog);
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  }
  dialog.innerHTML = `
    <form method="dialog" class="consent__form">
      <header class="consent__dhead">
        <h2 id="consent-title">${L.dialogTitle}</h2>
        <button type="submit" class="consent__x" value="close" aria-label="${L.close}">×</button>
      </header>
      <div class="consent__body">
        <p class="consent__lead">${L.dialogLead} <a href="${policyUrl}">${L.policy}</a> · <a href="${noticeUrl}">${L.notice}</a></p>
        ${category('necessary')}
        ${category('functional')}
        ${category('analytics', c?.analytics)}
        ${category('marketing')}
        <p class="consent__meta" id="consent-meta">${esc(L.current(c))}</p>
      </div>
      <footer class="consent__dfoot">
        <button type="button" class="consent__btn" data-d="reject">${L.rejectAll}</button>
        <button type="button" class="consent__btn" data-d="accept">${L.acceptAll}</button>
        <button type="button" class="consent__btn consent__btn--solid" data-d="save">${L.save}</button>
      </footer>
    </form>`;
  dialog.querySelector('.consent__dfoot').addEventListener('click', (e) => {
    const b = e.target.closest('[data-d]');
    if (!b) return;
    const a = dialog.querySelector('#cs-analytics');
    if (b.dataset.d === 'accept') a.checked = true;
    if (b.dataset.d === 'reject') a.checked = false;
    const saved = save({ analytics: a.checked });
    dialog.querySelector('#consent-meta').textContent = `${L.saved} ${L.current(saved)}`;
    setTimeout(() => dialog.open && dialog.close(), 700);
  });
  if (!dialog.open) dialog.showModal();
}

export function initConsent() {
  const c = readConsent();
  applyEffects(c, null);
  if (!c) showBanner();
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-consent-open]');
    if (t) { e.preventDefault(); openPreferences(); }
  });
}
