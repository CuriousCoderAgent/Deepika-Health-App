# Deployment and environment

## Where this stands (4 October 2026)

Production runs with its environment variables set — `AUTH_SECRET`,
`COACH_PASSWORD`, `MEMBERS` and a Neon Postgres database linked through Vercel
Storage — so the login screen no longer prints the preview credentials and
members can create their own accounts. Sign-up is currently **open to anyone
with the link**, because `SIGNUP_CODE` is not set; see *Who can sign up*.

A deployment with none of these set still works, on shared demo credentials
printed on the login screen (`deepika` / `deepika2026`, `radhika` / `radhika2026`).
Those are in the repository and therefore public, so that mode is only for
sample data. **Never put a real member in it.**

For the full list of what is done and what only the owner can do, see
`docs/LAUNCH-CHECKLIST.md`.

## Before real members

In Vercel → Settings → Environment Variables. Tick **Production only** for
each, then **redeploy** — Vercel does not apply new variables to an existing
build.

Production only, because Vercel builds a preview of every branch, and a
preview given these settings is the live app at another address: the same
database, the same passwords, and its `/api/health` applies that branch's
database changes to the live database. With none of them a preview opens on
sample data with the demo sign-in, which is what a preview is for. (This page
used to say to tick Preview and Development too. As of 24 November 2026 the
project is still set that way — see *Known limits* in
`docs/LAUNCH-CHECKLIST.md`.)

| Variable | What it is |
| --- | --- |
| `AUTH_SECRET` | Random string used to sign session cookies. Generate with `openssl rand -base64 32`. Changing it signs everyone out. |
| `COACH_PASSWORD` | Deepika's password. Her username is always `deepika`. |
| `MEMBERS` | The cohort. See below. |
| `DATABASE_URL` | Postgres connection string. Optional, but required for self-signup — see Storage. `POSTGRES_URL` is read as an alternative. |
| `SIGNUP_CODE` | Optional. When set, creating an account asks for this code. Shown to Deepika, and written into the invite message, on the Members page. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional, and only together. With both set the sign-in page offers **Continue with Google**; with either missing, no screen mentions Google at all. Production only. See *Signing in with Google*. |
| `COACH_GOOGLE_EMAIL` | Optional. Deepika's own Google address. With it set, that Google account opens the console. |
| `APP_ORIGIN` | Optional, and not needed on Vercel. The app's public address (`https://…`), for a server behind a proxy that cannot see its own. Only Google sign-in uses it. |
| `SUPPORT_EMAIL` | Optional. An inbox someone actually reads. With it unset, the public privacy and deletion pages tell people to contact Deepika directly; with it set they show this address. There is deliberately no placeholder address. |
| `CRON_SECRET` | Recommended once reminders are in use. Any long random string (`openssl rand -base64 32`). Vercel sends it to the scheduled reminder job and the job refuses calls without it. Unset, the job still runs, and the most a stranger calling it could do is send opted-in members the reminder they were due anyway, a little early — see *Reminders*. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Optional. The key pair that signs reminders. Unset, one is generated on first use and kept in the database (`app_meta`), which is the normal case. Set them only to carry the same pair across databases. |
| `VAPID_SUBJECT` | Optional. Who push services contact about the app's messages. Defaults to `mailto:` the support address, or the app's own URL. |
| `SEED_DEMO_COHORT` | Optional. Set to `1` to seed the six fictional sample members into an empty database. Off by default, so a new deployment starts empty. |
| `ANDROID_CERT_SHA256` | Set once Google Play shows the app-signing key. Without it the Android app keeps a URL bar. See `docs/ANDROID.md`. |
| `ANDROID_PACKAGE_NAME` | Only if the package differs from the default in `app/.well-known/assetlinks.json/route.ts`. |

The login screen stops showing the preview-credentials box once the first
three are present, which is a quick way to confirm the deployment picked
them up.

### MEMBERS

One entry per member, `username:password:Display Name`, separated by commas or
newlines:

```
radhika:demo123:Radhika,meera:herpassword:Meera,anjali:otherpass:Anjali
```

The username is also the key her data is stored under, so changing it later
gives her a blank app. Malformed entries are skipped rather than breaking the
deployment, so a stray comma costs you one account, not all of them.

**Reserved usernames.** The demo cohort already occupies `radhika`, `megha`,
`anita`, `shreya`, `nidhi` and `priya`. Giving one of those to a real member
drops her into a fictional woman's history. `radhika` is the exception and is
meant to be used — it is the seeded demo account.

## Signing up

With `DATABASE_URL` set, the login screen offers **Create your account**: a
member enters her name, picks a username (suggested from her name, editable)
and a password, and is signed straight in to the first-run flow. Deepika
shares one link with her group rather than minting twenty credentials by hand
and sending them out one at a time.

These passwords are stored as scrypt hashes with a per-account salt. Nobody
can read them back — not Deepika, and not anyone who gets a copy of the
database. The `MEMBERS` passwords stay plaintext because they belong to
whoever runs the deployment and are already visible in Vercel.

Both kinds of account work at once. Login checks `MEMBERS` first, then the
database.

**Who can sign up.** A link shared in a group chat travels further than the
group. Set `SIGNUP_CODE` to any short phrase and the form asks for it —
Deepika includes it in the same message as the link. Leave it unset and
anyone with the URL can create an account, which is the right default while
the link is still being handed out person to person, and the wrong one the
day it goes anywhere public.

Without `DATABASE_URL` the option is not shown at all, rather than shown and
broken: an environment variable is read-only at runtime, so there is nowhere
for a new account to go.

**Forgotten passwords.** There is no email service, so recovery goes through
the person who knows the member: Deepika opens the member's page and chooses
*Reset her password*, which sets a temporary one (shown once, stored only as a
hash) for her to pass on. The member then changes it from *Your account*, which
asks for the current password so an unlocked phone is not enough to take the
account over. This works for accounts held in the database; one whose login is
in `MEMBERS` belongs to whoever runs the deployment and is changed there.
The sign-up form still asks for the password twice, because the cheapest
recovery is a typo that never happened.

## Signing in with Google

Off until `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are both set. With
them, the sign-in page gains **Continue with Google**, in both of its modes:

- **Sign in** — for an account that was made with Google, or has Google
  connected. A Google account nobody has connected is told so and told what to
  do. It never makes an account: someone who already had one would land in a
  second, empty one and conclude everything she had logged was gone.
- **Create your account** — makes the account from her Google name: no
  username to choose, no password to remember. Where `SIGNUP_CODE` is set the
  join code is still asked for, and checked before she is sent to Google.

A member who signed up with a password can connect Google from *Your account*
— it asks for her password first, as changing it does, so an unlocked phone is
not enough for someone to connect their own — and can disconnect it again. A
member who has only Google cannot disconnect it. If she ever loses that Google
account, *Reset her password* on her page in the console gives her a temporary
password, and with it a second way in.

One Google account opens one account here. It is matched on Google's own id
for the account, never on the email address — so a Google account cannot be
used to get into an existing password account merely by having the same
address.

**What is kept.** Google's id for her Google account, her email address, and —
only when the account is made this way — her name. Nothing else is asked for
(`openid email profile`), and nothing she logs is sent to Google. The address
is shown to her on *Your account* and is in her data download. Deepika's
console does not show it. The privacy page says all this, but only where
Google sign-in is switched on.

**How it works** is written out at the top of `lib/google.ts`. In short: no
script from Google runs on any page. Her browser is sent to Google and back,
and the server then makes one call to Google to confirm who she is. That call
uses Node's own `https`; `lib/google.ts` says why.

**Deepika.** Set `COACH_GOOGLE_EMAIL` to her own Google address and that
Google account opens the console. Use an address only she controls: a Gmail
address, or one in a Google Workspace she owns. Unset, she signs in with her
password, as now. This one is matched on the address, because there is no
row in the database to hold Google's id for her.

### Switching it on

Use a Google account that belongs to the practice rather than to one
person's phone — whoever owns it owns this setting.

These steps were written from how Google's console stood in 2026, and could
not be checked against Google's help pages from where this was built. Google
renames these screens every year or two. Where the screen and this list
differ, trust the screen; the search box at the top of the console finds
anything by name.

1. Go to <https://console.cloud.google.com> and create a project. Its name is
   only for you.
2. Search for **OAuth consent screen** (the section is currently called
   *Google Auth Platform*). Fill in the app's name as members should see it on
   Google's page, an email address for support, and choose **External** as the
   audience.
   - The product's name is still undecided. Whatever goes here can be changed
     later without anyone having to sign in differently.
   - Leave the permissions ("scopes") at the basic three: `openid`, `email`
     and `profile`. Add nothing — the app asks for nothing more, and anything
     more brings Google's review with it.
   - **Publish** it, so its status reads "In production". Left on "Testing",
     only the addresses you add by hand can sign in.
3. Create a client: *Clients* → *Create client* (older screens: *Credentials*
   → *Create credentials* → *OAuth client ID*). Type: **Web application**.
   Under **Authorised redirect URIs** add exactly

       https://deepika-health-app.vercel.app/api/auth/google/callback

   and the same path on any other address the app is opened at, such as a
   custom domain later. Nothing is needed under "JavaScript origins".
4. Google shows a **client ID** and a **client secret**. In Vercel → the app's
   project → Settings → Environment Variables, add them as `GOOGLE_CLIENT_ID`
   and `GOOGLE_CLIENT_SECRET`, for **Production only**, and mark the secret
   Sensitive. Preview builds live at other addresses, which Google will not
   send anyone back to; with the keys absent there, previews simply do not
   offer it.
5. Redeploy. The sign-in page now has **Continue with Google**. Try it with
   your own Google account in "Create your account" first.
6. Once it is on: set `WEBSITE_GOOGLE_SIGN_IN=1` on the website's project so
   the public page says so, and — if the Android app is on Google Play by then
   — add "email address" to its Data safety form.

If Google's page says the redirect address does not match, the address in
step 3 is not exactly the one the app is open at: look for `http` instead of
`https`, a missing path, or a different domain.

**Not tried on a real phone:** the trip to Google and back from inside the
Android app, and from an iPhone's Home Screen app. Both open Google in the
phone's own browser, which is what Google requires — but neither has been
done by hand. Do each once before telling members about it.

## Storage

Two modes, decided by whether `DATABASE_URL` is set.

**Without it** — everything lives in the browser's `localStorage`, namespaced
per account. Fine for demos. Data does not follow anyone between devices,
clearing browser data clears her history, and Deepika's console cannot see
what real members log, because their data never leaves their own phones.

**With it** — each member's record is a row in Postgres, written a second or
so after every change and read on sign-in. Her data follows her to a new
phone, survives a cleared cache, and shows up in Deepika's console. Browser
storage keeps being written as an offline mirror, so a dropped connection
does not lose the current session's work.

**The easy way: Vercel → Storage → Create Database.** Pick Neon or Supabase
and Vercel provisions it, links it to the project, and injects the connection
variables itself — no string to copy and nothing to paste wrong. Redeploy
after linking.

The variable name depends on which provider is behind it: Neon injects
`DATABASE_URL`, Supabase and the older Vercel Postgres inject `POSTGRES_URL`.
Both are read, and both are the pooled connection, so either works with no
configuration.

Setting it by hand works too — any Postgres will do (Supabase, Neon, Railway).
Point it at a **pooled** endpoint (Supabase's pooler port, Neon's `-pooler`
host): serverless functions open many short-lived connections and a free-tier
database will run out of direct ones. Vercel's own integrations already give
you the pooled one.

**After a deploy, open `/api/health`.** It answers
`{"ok":true,"storage":"database"}` once the app has reached its database — and
because the tables are made, and any change to them applied, the first time
something needs the database, opening it is also what applies them, rather
than leaving that to the first member who opens the app. It says nothing about
anyone.

The schema creates itself on first request. The six fictional sample members
are **not** seeded unless `SEED_DEMO_COHORT=1`, so a new deployment starts with
an empty console. A deployment that was already seeded shows them on Deepika's
Members page with a notice and a **Remove sample members** button, which
deletes only those six ids (never a real member) and leaves the bootstrap
marker alone so they are not seeded again.

## What auth does and does not do today

**Does:** signed, HTTP-only session cookies; server-side route protection via
`proxy.ts`, so an unauthenticated request never reaches a screen holding
health data; role separation, so a member cannot open the coach console; a
forged cookie is rejected by signature check; per-account data isolation, in
both storage modes.

**Does not:** rate-limit login attempts, or end other sessions when a
password changes — a session cookie is valid for 30 days whatever happens to the
password, so resetting one does not sign out a lost phone. Both are worth doing
before the cohort is large. (Password reset and account deletion exist; see
above and `docs/ANDROID.md`.)

**What a member can read of her own record.** Her document also holds things
that are Deepika's: her private coach notes, her private notes on each session,
and unpublished plan drafts. The server strips these from what a member is sent
and ignores them when she saves (`lib/privacy.ts`), so "she never sees this" is
true of the network response and not just of the screen.

## Conflict handling

Documents are per member and last-write-wins. Deepika only writes the members
she has actually edited in that session, so having the console open does not
stamp her page-load copy over someone who logged something a minute ago. The
narrow remaining case — Deepika editing a member's plan in the same second
that member logs a workout — can drop one of the two changes. At twenty
members that is a theoretical problem, not an operational one; it becomes
worth real machinery (row versions, or splitting the document further) at a
scale this build is not for.

## Data protection

Once real members sign in with `DATABASE_URL` set, this holds real health
data about identifiable people, and India's DPDP Act applies: consent,
retention, and deletion on request. The onboarding flow already captures
consent in two parts (logging is required, uploading reports is optional and
separate), and it is stored on her record with a date. A member can delete her own
account from inside the app (immediately and completely), download a copy of
her data from the same screen, and change her password. Deepika can remove the
sample members and reset a forgotten password from her console.

## Time

Every date in the app is India time (`Asia/Kolkata`), whatever a phone or a
server believes. Each member's record stores the date that "today" currently
means for her (`member.anchorDate`); loading it on a later day shifts every
day-relative record forward, advances her programme week, and builds the new
day's actions from her plan (`lib/dailyPlan.ts`). The six sample members are
exempt on purpose — their history is frozen at one date so the Radar always has
something to show.

Deepika's console rolls members forward when it loads, not while it is open
(rolling a whole cohort in an open tab would write every member back). A member
who leaves the app open overnight rolls at midnight.

## Reminders

Check-in reminders are opt-in Web Push: a member turns them on from her
account page (or from the one-time offer on Today after her first check-in) and
picks mornings or evenings. Each device she turns them on for is one row in
`push_subscription`, holding only what the push service needs to reach it.
Without a database the option is not shown.

`vercel.json` schedules two daily runs of `/api/cron/reminders`, at 02:00 and
14:00 UTC — 07:30 and 19:30 in India. On the Hobby plan Vercel starts a daily job
somewhere within its hour, so they arrive between 07:30–08:29 and 19:30–20:29;
the route also refuses to send outside 06:00–11:00 and 17:00–22:00 India time,
whoever calls it. Scheduled jobs run on production deployments only.

The rules, all in `lib/reminders.ts` and tested:

- at most one a day per member, whatever number of devices she has;
- none on a day she has already checked in, marked an action, messaged or logged food;
- quiet for 4+ days: every other day; 10+: once a week; 30+: none — a long
  silence is Deepika's to follow up, not a notification's;
- the wording never mentions anything about her health, since lock screens are
  public;
- subscriptions are deleted when she turns reminders off, signs out, or deletes
  her account, and when a push service reports the device gone.

The route's reply is counts only, never who.

On an iPhone, Apple allows web notifications only for an app added to the Home
Screen (iOS 16.4 or later); the account page says so, and Today offers the
Home Screen instead of reminders there. The Android app (`docs/ANDROID.md`)
delegates notifications to Chrome, so it works there as on the web.

## The Next.js version

The app is on **Next 16.4.6, with React 19.3.1** (24 November 2026). Next keeps
each major line in support for two years from its first release; 16.0 came out
in October 2025, so the 16 line gets security fixes until about October 2027.
The app went straight from 14.2.35 to 16: by then 15.x had reached the end of
its own two years, around 21 October 2026.

`npm audit --omit=dev` finds nothing against it — including the four PostCSS
advisories 14 carried, since 16.4.6 brings PostCSS 8.5.23. New advisories will
keep arriving, and they are fixed in 16.x patch releases, so keep `next` on the
newest 16.x; `npm audit --omit=dev` is how to tell when that is due.

**What 16 changed here**, for anyone working on the code:

- `middleware.ts` is now `proxy.ts`, and its function is called `proxy`. It
  runs on Node rather than the Edge runtime, and still only checks the session
  cookie's signature with `lib/auth.ts`. It never imports `lib/accounts.ts`,
  which reaches the database.
- Pages and routes read the request asynchronously: `await cookies()`, and a
  page's `params` and `searchParams` arrive as promises, which client pages
  unwrap with React's `use()`.
- Turbopack builds the app, for `next dev` and `next build`. There is no
  webpack config; if a `webpack()` is ever added to `next.config.mjs`, the
  build stops with an error until it is moved to Turbopack or `--webpack` is
  passed.
- `next lint` is gone and `next build` no longer lints. `npm run lint` runs
  ESLint with `eslint.config.mjs`, which says what was decided about each rule
  it changes.
- Node.js 20.9 or later. Vercel builds on Node 24; anywhere else that runs
  `npm start` — Railway, say — needs at least 20.9.
- `next-env.d.ts` is generated and no longer committed: `next dev` and
  `next build` write different paths into it. `agentRules: false` in
  `next.config.mjs` stops `next dev` writing an `AGENTS.md` of its own;
  guidance for agents is in `CLAUDE.md`.

**Two doors stay shut.** They were shut on 14 because the advisories behind
them were never going to be fixed there. On 16 they are fixed — but the same
two places keep producing them. npm's advisory database lists 45 advisories
against 16.0.0, all fixed by 16.4.6: eight are in the image optimizer, eleven
in how Next reads Server Action and Server Component requests, and three of
the five rated critical — each one remote code execution — came through one
or the other. (The other two need a Windows server, or `use cache`, which this
app does not use.) The app uses neither door, so the next advisory in either
place has nothing to reach here:

- **The image-resizing address, `/_next/image`.** No screen uses `next/image`,
  but the address is answered regardless — and by whom depends on where the
  app runs, so `next.config.mjs` switches it off twice:
  - *Under `next start`* (Railway, a laptop) Next answers it, with the resizer
    those eight advisories are about. `images.unoptimized` stops it resizing,
    and a rewrite hands the address to `/api`, which answers 404.
  - *On Vercel* Next never sees the address. Vercel answers it with an image
    service of its own, ahead of the app: no rewrite and no proxy in this
    repository runs first. That service is Vercel's code, not the code the
    advisories are about — but left alone it resizes any file the app serves,
    for anyone who asks, against the account's image allowance. Vercel's
    older builder left the service out when `unoptimized` was set, which is
    why the address answered 404 while the app was on Next 14. From Next 16.2
    Vercel builds through an adapter that does not read `unoptimized` (read
    in `@vercel/next` 31.0.2, and seen: the first Next 16 preview handed out
    a resized icon). What the service may resize is the config's allow-list,
    so the list is empty (`images.localPatterns: []`, and no remote patterns
    or domains). It then refuses every request with 400.
- **POSTs to a page** — form actions, which Next calls Server Actions. The app
  has none: every save, sign-in and sign-out goes to `/api`. But Next starts
  reading such a request before it finds that out, so `proxy.ts` refuses any
  POST to a page with 405, and `app/api/[...missing]` stops a mistyped `/api`
  address falling through to a page.

`npm run test:e2e` checks that both stay shut, and that sign-in, sign-out and
ordinary pages are not caught with them (`tests/e2e/refused.mjs`).

Those checks run against `next start`, so they cannot see what a host puts in
front of the app — which is how the resized icon got as far as a preview. One
of them (R12) reads the allow-list the build wrote and checks it matches no
file the app serves. The check that counts is on the live address, **after
every deploy that changes `next`, `next.config.mjs` or where the app is
hosted**: open

    /_next/image?url=%2Ficons%2Ficon-192.png&w=64&q=75

It must answer an error — `INVALID_IMAGE_OPTIMIZE_REQUEST` (400) on Vercel,
`{"error":"Not found."}` (404) anywhere else — and never a picture.

**So, still: no Server Action, no `<form>` that posts to a page, and no
`next/image`** — not without opening that door on purpose and changing
`refused.mjs` with it. A Server Action would be refused with 405, and
`next/image` would load pictures unresized — or, for a picture the allow-list
does not name, not at all.

The other rules from the 14 days are lifted. A rewrite or redirect to another
host, and server code that calls `fetch`, were off-limits only because their
advisories were open on 14; they are fixed in 16. `lib/google.ts` still makes
its one call to Google with Node's own `https` — it works and is tested, so it
stays.

## Tests

`npm run test:logic` runs the date, rollover, daily-plan, Radar, privacy,
typed-food, reply-draft and reminder tests with no browser or database. Run it, and `npm run build`, before
committing.

`npm run test:e2e` runs the app itself: it builds it, starts it as in
production against a Postgres it creates for the run, and walks through it in a
browser as a member and as Deepika — sign-up, a day's actions, the next day, a
session with a pain flag, the Radar, signing in with Google. About two minutes. It never reads
`DATABASE_URL` and will not touch a database that is not a local scratch one;
`tests/e2e/README.md` says what it needs and how to point it at a database of
your own.
