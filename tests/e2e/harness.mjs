/**
 * What the end-to-end checks stand on: a throwaway Postgres, the app built and
 * started against it, a browser, and a few helpers for reading the page and
 * the database.
 *
 * Nothing here knows what the app should do — that is in the suites. This file
 * is only about getting a real app in front of a real browser and taking it
 * away again afterwards.
 */
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Animations are ON unless asked otherwise. Members have them on, and a sheet
 * that slides is a different thing to test from one that appears: the bug that
 * pushed the whole phone frame up only ever happened mid-slide.
 */
export const MOTION = process.env.E2E_MOTION === "reduce" ? "reduce" : "no-preference";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lastLines = (text, n = 12) => String(text ?? "").trim().split("\n").slice(-n).join("\n");
export const log = (text) => console.log(`      ${text}`);

// ------------------------------------------------------------------ results
const results = [];
const VERBOSE = Boolean(process.env.E2E_VERBOSE);

/** One line per thing checked. The detail is printed when it fails. */
export function check(name, ok, detail = "") {
  const passed = Boolean(ok);
  results.push({ name, passed });
  const more = detail && (!passed || VERBOSE) ? ` — ${String(detail).replace(/\s+/g, " ").slice(0, 400)}` : "";
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}${more}`);
  return passed;
}
export const note = (text) => console.log(`NOTE  ${text}`);
export const tally = () => ({ total: results.length, failed: results.filter((r) => !r.passed).map((r) => r.name) });

// ------------------------------------------------------------------ waiting
/** Polls until `fn` returns something truthy, and returns it — or false. */
export async function until(fn, ms = 8000, every = 150) {
  const end = Date.now() + ms;
  for (;;) {
    let value;
    try {
      value = await fn();
    } catch {
      value = undefined;
    }
    if (value) return value;
    if (Date.now() >= end) return false;
    await sleep(every);
  }
}

/** True once the element is on screen. Use for "this should appear". */
export const seen = (locator, ms = 6000) =>
  locator.first().waitFor({ state: "visible", timeout: ms }).then(() => true, () => false);

/** True once it is no longer on screen. Use for "this should go away". */
export const gone = (locator, ms = 6000) =>
  locator.first().waitFor({ state: "hidden", timeout: ms }).then(() => true, () => false);

/** An element's text on one line. */
export const textOf = async (locator) => (await locator.innerText()).replace(/\s+/g, " ").trim();

/**
 * Long enough for a change to be saved, when the check is that nothing else
 * was. (For "this should be saved", poll the database with `until` instead —
 * it is quicker and does not guess.) The app saves 900ms after the last edit.
 */
export const settle = () => sleep(2200);

// ------------------------------------------------------------------ dates
const indiaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
/** Today in India, the app's only clock (lib/calendar.ts). */
export const indiaToday = () => indiaDate.format(new Date());
export const dayBefore = (key) => new Date(Date.parse(`${key}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

// ------------------------------------------------------------------ database
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * This run empties the database it is given, so it only accepts one that is
 * plainly a scratch database on this machine. The app's own DATABASE_URL is
 * never read: pointing a test at production by leaving a variable set is
 * exactly the accident this is here to make impossible.
 */
export function assertThrowaway(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("E2E_DATABASE_URL is not a URL.");
  }
  const name = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error(`E2E_DATABASE_URL points at "${parsed.hostname}". Only a database on this machine is accepted — the run empties it.`);
  }
  if (!/_e2e$/.test(name)) {
    throw new Error(`E2E_DATABASE_URL names the database "${name}". Its name must end in _e2e — the run empties it.`);
  }
}

async function pgClient(url) {
  const { Client } = require("pg");
  const client = new Client({ connectionString: url, ssl: false });
  await client.connect();
  return client;
}

const freePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

/** The directory holding initdb and pg_ctl, wherever this system keeps them. */
function postgresBin() {
  const dirs = [];
  if (process.env.E2E_PG_BIN) dirs.push(process.env.E2E_PG_BIN);
  const config = spawnSync("pg_config", ["--bindir"], { encoding: "utf8" });
  if (config.status === 0) dirs.push(config.stdout.trim());
  const which = spawnSync("which", ["initdb"], { encoding: "utf8" });
  if (which.status === 0 && which.stdout.trim()) dirs.push(path.dirname(fs.realpathSync(which.stdout.trim())));
  // Debian and Ubuntu keep the server binaries off the PATH, one directory a version.
  for (const base of ["/usr/lib/postgresql", "/usr/pgsql", "/opt/homebrew/opt", "/usr/local/opt"]) {
    let entries = [];
    try {
      entries = fs.readdirSync(base);
    } catch {
      continue;
    }
    for (const entry of entries.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))) {
      if (base.endsWith("/opt") && !entry.startsWith("postgresql")) continue;
      dirs.push(path.join(base, entry, "bin"));
    }
  }
  return dirs.find((dir) => fs.existsSync(path.join(dir, "initdb")) && fs.existsSync(path.join(dir, "pg_ctl")));
}

/**
 * Postgres will not run as root, which is what a cloud container is. There it
 * is run as the `postgres` user the package created, from a directory that
 * user can reach.
 */
function databaseUser() {
  const root = typeof process.getuid === "function" && process.getuid() === 0;
  if (!root) return { wrap: (cmd, args) => [cmd, args], own: () => {}, base: process.env.E2E_TMPDIR || os.tmpdir() };
  const id = (flag) => Number(spawnSync("id", [flag, "postgres"], { encoding: "utf8" }).stdout);
  const uid = id("-u");
  const gid = id("-g");
  if (!Number.isInteger(uid) || uid === 0) {
    throw new Error('Running as root, and there is no "postgres" user to run the database as. Run as an ordinary user, or set E2E_DATABASE_URL.');
  }
  return {
    wrap: (cmd, args) => ["runuser", ["-u", "postgres", "--", cmd, ...args]],
    own: (dir) => fs.chownSync(dir, uid, gid),
    base: process.env.E2E_TMPDIR || "/var/tmp",
  };
}

const quote = (text) => `'${String(text).replace(/'/g, `'\\''`)}'`;
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
};

/**
 * What must still happen if this process is killed outright — a timeout, a
 * closed terminal — and never reaches its own tidying up. A small detached
 * shell waits for this process to go and then runs `script`. Without it, a
 * killed run leaves a Postgres and an app server running for good.
 *
 * Returns a function that calls the watcher off, for when the tidying up has
 * been done the ordinary way.
 */
function whenThisProcessIsGone(script) {
  const watcher = spawn("sh", ["-c", `while kill -0 ${process.pid} 2>/dev/null; do sleep 1; done; ${script}`], {
    detached: true,
    stdio: "ignore",
  });
  watcher.unref();
  return () => {
    try {
      process.kill(watcher.pid, "SIGKILL");
    } catch {
      /* it has already gone */
    }
  };
}

function run(command, args, what) {
  const r = spawnSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120_000 });
  if (r.status !== 0) throw new Error(`${what} failed.\n${lastLines(r.stderr || r.stdout || r.error?.message)}`);
}

/**
 * A database for this run and nothing else.
 *
 * Unless E2E_DATABASE_URL names one, a whole Postgres is created in a
 * temporary directory, started on a free port, and deleted afterwards — so
 * there is no shared state between runs and nothing to clean up by hand.
 */
export async function startDatabase() {
  const given = process.env.E2E_DATABASE_URL?.trim();
  if (given) {
    assertThrowaway(given);
    const client = await pgClient(given);
    await client.query("drop schema if exists public cascade; create schema public;");
    await client.end();
    return { url: given, what: "the database in E2E_DATABASE_URL, emptied", stop: async () => {} };
  }

  const bin = postgresBin();
  if (!bin) {
    throw new Error(
      "No Postgres found (looked for initdb and pg_ctl). Install Postgres, set E2E_PG_BIN to the directory holding them, " +
        "or point E2E_DATABASE_URL at a local scratch database whose name ends in _e2e."
    );
  }
  const as = databaseUser();
  const pgCtl = path.join(bin, "pg_ctl");
  sweepLeftBehind(as, pgCtl);

  // One directory for the run: the data, the server's log and socket, and a
  // note of whose it is — so a later run can tell an abandoned one from one
  // that is still going.
  const home = fs.mkdtempSync(path.join(as.base, HOME_PREFIX));
  as.own(home);
  fs.writeFileSync(path.join(home, "runner.pid"), String(process.pid));
  const data = path.join(home, "data");
  const stopCommand = as.wrap(pgCtl, ["-D", data, "-m", "immediate", "stop"]);
  const callOff = whenThisProcessIsGone(
    `${[stopCommand[0], ...stopCommand[1]].map(quote).join(" ")} >/dev/null 2>&1; rm -rf ${quote(home)}`
  );
  const port = await freePort();
  const tool = (name, args, what) => run(...as.wrap(path.join(bin, name), args), what);
  const stop = async () => {
    spawnSync(stopCommand[0], [...stopCommand[1], "-w"], { stdio: "ignore", timeout: 30_000 });
    fs.rmSync(home, { recursive: true, force: true });
    callOff();
  };

  try {
    tool("initdb", ["-D", data, "-U", "postgres", "-A", "trust", "-E", "UTF8", "--locale=C", "-N"], "Creating the test database");
    // Durability is switched off: this database lives for a few minutes.
    const options = `-p ${port} -k ${home} -c listen_addresses=127.0.0.1 -c fsync=off -c synchronous_commit=off -c full_page_writes=off`;
    tool("pg_ctl", ["-D", data, "-l", path.join(home, "server.log"), "-w", "-t", "60", "-o", options, "start"], "Starting the test database");
    const admin = await pgClient(`postgresql://postgres@127.0.0.1:${port}/postgres`);
    await admin.query("create database app_e2e");
    await admin.end();
  } catch (error) {
    await stop();
    throw error;
  }
  return {
    url: `postgresql://postgres@127.0.0.1:${port}/app_e2e?sslmode=disable`,
    what: `a temporary Postgres on port ${port}`,
    stop,
  };
}

const HOME_PREFIX = "app-e2e-pg-";

/**
 * Removes test databases whose run is no longer alive. The watcher above
 * normally sees to that within a second; this is for when it was killed too.
 * A directory with no owner recorded is left alone unless it is old — it may
 * be another run, a moment into starting.
 */
function sweepLeftBehind(as, pgCtl) {
  let entries = [];
  try {
    entries = fs.readdirSync(as.base);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.startsWith(HOME_PREFIX)) continue;
    const home = path.join(as.base, entry);
    let owner = NaN;
    let age = 0;
    try {
      age = Date.now() - fs.statSync(home).mtimeMs;
      owner = Number(fs.readFileSync(path.join(home, "runner.pid"), "utf8"));
    } catch {
      /* no owner recorded */
    }
    const known = Number.isInteger(owner) && owner > 0;
    if (known ? alive(owner) : age < 10 * 60_000) continue;
    spawnSync(...as.wrap(pgCtl, ["-D", path.join(home, "data"), "-m", "immediate", "-w", "stop"]), { stdio: "ignore", timeout: 30_000 });
    fs.rmSync(home, { recursive: true, force: true });
    log(`Removed a test database an earlier run left behind (${entry}).`);
  }
}

/** Reading and rewriting what the app saved, straight from its tables. */
export async function openDatabase(url) {
  const client = await pgClient(url);
  const memberDoc = async (userId) =>
    (await client.query("select doc from member_state where user_id = $1", [userId])).rows[0]?.doc ?? null;
  const coachDoc = async () => (await client.query("select doc from coach_state limit 1")).rows[0]?.doc ?? {};
  return {
    memberDoc,
    coachDoc,
    setMemberDoc: (userId, doc) =>
      client.query("update member_state set doc = $2::jsonb where user_id = $1", [userId, JSON.stringify(doc)]),
    /** Waits for her saved record to satisfy `test`, and returns it (or the last one read). */
    memberWhen: async (userId, test, ms = 8000) => {
      let last = null;
      await until(async () => {
        last = await memberDoc(userId);
        return last && test(last);
      }, ms);
      return last;
    },
    coachWhen: async (test, ms = 8000) => {
      let last = {};
      await until(async () => {
        last = await coachDoc();
        return test(last);
      }, ms);
      return last;
    },
    close: () => client.end(),
  };
}

/**
 * Makes it "the next day" for one member.
 *
 * The app keeps every record as a number of days before the date in
 * `member.anchorDate`, and rolls them all forward when she opens it on a later
 * day. So moving that date back one day, then reloading, is a day passing.
 *
 * Action ids carry the day they were made. A real yesterday's carry
 * yesterday's date, so they must here too — otherwise yesterday's and today's
 * actions share an id and marking one marks both, which never happens for real.
 */
export async function aDayPasses(db, userId, today, change = (doc) => doc) {
  const doc = await db.memberDoc(userId);
  const yesterday = dayBefore(today);
  doc.member.anchorDate = yesterday;
  doc.member.onboardedAt = yesterday;
  doc.actions = doc.actions.map((a) => ({ ...a, id: a.id.replace(`-${today}-`, `-${yesterday}-`) }));
  await db.setMemberDoc(userId, change(doc) ?? doc);
}

// ------------------------------------------------------------------ the app
/**
 * Builds the app and starts it the way it runs in production, against the
 * test database. Passwords and the signing secret are made up for the run.
 */
export async function startApp(databaseUrl) {
  const next = require.resolve("next/dist/bin/next");
  const port = Number(process.env.E2E_PORT) || (await freePort());
  const secret = (bytes) => crypto.randomBytes(bytes).toString("base64url");
  const coachPassword = `coach-${secret(9)}`;
  const env = {
    ...process.env,
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    PORT: String(port),
    // Whatever the shell has set, the app under test only ever sees this one.
    DATABASE_URL: databaseUrl,
    POSTGRES_URL: "",
    AUTH_SECRET: secret(32),
    COACH_PASSWORD: coachPassword,
    MEMBERS: `radhika:${secret(9)}:Radhika`,
    SIGNUP_CODE: "",
    SEED_DEMO_COHORT: "1",
  };

  if (process.env.E2E_SKIP_BUILD) {
    if (!fs.existsSync(path.join(ROOT, ".next", "BUILD_ID"))) {
      throw new Error("E2E_SKIP_BUILD is set, but there is no build in .next. Run `npm run build` first.");
    }
    log("Using the build already in .next.");
  } else {
    log("Building the app. This replaces .next — stop a running dev server first.");
    const built = spawnSync(process.execPath, [next, "build"], {
      cwd: ROOT,
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
    if (built.status !== 0) throw new Error(`The build failed.\n${lastLines(`${built.stdout}\n${built.stderr}`, 30)}`);
  }

  const child = spawn(process.execPath, [next, "start", "-p", String(port)], { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  const callOff = whenThisProcessIsGone(`kill ${child.pid} 2>/dev/null`);
  const stop = async () => {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      if (!(await until(() => child.exitCode !== null, 5000))) child.kill("SIGKILL");
    }
    callOff();
  };

  const up = await until(async () => {
    if (child.exitCode !== null) return true;
    try {
      return (await fetch(`http://127.0.0.1:${port}/`, { redirect: "manual" })).status < 500;
    } catch {
      return false;
    }
  }, 60_000, 300);
  if (!up || child.exitCode !== null) {
    await stop();
    throw new Error(`The app did not start.\n${lastLines(output)}`);
  }
  return { url: `http://localhost:${port}`, coachPassword, stop, output: () => output };
}

// ------------------------------------------------------------------ the browser
export async function launchBrowser() {
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch {
    throw new Error(
      "Playwright is not installed. A Claude Code cloud session has it already; on your own machine run\n" +
        "  npm install --no-save playwright && npx playwright install chromium"
    );
  }
  return chromium.launch({
    headless: !process.env.E2E_HEADED,
    ...(process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : {}),
  });
}

const SHAPES = {
  phone: { viewport: { width: 390, height: 844 } },
  desktop: { viewport: { width: 1280, height: 900 } },
};

/**
 * A fresh, signed-out browser the size of a phone or a desktop.
 *
 * The service worker is kept out of it: a cached page from an earlier step is
 * the last thing a check should be reading. Anything the page throws, or logs
 * as an error, is collected in `problems`.
 */
export async function openPage(browser, shape, who, problems, motion = MOTION) {
  const context = await browser.newContext({
    ...SHAPES[shape],
    deviceScaleFactor: process.env.E2E_SHOTS ? 2 : 1,
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: motion });
  page.on("pageerror", (e) => problems.push(`${who}: ${e}`));
  page.on("console", (m) => {
    // Fonts come from Google; a machine with no route to it logs a failed load.
    if (m.type() === "error" && !/Failed to load resource|ERR_CERT|net::ERR/.test(m.text())) {
      problems.push(`${who}: ${m.text().slice(0, 240)}`);
    }
  });
  return page;
}

/** Saves a screenshot when E2E_SHOTS names a directory; otherwise does nothing. */
export async function shot(page, name, options = {}) {
  const dir = process.env.E2E_SHOTS;
  if (!dir) return;
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}.png`), ...options });
}

// ------------------------------------------------------------------ people
/** Creates an account through the sign-up form and walks the first-run questions.
 *  `gender` is the button to press on the "about you" step: Woman, Man or Other. */
export async function signUpAndOnboard(page, base, { name, username, password, gender = "Woman" }) {
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Create your account" }).click();
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.fill('input[name="confirm"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/onboarding/, { timeout: 30_000 });

  const proceed = () => page.getByRole("button", { name: "Continue", exact: true }).click();
  await proceed(); // welcome
  await page.getByRole("button", { name: /Store what I log/ }).click();
  await proceed(); // consent
  await page.getByRole("button", { name: gender, exact: true }).click();
  await page.fill("#age", "44");
  await page.locator('p:has-text("Where you are right now") + div button').first().click();
  await proceed(); // about you
  await page.fill("#customGoal", "Feel stronger");
  await proceed(); // goals
  await proceed(); // boundaries
  await page.getByRole("button", { name: "Start my journey" }).click();
  await page.waitForURL(/\/member$/, { timeout: 30_000 });
  // Today is drawn once her record has loaded and today's actions exist.
  await seen(page.getByText("Your focus today"), 15_000);
}

export async function signInAsCoach(page, base, password) {
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await page.fill('input[name="username"]', "deepika");
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/coach/, { timeout: 30_000 });
  await seen(page.getByRole("heading", { name: "Radar" }), 15_000);
}
