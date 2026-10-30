import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { wolti, POSES } from '../src/wolti.js';

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, '..');
const fonts = join(site, 'node_modules', '@fontsource-variable');

const js = await esbuild.build({
  entryPoints: [join(here, 'page', 'page.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  legalComments: 'none',
  write: false,
});
const css = await esbuild.transform(readFileSync(join(site, 'src', 'pit', 'pit.css'), 'utf8'), { loader: 'css', minify: true, legalComments: 'none' });

const face = (family, file, weight, range) =>
  `@font-face{font-family:"${family}";font-style:normal;font-display:swap;font-weight:${weight};font-stretch:62% 125%;` +
  `src:url(data:font/woff2;base64,${readFileSync(join(fonts, file)).toString('base64')}) format("woff2-variations");unicode-range:${range}}`;
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
const fontCss = [
  face('Archivo Variable', 'archivo/files/archivo-latin-ext-standard-normal.woff2', '100 900', LATIN_EXT),
  face('Archivo Variable', 'archivo/files/archivo-latin-standard-normal.woff2', '100 900', LATIN),
  face('JetBrains Mono Variable', 'jetbrains-mono/files/jetbrains-mono-latin-ext-wght-normal.woff2', '100 800', LATIN_EXT),
  face('JetBrains Mono Variable', 'jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2', '100 800', LATIN),
].join('');

const icon = 'data:image/svg+xml,' + encodeURIComponent(wolti({ ...POSES.logo, tail: '', blush: false, id: 'fav' }).replace(/<title>.*?<\/title>/, ''));
const webp = (f) => 'data:image/webp;base64,' + readFileSync(join(site, 'public', 'img', f)).toString('base64');
const js64 = js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const html = readFileSync(join(here, 'page', 'index.html'), 'utf8')
  .replace('__FONTS__', () => fontCss)
  .replace('__CSS__', () => css.code)
  .replace('__JS__', () => js64)
  .replace('__FAVICON__', () => icon)
  .replace('__ICON_LIGHT__', () => webp('icon-light.webp'))
  .replace('__ICON_DARK__', () => webp('icon-dark.webp'))
  .replace(/\n\s*/g, '\n');

mkdirSync(join(here, 'dist'), { recursive: true });
writeFileSync(join(here, 'dist', 'pit.html'), html);
console.log(`dist/pit.html ${(html.length / 1024).toFixed(0)} KB`);
