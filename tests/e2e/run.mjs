#!/usr/bin/env node
/**
 * End-to-end checks: the real app, a real browser, a real database.
 *
 *   npm run test:e2e              everything
 *   npm run test:e2e -- sheets    one suite
 *
 * It creates its own Postgres, builds the app, starts it against that
 * database, walks through it as a member and as Deepika, and takes all of it
 * down again. Nothing it does can reach a real database — see README.md here.
 */
import { check, indiaToday, launchBrowser, log, note, openDatabase, startApp, startDatabase, tally } from "./harness.mjs";
import flow from "./flow.mjs";
import sheets from "./sheets.mjs";

const SUITES = { flow, sheets };
const asked = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
const unknown = asked.filter((name) => !SUITES[name]);
if (unknown.length) {
  console.error(`No suite called ${unknown.join(", ")}. There are: ${Object.keys(SUITES).join(", ")}.`);
  process.exit(2);
}
const names = asked.length ? asked : Object.keys(SUITES);

const started = Date.now();
const today = indiaToday();
let database, app, db, browser;
let stopping = false;

async function takeDown() {
  if (stopping) return;
  stopping = true;
  await browser?.close().catch(() => {});
  await db?.close().catch(() => {});
  await app?.stop().catch(() => {});
  await database?.stop().catch(() => {});
}
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await takeDown();
    process.exit(130);
  });
}

let broke = null;
try {
  database = await startDatabase();
  log(`Database: ${database.what}.`);
  app = await startApp(database.url);
  log(`App: ${app.url}, built and started as in production.`);
  db = await openDatabase(database.url);
  browser = await launchBrowser();

  for (const name of names) {
    console.log(`\n${name}`);
    const problems = [];
    try {
      await SUITES[name]({ base: app.url, browser, db, problems, coachPassword: app.coachPassword, today });
    } catch (error) {
      // A step that could not be taken at all — a button that never appeared.
      check(`${name}: ran to the end`, false, error.message.split("\n")[0]);
    }
    check(`${name}: nothing was thrown or logged as an error by any page`, problems.length === 0, problems.slice(0, 3).join(" || "));
  }

  if (process.env.E2E_KEEP) {
    console.log(`\nLeft running at ${app.url} — coach sign-in: deepika / ${app.coachPassword}. Ctrl+C to stop.`);
    await new Promise(() => {});
  }
} catch (error) {
  broke = error;
} finally {
  await takeDown();
}

const { total, failed } = tally();
const took = Math.round((Date.now() - started) / 1000);
console.log("");
if (broke) {
  console.error(`Could not run: ${broke.message}`);
} else if (failed.length) {
  console.log(`${failed.length} of ${total} checks failed (${took}s):`);
  for (const name of failed) console.log(`  ${name}`);
} else {
  console.log(`All ${total} checks passed (${took}s).`);
}
if (indiaToday() !== today) {
  note("The date in India changed while this was running. If something failed, run it again before believing it.");
}
process.exit(broke || failed.length ? 1 : 0);
