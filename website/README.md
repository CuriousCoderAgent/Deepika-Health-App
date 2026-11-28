# Launch website

A one-page public site to go live alongside the app. It is deliberately separate
from the Next.js app: its own folder, no framework, no dependencies, no scripts,
no cookies, no analytics. It can live on its own domain and be deployed (or
broken) without touching the app that holds members' data.

Since 28 November 2026 the page is about Deepika's programme first and the app
second: her six promises, how the coaching runs from the first conversation
on, then the app as the thing that carries it between conversations. See
*What the page says, and who has to stand behind it* below before changing a
sentence.

```
website/
  site.config.json   the few values that change: brand, programme, URLs, Play link
  build.mjs          fills the {{PLACEHOLDERS}} in src/ and writes dist/
  src/               index.html, styles.css, favicon, og.png, robots, sitemap,
                     and shot-*.webp, four real screens of the app
  vercel.json        build command, output folder, strict security headers
  scripts/make-og.mjs     redraws src/og.png (only if the line or the look changes)
  scripts/make-shots.mjs  photographs the four screens from the running app
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
| `WEBSITE_GOOGLE_SIGN_IN` | "Continue with Google" is switched on in the app (`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set there) | Any value (e.g. `1`) adds one line to "How do I join?" and one to the privacy list. **Leave it off until it is true** — the page describes only what the app really does. |
| `WEBSITE_SUPPORT_EMAIL` | there is an inbox someone actually reads | Shows a contact address in the footer. Left empty, none is shown — better than one nobody reads. |
| `WEBSITE_PUBLIC_URL` | the site has its final domain | Turns on the canonical link, the link-preview image and the sitemap. |
| `WEBSITE_INDEXABLE` | the name is final | Any value (e.g. `1`) removes `noindex` and opens `robots.txt`. **Leave it off until the name is decided** — a page indexed under a working name lingers in search results long after the name changes. |
| `WEBSITE_APP_URL` | the app's domain changes | Where every "Open the app" and the privacy / delete-account links point. |
| `WEBSITE_BRAND` | the name is chosen | The product name: the wordmark, the page title and the footer. |
| `WEBSITE_PROGRAMME` | Deepika names her programme differently, or not at all | What her programme is called on the page. It is "Project You" in `site.config.json`, her own name for it. Set it to an empty value and the page names nothing. No sentence uses this and the brand together, so the two can also be the same word. |
| `WEBSITE_ENQUIRY_URL` | there is somewhere for a woman to ask for a place | Turns every "Open the app" button into **Ask for a place**, pointing here, and adds a quiet "Sign in" for members. Any `https://` address: a WhatsApp link (`https://wa.me/...`), a form, a booking page. Left empty, the buttons open the app, where anyone can create an account. |

The build stops with a clear message if a URL is malformed rather than
publishing a broken link.

## Renaming the product

The brand appears once, in `site.config.json` (or `WEBSITE_BRAND`). Change it,
rebuild, done. The link-preview image deliberately contains no name, so it never
needs regenerating. The app itself is renamed separately — see `CLAUDE.md`.

## What the page says, and who has to stand behind it

Two kinds of statement are on the page, and they are kept apart on purpose.

**What Deepika does with a client.** "This is Project You", "How it works",
"You leave the first conversation with", the paragraph about medical
conditions, and three of the questions (who it is for, how much time, a gym).
These come from her own notes and her walk-through of a first call
(`docs/COACHING-METHOD.md`, and Round 2 in `docs/PILOT-FEEDBACK.md`). Her notes
are headed "Draft (to evolve)". **She has to read every one of these lines and
agree to it before the page is public**, because each is a promise made in her
name: 30 to 45 minutes, one main goal and one alongside it, no deadline, two
or three habits, a look back each month and at six weeks and three months.

**What the app does.** "The app keeps it going", "Your data is yours", and the
questions about phones, reports and accounts. Every one of these has to be
true of the app as it is today. If a feature changes, the sentence changes
with it.

## Things a person should do before launch

- **Deepika reads the page.** All of the first kind of statement above, and the
  one line in her voice: the quotation under "Meet Deepika". It is taken from
  the recording of her walk-through, whose transcript is close and not exact,
  so she confirms it or says it again in her own words.
- **Her paragraph, and a photograph.** "Meet Deepika" opens with a short factual
  paragraph. It should become her own, and it should have her face beside it:
  people choose a coach, and a real face does more than any copy here. Put the
  photograph in `src/` as `deepika.jpg` (or `.webp`, `.png`), about four wide by
  five tall, and it appears on the next build. Nothing else needs changing.
- **Decide where "Ask for a place" leads**, and set `WEBSITE_ENQUIRY_URL`. Until
  then the page sends everyone to the app.
- **Read the claims about the app against the app once.** They were checked on
  28 November 2026.
- **Keep the four screens current.** They are photographs of the real app with a
  sample member, so they go out of date when a screen changes.
  `scripts/make-shots.mjs` says how to take them again. It refuses a screen that
  shows the product's name, and none of the four shows words written as
  Deepika's.

## What the site deliberately does not do

- No testimonials, member counts, ratings or "as seen in" — there is no real one
  to show yet, and an invented one on a health product is worse than none.
- Nothing in Deepika's voice that she has not said. There is one quotation, and
  it is hers. The sample messages inside the app were written to show her
  voice; they are not hers, and no screen that shows one is on the page.
- No pricing; none has been decided.
- No claim that the app uses AI. It doesn't.
- No medical claims. The "Coaching, not medical care" notice mirrors the app's
  privacy policy and the scope-of-practice rule in `CLAUDE.md`.
- It does not restate the privacy policy. It summarises it and links to the real
  one in the app, so the two cannot drift apart.

The only third party the page contacts is Google Fonts, for the typefaces; the
footer says so.
