# End-to-end checks

The real app, in a real browser, against a real database.

```bash
npm run test:e2e              # everything — about a minute and a half
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
| `flow.mjs` | One member's first two days, then what Deepika sees of them: sign-up, marking and un-marking, the check-in, the history, a session logged for yesterday with a pain flag, the Radar, Handled and Undo, quick find, her page, a second pain flag. |
| `sheets.mjs` | Every bottom sheet, with animations **on and off**: the frame must not move, exactly the right sheet must be open, and keyboard focus must be inside it. |
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

## Adding to it

- A check is one line: `check("what should be true", condition, whatItSaw)`.
  Write the name as the sentence you would want to read when it fails.
- To wait for something on screen, `seen(locator)` or `gone(locator)`. To wait
  for something to be saved, `db.memberWhen(user, test)`. Do not sleep and hope.
- When the point is that nothing *else* was saved, `settle()` and then read.
- If it reads the database, say why in the name. "The screen said saved" and
  "it was saved" have been different things here before.
