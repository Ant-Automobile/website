// Wolti: ANT Automobile maskotu (marka rengi Lavanta #8b98ff). Gövde logodaki halka, gözler ve ağız şarj soketinin pinleri, antenler karınca (ant).
// volti(seçenekler) tek bir SVG metni döndürür; site, oyun ve marka dosyaları aynı çizimi kullanır.

export const COLORS = {
  body: '#8b98ff',
  bodyShade: '#5366ff',
  arm: '#7281ff',
  plate: '#f5f6fc',
  plateShade: '#dbdceb',
  ink: '#1f2624',
  inkSoft: '#283077',
  blush: '#ffae96',
  tongue: '#ff7c84',
  steel: '#9aa7ad',
  steelDark: '#66747a',
  paper: '#fbf3e4',
  paperShade: '#eadcc4',
  spark: '#ffd23f',
};

const C = COLORS;
let uid = 0;
let P = 'v';
const X = 130; // gövde merkezi
const Y = 146;
const R = 92;

const ln = (d, color = C.ink, w = 6, extra = '') =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;

function antennae(kind) {
  const paths = {
    up: ['M114 66 C110 42 98 30 82 26', 'M146 66 C150 42 162 30 178 26'],
    droop: ['M114 66 C104 46 86 44 72 54', 'M146 66 C156 46 174 44 188 54'],
    back: ['M114 66 C104 44 86 38 68 40', 'M146 66 C140 42 126 30 108 26'],
    perk: ['M114 66 C112 40 104 22 94 10', 'M146 66 C148 40 156 22 166 10'],
  };
  const tips = { up: [[80, 25], [180, 25]], droop: [[70, 56], [190, 56]], back: [[66, 40], [106, 25]], perk: [[93, 8], [167, 8]] };
  const [a, b] = paths[kind] || paths.up;
  const [[ax, ay], [bx, by]] = tips[kind] || tips.up;
  const tip = (x, y) =>
    `<circle cx="${x}" cy="${y}" r="10.5" fill="${C.body}"/><circle cx="${x - 3}" cy="${y - 3.5}" r="3.4" fill="#fff" opacity=".55"/>`;
  return ln(a, C.inkSoft, 6.5) + ln(b, C.inkSoft, 6.5) + tip(ax, ay) + tip(bx, by);
}

function tail(side) {
  const s = side === 'right' ? -1 : 1; // sol tarafta (oyunda arkada) kıvrılan şarj kablosu
  const m = (x) => (s === 1 ? x : 2 * X - x);
  const d = `M${m(70)} 214 C${m(40)} 222 ${m(30)} 242 ${m(44)} 252 C${m(54)} 259 ${m(48)} 270 ${m(32)} 270`;
  const px = m(24);
  const plug = `<g transform="translate(${px} 270) rotate(${s * 90})">
    <rect x="-9" y="-11" width="18" height="16" rx="3" fill="${C.inkSoft}"/>
    <rect x="-6" y="5" width="3.4" height="7" rx="1.2" fill="${C.steel}"/><rect x="2.6" y="5" width="3.4" height="7" rx="1.2" fill="${C.steel}"/>
  </g>`;
  return ln(d, C.inkSoft, 6.5) + plug;
}

function feet(kind) {
  const foot = (x, y, rot = 0) =>
    `<ellipse cx="${x}" cy="${y}" rx="22" ry="12.5" fill="${C.inkSoft}" transform="rotate(${rot} ${x} ${y})"/>` +
    `<ellipse cx="${x - 6}" cy="${y - 4}" rx="9" ry="3.2" fill="#fff" opacity=".12" transform="rotate(${rot} ${x} ${y})"/>`;
  switch (kind) {
    case 'run1': return foot(164, 236, -18) + foot(96, 246, 8);
    case 'run2': return foot(102, 234, 18) + foot(160, 246, -6);
    case 'jump': return foot(108, 230, 22) + foot(152, 230, -22);
    case 'sit': return foot(92, 244, -10) + foot(168, 244, 10);
    default: return foot(106, 242) + foot(154, 242);
  }
}

function arms(kind) {
  const arm = (d) => ln(d, C.arm, 21);
  switch (kind) {
    case 'wave':
      return arm('M52 158 Q34 178 40 200') + arm('M210 140 Q236 122 238 92') +
        ln('M252 80 Q260 92 256 104', C.ink, 4, ' opacity=".35"') + ln('M262 70 Q274 90 268 112', C.ink, 4, ' opacity=".22"');
    case 'up': return arm('M50 132 Q26 112 28 80') + arm('M210 132 Q234 112 232 80');
    case 'scratch': return arm('M52 158 Q34 178 40 200') + arm('M210 146 Q240 118 214 78');
    case 'hold': return arm('M50 170 Q58 210 92 218') + arm('M210 170 Q202 210 168 218');
    case 'wrench': return arm('M52 158 Q34 178 40 200') + arm('M208 152 Q234 146 242 124');
    case 'run1': return arm('M52 150 Q30 140 22 118') + arm('M208 162 Q228 180 224 202');
    case 'run2': return arm('M52 162 Q32 180 36 202') + arm('M208 150 Q230 140 238 118');
    case 'tuck': return arm('M52 150 Q30 136 30 112') + arm('M208 150 Q230 136 230 112');
    case 'lean': return arm('M52 166 Q30 168 10 176') + arm('M208 158 Q226 178 220 200'); // sol el yandaki harfin üstüne dayanır
    case 'flail': return arm('M50 140 Q22 132 14 104') + arm('M210 140 Q238 132 246 104');
    default: return arm('M52 158 Q34 178 40 200') + arm('M208 158 Q226 178 220 200');
  }
}

function body() {
  return `<clipPath id="${P}b"><circle cx="${X}" cy="${Y}" r="${R}"/></clipPath>
  <circle cx="${X}" cy="${Y}" r="${R}" fill="${C.bodyShade}"/>
  <circle cx="${X - 7}" cy="${Y - 9}" r="${R - 2}" fill="${C.body}" clip-path="url(#${P}b)"/>
  <ellipse cx="86" cy="94" rx="21" ry="11" fill="#fff" opacity=".3" transform="rotate(-38 86 94)"/>
  <circle cx="${X}" cy="${Y - 2}" r="68" fill="${C.plateShade}"/>
  <circle cx="${X}" cy="${Y + 1}" r="66" fill="${C.plate}"/>`;
}

function eyes(kind, look = [0, 0]) {
  const [lx, ly] = look;
  const pin = (x, y, r = 19) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.ink}"/>` +
    `<circle cx="${x + 6 + lx}" cy="${y - 7 + ly}" r="${r * 0.36}" fill="#fff"/>` +
    `<circle cx="${x - 6 + lx * 0.5}" cy="${y + 8 + ly * 0.5}" r="${r * 0.15}" fill="#fff"/>`;
  const L = [101, 128];
  const Rr = [159, 128];
  switch (kind) {
    case 'happy':
      return ln('M85 133 Q101 112 117 133', C.ink, 7.5) + ln('M143 133 Q159 112 175 133', C.ink, 7.5);
    case 'closed':
      return ln('M86 128 Q101 141 116 128', C.ink, 6.5) + ln('M144 128 Q159 141 174 128', C.ink, 6.5);
    case 'wide': return pin(L[0], L[1], 22) + pin(Rr[0], Rr[1], 22);
    case 'dizzy': {
      const x = (cx, cy) => ln(`M${cx - 12} ${cy - 12} L${cx + 12} ${cy + 12} M${cx + 12} ${cy - 12} L${cx - 12} ${cy + 12}`, C.ink, 7);
      return x(...L) + x(...Rr);
    }
    case 'wink': return pin(...L) + ln('M143 133 Q159 112 175 133', C.ink, 7.5);
    default: return pin(...L) + pin(...Rr);
  }
}

function brows(kind) {
  if (kind === 'worried') return ln('M84 104 Q98 96 114 98', C.ink, 5.5) + ln('M146 98 Q162 96 176 104', C.ink, 5.5);
  if (kind === 'focus') return ln('M84 100 Q100 100 114 107', C.ink, 5.5) + ln('M146 107 Q160 100 176 100', C.ink, 5.5);
  if (kind === 'raised') return ln('M86 98 Q100 90 114 96', C.ink, 5.5) + ln('M146 92 Q160 84 174 90', C.ink, 5.5);
  return '';
}

function mouth(kind) {
  const tongueIn = (clipD, cx, cy, rx, ry) =>
    `<clipPath id="${P}m"><path d="${clipD}"/></clipPath><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${C.tongue}" clip-path="url(#${P}m)"/>`;
  switch (kind) {
    case 'smile': {
      const d = 'M113 164 Q130 190 147 164 Q130 170 113 164 Z';
      return `<path d="${d}" fill="${C.ink}" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/>` + tongueIn(d, 130, 184, 10, 7);
    }
    case 'grin': {
      const d = 'M106 160 Q130 198 154 160 Q130 168 106 160 Z';
      return `<path d="${d}" fill="${C.ink}" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/>` + tongueIn(d, 130, 190, 13, 9);
    }
    case 'flat': return ln('M119 170 L141 170', C.ink, 6);
    case 'wobble': return ln('M113 174 q4.25 -6 8.5 0 t8.5 0 t8.5 0 t8.5 0', C.ink, 5.5);
    case 'small': return `<circle cx="130" cy="172" r="7" fill="${C.ink}"/>`;
    case 'smirk': return ln('M118 170 Q132 178 144 166', C.ink, 6);
    default: {
      const d = 'M118 170 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0';
      return `<circle cx="130" cy="170" r="12" fill="${C.ink}"/>` + tongueIn(d, 130, 180, 8, 5);
    }
  }
}

function cheeks(on) {
  if (!on) return '';
  return `<ellipse cx="80" cy="158" rx="11" ry="6.5" fill="${C.blush}" opacity=".85"/><ellipse cx="180" cy="158" rx="11" ry="6.5" fill="${C.blush}" opacity=".85"/>`;
}

const PROPS = {
  question: () => `<g transform="translate(232 40)">${ln('M-12 -8 q0 -16 15 -16 q15 0 15 13 q0 10 -11 14 q-4 2 -4 10', C.ink, 7)}<circle cx="3" cy="23" r="4.6" fill="${C.ink}"/></g>`,
  zzz: () => `<g fill="none" stroke="${C.ink}" stroke-linecap="round" stroke-linejoin="round" opacity=".75">
    <path d="M196 54 h16 l-16 18 h16" stroke-width="5"/><path d="M222 28 h11 l-11 12 h11" stroke-width="4"/><path d="M240 8 h8 l-8 9 h8" stroke-width="3.2"/></g>`,
  wrench: () => `<mask id="${P}w"><rect x="-40" y="-40" width="80" height="120" fill="#fff"/><rect x="-6" y="-26" width="12" height="18" fill="#000"/></mask>
    <g transform="translate(244 106) rotate(24) scale(1.35)"><g mask="url(#${P}w)"><circle cx="0" cy="-14" r="14" fill="${C.steel}"/><rect x="-5.5" y="-6" width="11" height="54" rx="5" fill="${C.steel}"/></g>
    <rect x="-5.5" y="22" width="11" height="26" rx="5" fill="${C.steelDark}"/></g>`,
  map: () => `<g transform="translate(130 222) scale(.92)">
    <path d="M-50 -22 L-17 -30 L17 -22 L50 -30 L50 22 L17 30 L-17 22 L-50 30 Z" fill="${C.paper}" stroke="${C.paperShade}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M-17 -30 L-17 22 M17 -22 L17 30" stroke="${C.paperShade}" stroke-width="2"/>
    ${ln('M-38 14 C-26 -6 -8 18 4 0 S28 -18 34 -6', C.body, 3.5, ' stroke-dasharray="1 7"')}
    <path d="M34 -16 a7 7 0 0 1 7 7 c0 6 -7 12 -7 12 s-7 -6 -7 -12 a7 7 0 0 1 7 -7z" fill="${C.body}"/><circle cx="34" cy="-9" r="2.6" fill="#fff"/>
    <g transform="translate(-6 8)">${ln('M-5 -5 L5 5 M5 -5 L-5 5', C.ink, 3)}</g></g>`,
  bolts: () => {
    const b = (x, y, s, r) => `<path transform="translate(${x} ${y}) rotate(${r}) scale(${s})" d="M4 -14 L-8 2 L-1 2 L-4 14 L8 -2 L1 -2 Z" fill="${C.spark}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`;
    return b(20, 60, 1.4, -14) + b(244, 54, 1.2, 16) + b(250, 170, 0.9, 10) + b(14, 170, 0.8, -8);
  },
  stars: () => {
    const s = (x, y, k) => `<path transform="translate(${x} ${y}) scale(${k})" d="M0 -10 L2.6 -3 L10 -3 L4 1.6 L6.2 9 L0 4.6 L-6.2 9 L-4 1.6 L-10 -3 L-2.6 -3 Z" fill="${C.spark}" stroke="${C.ink}" stroke-width="1.6" stroke-linejoin="round"/>`;
    return s(60, 34, 1.2) + s(200, 30, 1) + s(130, 14, 0.9);
  },
  speed: () => ln('M-6 120 h26 M-14 146 h30 M-4 172 h22', C.ink, 5, ' opacity=".3"'),
  heart: () => `<path transform="translate(226 48) rotate(12)" d="M0 8 C-14 -2 -14 -16 -5 -16 C-1 -16 0 -12 0 -10 C0 -12 1 -16 5 -16 C14 -16 14 -2 0 8 Z" fill="${C.body}" stroke="${C.ink}" stroke-width="2.4" stroke-linejoin="round"/>`,
};

export function wolti(o = {}) {
  const {
    eyes: e = 'open', mouth: m = 'o', arms: a = 'down', feet: f = 'stand', antennae: an = 'up', brows: b = '',
    tail: t = 'left', blush = true, props = [], look = [0, 0], tilt = 0, bob = 0, size, title = 'Wolti',
  } = o;
  P = o.id || `v${++uid}`;
  const back = props.filter((p) => p === 'speed').map((p) => PROPS[p]()).join('');
  const front = props.filter((p) => p !== 'speed').map((p) => PROPS[p]()).join('');
  const held = props.includes('map') || props.includes('wrench');
  const sz = size ? ` width="${size}" height="${Math.round((size * 280) / 260)}"` : '';
  const char =
    `<g transform="translate(0 ${bob}) rotate(${tilt} ${X} ${Y + 60})">` +
    (t ? tail(t) : '') + antennae(an) + feet(f) + (held ? '' : arms(a)) + body() +
    cheeks(blush) + brows(b) + eyes(e, look) + mouth(m) + (held ? arms(a) : '') + '</g>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 280 300"${sz} role="img" aria-label="${title}">` +
    `<title>${title}</title>` +
    `<ellipse cx="${X}" cy="270" rx="${f === 'jump' ? 40 : 66}" ry="7" fill="#000" opacity="${f === 'jump' ? 0.07 : 0.12}"/>` +
    back + char + front + '</svg>';
}

// Marka sayfasında ve sitede kullanılan hazır pozlar
export const POSES = {
  logo: { title: 'Wolti · logo yüzü' },
  hello: { title: 'Wolti · merhaba', eyes: 'happy', mouth: 'smile', arms: 'wave', antennae: 'perk' },
  lost: { title: 'Wolti · kayboldu (404)', eyes: 'open', look: [-3, -2], brows: 'worried', mouth: 'wobble', arms: 'hold', props: ['map', 'question'], antennae: 'droop' },
  pit: { title: 'Wolti · pit stop (bakım)', eyes: 'open', brows: 'focus', mouth: 'smirk', arms: 'wrench', props: ['wrench'], feet: 'stand' },
  sleep: { title: 'Wolti · çevrim dışı', eyes: 'closed', mouth: 'small', arms: 'down', antennae: 'droop', props: ['zzz'], feet: 'sit' },
  cheer: { title: 'Wolti · sevinç', eyes: 'happy', mouth: 'grin', arms: 'up', antennae: 'perk', props: ['bolts'], feet: 'jump', bob: -8 },
  love: { title: 'Wolti · teşekkürler', eyes: 'wink', mouth: 'smile', arms: 'down', props: ['heart'] },
  run1: { title: 'Wolti · koşu 1', eyes: 'open', look: [3, 0], mouth: 'smile', arms: 'run1', feet: 'run1', antennae: 'back', tilt: 6, bob: -4, props: ['speed'] },
  run2: { title: 'Wolti · koşu 2', eyes: 'open', look: [3, 0], mouth: 'smile', arms: 'run2', feet: 'run2', antennae: 'back', tilt: 6, props: ['speed'] },
  jump: { title: 'Wolti · zıplama', eyes: 'wide', mouth: 'o', arms: 'tuck', feet: 'jump', antennae: 'droop', bob: -10 },
  lean: { title: 'Wolti · harfe yaslanmış', eyes: 'open', look: [2, 1], mouth: 'smile', arms: 'lean', tail: 'right', tilt: -10 },
  crash: { title: 'Wolti · çarpışma', eyes: 'dizzy', mouth: 'wobble', arms: 'flail', antennae: 'droop', props: ['stars'], tilt: -8 },
};
