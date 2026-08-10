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

In Vercel → Settings → Environment Variables:

| Variable | What it is |
| --- | --- |
| `AUTH_SECRET` | Random string used to sign session cookies. Generate with `openssl rand -base64 32`. Changing it signs everyone out. |
| `COACH_PASSWORD` | Deepika's password. |
| `MEMBER_PASSWORD` | Radhika's password. |

Set all three. The login screen stops showing the preview-credentials box
once they are present, which is a quick way to confirm the deployment picked
them up.

Redeploy after adding them — Vercel does not apply new variables to an
existing build.

## What auth does and does not do today

**Does:** signed, HTTP-only session cookies; server-side route protection via
`middleware.ts`, so an unauthenticated request never reaches a screen holding
health data; role separation, so a member cannot open the coach console; a
forged cookie is rejected by signature check.

**Does not:** password reset, rate limiting on login attempts, more than two
accounts, or per-user data isolation — see below.

## The honest limitation

Application data still lives in the browser's `localStorage`, not in a
database. Consequences worth knowing:

- Data does not follow a member between devices or browsers.
- Clearing browser data clears her history.
- Because it is one shared store, a coach and a member using the *same
  browser* see the same underlying data.

For a single-member pilot on her own phone this is workable. For twenty
members it is not, and it is why Sprint B in `V1-ROADMAP.md` exists.

## What to provision for the next sprint

Neither of these can be set up from inside the repo — they need accounts and
keys.

**Database** (Sprint B): a Postgres instance. Supabase is the strongest fit
because it bundles Postgres, row-level security and private object storage
for report PDFs in one place. Provide `DATABASE_URL`.

**AI** (Sprint D): an Anthropic API key as `ANTHROPIC_API_KEY`. It is read
only by server-side route handlers and never shipped to the browser. Do not
put it in `NEXT_PUBLIC_*` — anything with that prefix is embedded in the
client bundle and readable by anyone.
