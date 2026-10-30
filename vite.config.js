import { defineConfig } from 'vite';

// İlk ekranda kullanılan Archivo dosyalarını (latin + Türkçe karakterler için latin-ext) erken iste
const preloadFonts = {
  name: 'preload-fonts',
  transformIndexHtml: {
    order: 'post',
    handler(html, ctx) {
      if (!ctx.bundle) return html;
      return Object.keys(ctx.bundle)
        .filter((f) => /archivo-latin(-ext)?-standard-normal-.*\.woff2$/.test(f))
        .map((f) => ({ tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${f}`, crossorigin: '' }, injectTo: 'head' }));
    },
  },
};

// Yayındaki HTML'de geliştirme notları kalmasın
const stripHtmlComments = {
  name: 'strip-html-comments',
  apply: 'build',
  transformIndexHtml: { order: 'post', handler: (html) => html.replace(/<!--[\s\S]*?-->\n?/g, '').replace(/\n\s*\n+/g, '\n') },
};

export default defineConfig({
  plugins: [preloadFonts, stripHtmlComments],
  build: {
    chunkSizeWarningLimit: 700,
    sourcemap: false,
    rollupOptions: { input: { en: 'index.html', tr: 'tr/index.html', notfound: '404.html', 'tr-notfound': 'tr/404.html',
      privacy: 'privacy/index.html', cookies: 'cookies/index.html', 'tr-kvkk': 'tr/kvkk/index.html', 'tr-cerez': 'tr/cerez-politikasi/index.html' } },
  },
});
