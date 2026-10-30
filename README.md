# ANT Automobile Website

Source of [antautomobile.org](https://antautomobile.org): a static, bilingual (English at `/`, Turkish at `/tr/`) site built with Vite, plus the Cloudflare Worker that serves the maintenance and outage page (`pit/`).

## Website

- Pages: home, privacy, cookies, KVKK (Turkish), 404 in both languages.
- Interactive 3D vehicle viewer (three.js, GSAP) and the mascot Wolti, drawn in code (`src/wolti.js`).
- Consent banner with separate analytics and functional categories (`src/consent.js`, `src/consent-state.js`). Analytics only loads after consent.
- Offline page through a service worker (`public/sw.js`).
- Competition rules data in `src/data/rules.json`.
- `tools/` holds the scripts used to prepare images and the 3D model.

```
npm ci
npm run dev       # http://127.0.0.1:5180
npm run build     # output in dist/
```

Serve `dist/` with any static file server. Pages are plain `index.html` files in folders, so the server should resolve directories to `index.html`.

## Pit (maintenance and outage page)

`pit/` is a Cloudflare Worker that sits in front of the site and its subdomains. When maintenance is switched on, or the origin does not answer (Cloudflare 5xx codes), page navigations are redirected to a single self-contained page with a small game. Mail hosts are never touched and webmail is never put into maintenance.

- Maintenance state is a JSON record in a Workers KV namespace (`bakim` key with `{"hosts": ["*"], "until": "..."}`; hosts are subdomain names, `@` for the apex, `*` for all).
- `PIT_KEY` (a Worker secret) opens a 12 hour bypass cookie at `/pit/gec?k=<key>`, so the team can view the site during maintenance. `/pit/gec?kapat` removes it.
- Settings are in `pit/wrangler.toml`: `ZONE`, `NEVER`, `KNOWN`, `WEBMAIL_URL`, the routes, the zone id and the KV namespace id. Replace the placeholders.
- The page itself (`pit/page/`) is ANT Automobile specific: language, texts, service names and mascot.

```
npm ci            # in the repository root first (fonts and shared sources)
cd pit
npm ci
node build.mjs    # writes pit/dist/pit.html
npx wrangler secret put PIT_KEY
npx wrangler deploy
```

## License

The code is licensed under GPL-3.0, see `LICENSE`.

The ANT Automobile name, logos, the Wolti mascot artwork, photographs, renders and the vehicle model (`public/img`, `public/models`, and the drawings produced by `src/wolti.js`) are not covered by that license. Please do not reuse them to represent another project.
