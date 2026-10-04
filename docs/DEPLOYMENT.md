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

In Vercel → Settings → Environment Variables. Tick Production, Preview and
Development for each, then **redeploy** — Vercel does not apply new variables
to an existing build.

| Variable | What it is |
| --- | --- |
| `AUTH_SECRET` | Random string used to sign session cookies. Generate with `openssl rand -base64 32`. Changing it signs everyone out. |
| `COACH_PASSWORD` | Deepika's password. Her username is always `deepika`. |
| `MEMBERS` | The cohort. See below. |
| `DATABASE_URL` | Postgres connection string. Optional, but required for self-signup — see Storage. `POSTGRES_URL` is read as an alternative. |
| `SIGNUP_CODE` | Optional. When set, creating an account asks for this code. Shown to Deepika, and written into the invite message, on the Members page. |
| `SUPPORT_EMAIL` | Optional. An inbox someone actually reads. With it unset, the public privacy and deletion pages tell people to contact Deepika directly; with it set they show this address. There is deliberately no placeholder address. |
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

The schema creates itself on first request. The six fictional sample members
are **not** seeded unless `SEED_DEMO_COHORT=1`, so a new deployment starts with
an empty console. A deployment that was already seeded shows them on Deepika's
Members page with a notice and a **Remove sample members** button, which
deletes only those six ids (never a real member) and leaves the bootstrap
marker alone so they are not seeded again.

## What auth does and does not do today

**Does:** signed, HTTP-only session cookies; server-side route protection via
`middleware.ts`, so an unauthenticated request never reaches a screen holding
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

## Tests

`npm run test:logic` runs the date, rollover, daily-plan, Radar and privacy
tests with no browser or database. Run it, and `npm run build`, before
committing.
