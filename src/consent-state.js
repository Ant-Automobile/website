// Çerez onayı kaydı (ant_consent çerezi). Arayüzü consent.js çizer; bu modül yalnızca okur/yazar,
// böylece oyun ve pit sayfası da aynı kaydı arayüzsüz kullanabilir.
// Biçim: <CONSENT_VERSION>.a<0|1>.f<0|1>.<unix sn>.<rastgele kimlik>
// Çerez Domain=antautomobile.org: alt alan adlarındaki ölçüm betiği de (/a/t.js) aynı kaydı okur ve yalnızca
// geçerli sürümde a1 varsa çalışır; ölçüm sunucusu da aynı kontrolü yapar. Sürümü değiştirirsen ikisini de değiştir.

export const CONSENT_COOKIE = 'ant_consent';
export const CONSENT_VERSION = 3;
export const CONSENT_DAYS = 180;
export const POLICY_VERSION = '1.3';

// Çerez değeri başka bir alt alan adınca bozulmuş olabilir: çözülemiyorsa yok sayılır, sayfa bozulmaz
function rawConsent() {
  const m = document.cookie.match(/(?:^|;\s*)ant_consent=([^;]+)/);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return null; }
}

export function readConsent() {
  const v = rawConsent();
  if (!v) return null;
  const p = v.split('.');
  if (p.length < 5 || Number(p[0]) !== CONSENT_VERSION) return null;
  return { analytics: p[1] === 'a1', functional: true, at: Number(p[3]) * 1000, id: p[4] };
}

// Önceki sürümle verilmiş analitik onayı (yeniden sorulana kadar): eski cihaz kimliğinin bir kez yeni
// çereze taşınabilmesi için, kullanıcı yeni sürümde karar verene kadar eski kayıtlar silinmez.
export function previousAnalyticsConsent() {
  const v = rawConsent();
  if (!v) return null;
  const p = v.split('.');
  if (p.length < 5 || Number(p[0]) >= CONSENT_VERSION || p[1] !== 'a1') return null;
  return { id: p[4] };
}

export const allowed = (category) => !!readConsent()?.[category];

// İşlevsel zorunlu sayıldığı için her zaman f1 yazılır; alan eski kayıtlarla uyum için duruyor
export function writeConsent({ analytics }, id) {
  const rid = id || (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 16) : String(Math.random()).slice(2, 18));
  const value = [CONSENT_VERSION, analytics ? 'a1' : 'a0', 'f1', Math.floor(Date.now() / 1000), rid].join('.');
  const domain = location.hostname.endsWith('antautomobile.org') ? '; Domain=antautomobile.org' : '';
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${CONSENT_DAYS * 86400}; SameSite=Lax${domain}${secure}`;
  return readConsent();
}

// Ölçüm olayı: kendi ölçüm betiğimiz yüklüyse hemen gönderilir, yüklenmekteyse kuyruğa girer.
// Analitik onayı yoksa hiçbir şey yapılmaz (kuyruk da tutulmaz).
export function track(name, params) {
  try {
    if (window.antA && typeof window.antA.track === 'function') window.antA.track(name, params);
    else if (allowed('analytics')) {
      // betik bir eklentiyle engellenmişse kuyruk sonsuza kadar büyümesin
      const q = (window.antAQ = window.antAQ || []);
      if (Array.isArray(q) && q.length < 50) q.push([name, params]);
    }
  } catch { /* ölçüm hiçbir zaman sayfayı bozmaz */ }
}
