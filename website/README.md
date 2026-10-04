# Launch website

A one-page public site to go live alongside the app. It is deliberately separate
from the Next.js app: its own folder, no framework, no dependencies, no scripts,
no cookies, no analytics. It can live on its own domain and be deployed (or
broken) without touching the app that holds members' data.

```
website/
  site.config.json   the few values that change: brand, URLs, Play link
  build.mjs          fills the {{PLACEHOLDERS}} in src/ and writes dist/
  src/               index.html, styles.css, favicon, og.png, robots, sitemap
  vercel.json        build command, output folder, strict security headers
  scripts/make-og.mjs  regenerates src/og.png (only if the tagline/look changes)
```

## Preview locally

```bash
cd website
node build.mjs
npx http-server dist -p 4000     # then open http://localhost:4000
```

## Deploy on Vercel

Create a **new** Vercel project (not the app's) from this repository and set
**Root Directory** to `website`. Everything else is picked up from `vercel.json`.
Give it its own domain; the app keeps its own.

## Before it is public — the launch checklist

The site ships in a safe default state: marked `noindex`, no Play link, no
contact address. Set these as **Environment Variables** in the website's Vercel
project (they override `site.config.json`, so nothing needs committing):

| Variable | Set it when | What it does |
| --- | --- | --- |
| `WEBSITE_PLAY_URL` | the app is live on Google Play | Swaps "coming soon" for a real Google Play button. Must start with `https://play.google.com/`. |
| `WEBSITE_SUPPORT_EMAIL` | there is an inbox someone actually reads | Shows a contact address in the footer. Left empty, none is shown — better than one nobody reads. |
| `WEBSITE_PUBLIC_URL` | the site has its final domain | Turns on the canonical link, the link-preview image and the sitemap. |
| `WEBSITE_INDEXABLE` | the name is final | Any value (e.g. `1`) removes `noindex` and opens `robots.txt`. **Leave it off until the name is decided** — a page indexed under a working name lingers in search results long after the name changes. |
| `WEBSITE_APP_URL` | the app's domain changes | Where every "Open the app" and the privacy / delete-account links point. |
| `WEBSITE_BRAND` | the name is chosen | The product name, everywhere on the site. |

The build stops with a clear message if a URL is malformed rather than
publishing a broken link.

## Renaming the product

The brand appears once, in `site.config.json` (or `WEBSITE_BRAND`). Change it,
rebuild, done. The link-preview image deliberately contains no name, so it never
needs regenerating. The app itself is renamed separately — see `CLAUDE.md`.

## Things a person should do before launch

- **Deepika's section.** "Meet Deepika" is a short factual paragraph written from
  what the app already says about her. It should be replaced with her own words,
  and ideally a photo — people choose a coach, and a real face does more than any
  copy here. Nothing on the site quotes her, because nothing she hasn't said
  should appear in her voice.
- **Read the claims against the app once.** Every statement on the page describes
  something the app does today (checked when this was written). If a feature
  changes, the page needs to change with it.

## What the site deliberately does not do

- No testimonials, member counts, ratings or "as seen in" — there is no real one
  to show yet, and an invented one on a health product is worse than none.
- No pricing; none has been decided.
- No claim that the app uses AI. It doesn't.
- No medical claims. The "Coaching, not medical care" notice mirrors the app's
  privacy policy and the scope-of-practice rule in `CLAUDE.md`.
- It does not restate the privacy policy. It summarises it and links to the real
  one in the app, so the two cannot drift apart.

The only third party the page contacts is Google Fonts, for the typefaces; the
footer says so.
