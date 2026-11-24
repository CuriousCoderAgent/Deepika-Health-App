/**
 * The first time the app meets a database.
 *
 * It makes its own tables, the first time something needs them (lib/db.ts) —
 * so on a new deployment the first two visitors can arrive at two servers
 * that are both, at that moment, creating the same tables. "create table if
 * not exists" does not make that safe: the loser used to fail, for whoever had
 * asked. The tables are now made under a lock, so they take turns.
 *
 * No browser: two copies of the app, an empty database, and six requests sent
 * at once to the address that says whether the database is ready.
 */
import { check, note } from "./harness.mjs";

export default async function starting({ emptyDatabase, anotherApp, alsoRunning }) {
  const url = await emptyDatabase();
  if (!url) {
    note("starting: skipped — it needs a second, empty database, and this run was given one database to use.");
    return;
  }

  const [one, two] = await Promise.all([alsoRunning(anotherApp({}, url)), alsoRunning(anotherApp({}, url))]);
  const answers = await Promise.all(
    [one, two, one, two, one, two].map(async (app) => {
      const res = await fetch(`${app.url}/api/health`);
      return `${res.status} ${await res.text()}`;
    })
  );
  check(
    "ST1 two servers meeting an empty database at the same moment both get it ready — all six requests succeed",
    answers.every((answer) => answer === '200 {"ok":true,"storage":"database"}'),
    answers.join(" | ")
  );

  const errors = [one, two].flatMap((app) => app.output().split("\n")).filter((line) => /error|duplicate|deadlock/i.test(line));
  check("ST2 and neither logged an error doing it", errors.length === 0, errors.slice(0, 3).join(" | "));

  // Nothing later needs these two; stop them now rather than at the end of the run.
  await one.stop();
  await two.stop();
}
