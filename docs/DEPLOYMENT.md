# Deployment and environment

## Right now

The app runs on Vercel with no environment variables set. That works, and it
signs in with shared preview credentials printed on the login screen:

| Who | Username | Password |
| --- | --- | --- |
| Coach | `deepika` | `deepika2026` |
| Member | `radhika` | `radhika2026` |

Those are in the repository, which means they are public. That is acceptable
only while the app holds nothing but sample data. **Set the variables below
before a real member signs in.**

## Before real members

In Vercel → Settings → Environment Variables. Tick Production, Preview and
Development for each, then **redeploy** — Vercel does not apply new variables
to an existing build.

| Variable | What it is |
| --- | --- |
| `AUTH_SECRET` | Random string used to sign session cookies. Generate with `openssl rand -base64 32`. Changing it signs everyone out. |
| `COACH_PASSWORD` | Deepika's password. Her username is always `deepika`. |
| `MEMBERS` | The cohort. See below. |
| `DATABASE_URL` | Postgres connection string. Optional — see Storage. |

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

Any Postgres works — Supabase, Neon, Railway. Point `DATABASE_URL` at a
**pooled** endpoint (Supabase's pooler port, Neon's `-pooler` host):
serverless functions open many short-lived connections and a free-tier
database will run out of direct ones.

The schema creates itself on first request. On a genuinely empty database the
six demo personas are written once, so the Radar has all four buckets
populated on day one instead of being empty until real members start logging.
Delete them when the pilot is real — they will not come back.

### Before the pilot is real

`npm run db:reset` is not a thing, on purpose. To clear the demo cohort:

```sql
delete from member_state where user_id in
  ('radhika','megha','anita','shreya','nidhi','priya');
```

Leave the `app_meta` row alone — it is what stops the demo data being
reinserted on the next request.

## What auth does and does not do today

**Does:** signed, HTTP-only session cookies; server-side route protection via
`middleware.ts`, so an unauthenticated request never reaches a screen holding
health data; role separation, so a member cannot open the coach console; a
forged cookie is rejected by signature check; per-account data isolation, in
both storage modes.

**Does not:** password reset, rate limiting on login attempts, or account
self-service. Adding or removing a member means editing `MEMBERS` and
redeploying.

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
separate), and it is stored on her record with a date. Deletion is currently a
`delete from member_state where user_id = '…'` — worth turning into something
Deepika can do herself before the cohort grows.
