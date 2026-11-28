/**
 * Photographs the app's own screens for the website: src/shot-*.webp.
 *
 * They are real screens, not drawings, so they can go out of date. Run this
 * again whenever a screen on the site has changed in the app:
 *
 *   1. Start the app with no database, so it opens on the sample members:
 *        env -u DATABASE_URL npm run dev          (from the repository root)
 *   2. node website/scripts/make-shots.mjs        (APP=http://... if not :3000)
 *
 * What is in them, and what is kept out:
 *   - A sample member, Radhika, who is fictional. No real member's data.
 *   - No screen that shows the product's name, so a rename never leaves an old
 *     name inside a picture.
 *   - No screen that shows words written as Deepika's. The sample messages in
 *     the app were written to show her voice; she did not write them, and the
 *     site does not put them in front of the public as hers.
 *
 * Needs Playwright and Chromium (a Claude Code cloud session has both; on your
 * own machine: npm install --no-save playwright && npx playwright install chromium).
 */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "src");
const app = (process.env.APP || "http://localhost:3000").replace(/\/+$/, "");

// The sample member the demo credentials open, and a quarter past eight this
// morning in India, so the greeting is the one most people will see. Today's
// date and not an invented one: the server works out the days of the week for
// itself, and a browser on a different day would disagree with it.
const USER = "radhika";
const PASSWORD = "radhika2026";
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const MORNING = new Date(`${today}T08:15:00+05:30`);

// A phone-sized window. 1.6 device pixels to one CSS pixel is enough for the
// size the pictures are shown at, and keeps each file small.
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.6, timezoneId: "Asia/Kolkata", locale: "en-IN" };

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const context = await browser.newContext({ ...PHONE, reducedMotion: "reduce" });
const page = await context.newPage();
// Only the hour is staged. Timers run as usual.
await page.clock.setFixedTime(MORNING);

async function save(name) {
  // In development the framework floats its own badge over the page.
  await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((el) => el.remove()));
  // Playwright writes PNG and JPEG; Chromium itself can write WebP, which is a
  // third of the size for a screen of flat colour and text.
  const session = await context.newCDPSession(page);
  const { width, height } = PHONE.viewport;
  const { data } = await session.send("Page.captureScreenshot", {
    format: "webp",
    quality: 86,
    clip: { x: 0, y: 0, width, height, scale: PHONE.deviceScaleFactor },
  });
  await session.detach();
  const file = join(out, `shot-${name}.webp`);
  writeFileSync(file, Buffer.from(data, "base64"));
  console.log(`wrote ${file}`);
}

async function refuse(what) {
  const text = await page.evaluate(() => document.body.innerText);
  // The working name is read from the app itself, so this follows a rename.
  if (/bharosa/i.test(text)) throw new Error(`${what}: the product's name is on this screen. Pick another, or crop.`);
}

// ---- sign in ---------------------------------------------------------------
await page.goto(`${app}/`, { waitUntil: "networkidle" });
await page.fill('input[name="username"]', USER);
await page.fill('input[name="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL(/\/member|\/onboarding/, { timeout: 60000 });
await page.waitForTimeout(2500);

// In a browser that has never opened the app, the sample member is taken
// through first-run like anyone else. Answer it the way a member might.
if (/onboarding/.test(page.url())) {
  const next = () => page.getByRole("button", { name: /^(Continue|Start my journey)$/ }).first();
  await next().click();
  await page.getByText("Store what I log, so Deepika can coach me").click();
  await next().click();
  await page.getByRole("button", { name: "Woman", exact: true }).click();
  await page.getByRole("button", { name: "My cycle has become irregular" }).click();
  await page.fill("#age", "44");
  await next().click();
  await page.getByRole("button", { name: "Stop feeling wiped out by the afternoon" }).click();
  await next().click();
  await next().click();
  await next().click();
  await page.waitForURL(/\/member$/, { timeout: 30000 });
  await page.waitForTimeout(2000);
}
if (!/\/member$/.test(new URL(page.url()).pathname)) throw new Error(`Expected Today, and the app is showing ${page.url()}.`);

// ---- Today -----------------------------------------------------------------
await refuse("Today");
await save("today");

// ---- one action, in its three sizes ----------------------------------------
const marks = page.getByRole("button", { name: /^Mark .* done$/ });
let opened = false;
for (let i = 0; i < (await marks.count()); i += 1) {
  await marks.nth(i).click();
  await page.waitForTimeout(900);
  // A session opens its own page instead of the three sizes; skip to the next.
  if (await page.getByRole("link", { name: "Open the session" }).count()) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    continue;
  }
  opened = true;
  break;
}
if (!opened) throw new Error("No action on Today opened the three sizes.");
await refuse("Three sizes");
await save("sizes");
await page.keyboard.press("Escape");
await page.waitForTimeout(500);

// ---- Journey and Movement ---------------------------------------------------
await page.goto(`${app}/member/journey`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await refuse("Journey");
await save("journey");

await page.goto(`${app}/member/movement`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await refuse("Movement");
await save("movement");

await browser.close();
