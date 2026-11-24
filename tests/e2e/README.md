# End-to-end checks

The real app, in a real browser, against a real database.

```bash
npm run test:e2e              # everything — about two minutes
npm run test:e2e -- sheets    # one suite
```

It creates its own Postgres, builds the app, starts it the way it runs in
production, walks through it as a member and as Deepika, and takes all of it
down again. It exits non-zero if anything failed.

`npm run test:logic` covers the rules — dates, the Radar, privacy — without a
browser, in under a second, and is still the first thing to run. This is for
what only shows up when the pieces are joined: that a tap is saved, that it is
saved on the right day, that what a member does reaches Deepika's screen, and
that a sheet does not move the page it opens over.

## What is in it

| | |
| --- | --- |
| `flow.mjs` | One member's first two days, then what Deepika sees of them: sign-up, marking and un-marking, the check-in, the history, a session logged for yesterday with a pain flag, the Radar, Handled and Undo, quick find, her page, a second pain flag, the same session saved twice — and a second member, a man, to check what the console calls him. |
| `sheets.mjs` | Every bottom sheet, with animations **on and off**: the frame must not move, exactly the right sheet must be open, and keyboard focus must be inside it. |
| `google.mjs` | "Continue with Google". First that the app as it ships — no keys set — says nothing about Google. Then, on a second copy of the app with keys set and a stand-in for Google on this machine: creating an account, signing back in, connecting and disconnecting, each way it can be refused, and Deepika's own sign-in. Reads the account table as well as the screen. |
| `refused.mjs` | Requests the app never makes and must turn away: the image-resizing address, and POSTs to a page. No browser — plain requests, the kind a scanner sends. See "The Next.js version" in `docs/DEPLOYMENT.md` for why they matter. |
| `harness.mjs` | The database, the app, the browser, and the helpers the suites read the page and the tables with. |
| `run.mjs` | Runs the suites and reports. |

Animations are on by default, because members have them on. A sheet that
slides is a different thing from one that appears: the bug `sheets.mjs` exists
for only ever happened mid-slide, and every check run with animations off had
passed.

## It cannot reach a real database

The run **empties** the database it uses, so:

- It never reads `DATABASE_URL` or `POSTGRES_URL`. The app it starts is given
  the test database and nothing else, whatever your shell or `.env` has set.
- By default it creates a whole Postgres in a temporary directory, on a free
  port, and deletes it afterwards.
- If you give it a database instead (`E2E_DATABASE_URL`), it must be on this
  machine **and** its name must end in `_e2e`. Anything else is refused before
  a single query is sent.

Passwords and the signing secret are made up for each run.

## If it is interrupted

Ctrl+C stops the app and the database and removes the temporary files. If the
run is killed outright — a timeout, a closed terminal — a small watcher it left
behind does the same within a second or two. And if that was killed as well,
the next run removes whatever the last one abandoned before it starts.

## What it needs

- **Postgres** installed (`initdb` and `pg_ctl`). It looks on the `PATH`, in
  the usual package locations, and in `E2E_PG_BIN`. As root — a cloud
  container — it runs the database as the `postgres` user.
- **Playwright** with Chromium. A Claude Code cloud session has both. On your
  own machine: `npm install --no-save playwright && npx playwright install chromium`.
  It is deliberately not in `package.json`: nothing that ships needs it.

No Postgres but you have Docker?

```bash
docker run --rm -d -p 5544:5432 -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=app_e2e postgres:16
E2E_DATABASE_URL="postgresql://postgres@127.0.0.1:5544/app_e2e?sslmode=disable" npm run test:e2e
```

## Options

| Variable | |
| --- | --- |
| `E2E_SKIP_BUILD=1` | Use the build already in `.next` instead of building. Only if nothing has changed since. |
| `E2E_VERBOSE=1` | Print what each check saw, not only the ones that failed. |
| `E2E_SHOTS=dir` | Save screenshots of the main screens into `dir`. |
| `E2E_HEADED=1` | Show the browser. |
| `E2E_KEEP=1` | Leave the app and database running afterwards, and print how to sign in. |
| `E2E_MOTION=reduce` | Run the flow with animations off. (`sheets.mjs` always does both.) |
| `E2E_DATABASE_URL` | A local database named `*_e2e` to use instead of a temporary one. |
| `E2E_PG_BIN`, `E2E_TMPDIR`, `E2E_PORT`, `E2E_CHROMIUM` | Where to find Postgres, where to put its files, which port, which browser. |

The build replaces `.next`, so stop a running dev server first.

## How a day passes

The app stores every record as a number of days before the date in
`member.anchorDate`, and rolls them forward when she opens it on a later day.
`aDayPasses` in the harness moves that date back by one and reloads — which,
to the app, is a day having gone by. It also renames her action ids to carry
yesterday's date, as a real yesterday's would.

Each run starts from an empty database with the six sample members seeded, so
the suites do not depend on each other; they do depend on those samples
(someone has been quiet, someone has a session tomorrow). If `lib/seed.ts`
changes, some of what the Radar checks expect may need to follow.

## A second copy of the app

Some things are switched on by the deployment's settings, not by anything a
member does. A suite that needs one asks for `anotherApp({ SETTING: "value" })`:
a second copy of the same build, on the same database, with those settings.
Every other suite keeps seeing the app as it ships.

`startFakeGoogle` in the harness is the other half of that for Google sign-in:
a small server on this machine that plays Google's part and does what the test
tells it — sign in as this person, press Cancel, send back an answer meant for
somebody else. The app only accepts a stand-in at a loopback address
(`GOOGLE_TEST_ISSUER`, `lib/google.ts`), so the setting cannot point real
sign-ins anywhere.

## Adding to it

- A check is one line: `check("what should be true", condition, whatItSaw)`.
  Write the name as the sentence you would want to read when it fails.
- To wait for something on screen, `seen(locator)` or `gone(locator)`. To wait
  for something to be saved, `db.memberWhen(user, test)`. Do not sleep and hope.
- When the point is that nothing *else* was saved, `settle()` and then read.
- If it reads the database, say why in the name. "The screen said saved" and
  "it was saved" have been different things here before.
