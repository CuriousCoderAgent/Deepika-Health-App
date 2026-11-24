/**
 * The bottom sheets, watched while they move.
 *
 * This suite exists because of one bug. With animations on, opening a sheet on
 * Today scrolled the whole phone frame up by several hundred pixels and left it
 * there: the sheet is given focus while it is still sliding in from below, and
 * a browser asked to focus something off-screen scrolls its ancestors to show
 * it. Every check of the screen until then had been run with animations off,
 * where the sheet simply appears — so none of them saw it.
 *
 * So everything here runs twice, with animations on and off, and asks the same
 * three things each time a sheet opens or closes: did the frame stay put, is
 * exactly the right sheet open, and is keyboard focus where a person would
 * expect it.
 */
import { aDayPasses, check, gone, openPage, seen, signInAsCoach, signUpAndOnboard } from "./harness.mjs";

const KAVYA = { name: "Kavya Rao", username: "kavya-rao", password: "sheets-pass-123" };
const HISTORY = "Your last 14 days";

/** Where the frame, the sheets and the focus are, read in one go. */
const look = (page) =>
  page.evaluate(() => {
    const shell = document.getElementById("sheet-root").parentElement;
    const bar = shell.querySelector("nav").getBoundingClientRect();
    const active = document.activeElement;
    const sheets = [...document.querySelectorAll('[role="dialog"]')];
    const open = sheets.filter((el) => getComputedStyle(el.parentElement).visibility === "visible");
    return {
      steady: shell.scrollTop === 0 && Math.round(bar.bottom) === window.innerHeight,
      scrolled: shell.scrollTop,
      open: open.map((el) => el.getAttribute("aria-label")),
      focusInOpenSheet: open.some((el) => el.contains(active)),
      focusInClosedSheet: sheets.some((el) => !open.includes(el) && el.contains(active)),
      // What a person would call the thing that has focus: its label, or what it says.
      focusOn: (active?.getAttribute("aria-label") || active?.textContent || active?.tagName || "").replace(/\s+/g, " ").trim().slice(0, 32),
    };
  });

const say = (s) => `frame scrolled ${s.scrolled}px · open: ${s.open.join(" + ") || "none"} · focus on "${s.focusOn}"`;

export default async function sheets({ base, browser, db, problems, today, coachPassword }) {
  const m = await openPage(browser, "phone", "sheets", problems, "no-preference");
  await signUpAndOnboard(m, base, KAVYA);
  // The history is only offered once there is something in it, and it only
  // offers yesterday's actions once there is a yesterday with some left
  // untapped — the one path that opens a sheet from a sheet. So: she does one
  // thing on her first day, leaves the rest, and a day passes.
  const circles = m.getByRole("button", { name: /^Mark .* done$/ });
  const minimum = m.getByRole("button", { name: /^Minimum/ });
  const openSession = m.getByRole("link", { name: "Open the session" });
  for (let i = 0; i < (await circles.count()); i++) {
    await circles.nth(i).click();
    await seen(minimum.or(openSession));
    if (await minimum.isVisible()) {
      await minimum.click();
      break;
    }
    await m.keyboard.press("Escape"); // a strength session: logged elsewhere
    await gone(openSession);
  }
  const first = await db.memberWhen(KAVYA.username, (d) => d.actions?.some((a) => a.dayOffset === 0 && a.completed === "minimum"));
  const left = first?.actions?.filter((a) => a.dayOffset === 0 && a.completed === null).length ?? 0;
  if (!left) throw new Error("Her first day has nothing left unmarked, so there is no sheet-from-a-sheet path to check.");
  await aDayPasses(db, KAVYA.username, today);

  // Long enough for a sheet to finish sliding and for focus to have moved.
  // A fixed wait on purpose: the question is what state things are in *after*
  // the animation, and the bug this guards against left no event to wait for.
  const moved = () => m.waitForTimeout(700);
  const firstCircle = () => m.getByRole("button", { name: /^Mark .* done$/ }).first();

  for (const motion of ["no-preference", "reduce"]) {
    const when = motion === "reduce" ? "animations off" : "animations on ";
    await m.emulateMedia({ reducedMotion: motion });
    await m.goto(`${base}/member`, { waitUntil: "networkidle" });
    await seen(m.getByText("Your focus today"));

    let s = await look(m);
    check(`S1 ${when} · Today at rest: the frame fills the screen`, s.steady && s.open.length === 0, say(s));

    await firstCircle().click();
    await moved();
    s = await look(m);
    check(`S2 ${when} · a circle opens its sheet: frame steady, focus inside it`, s.steady && s.open.length === 1 && s.focusInOpenSheet, say(s));

    await m.keyboard.press("Escape");
    await moved();
    s = await look(m);
    check(`S3 ${when} · Escape closes it: frame steady, focus back on the circle`, s.steady && s.open.length === 0 && /^Mark /.test(s.focusOn), say(s));

    await m.getByRole("button", { name: /See each day/ }).click();
    await moved();
    s = await look(m);
    check(`S4 ${when} · the history opens: frame steady, focus inside it`, s.steady && s.open.join() === HISTORY && s.focusInOpenSheet, say(s));

    // The awkward one: a sheet opened from inside another, as the first closes.
    await m.getByRole("dialog", { name: HISTORY }).locator("li").nth(1).getByRole("button").first().click();
    await moved();
    s = await look(m);
    check(
      `S5 ${when} · a sheet opened from the history: only it is open, focus inside it`,
      s.steady && s.open.length === 1 && s.open[0] !== HISTORY && s.focusInOpenSheet,
      say(s)
    );
    await m.keyboard.press("Escape");
    await moved();
  }
  await m.emulateMedia({ reducedMotion: "no-preference" });

  // A sheet that predates all this, on another screen.
  await m.goto(`${base}/member/workout/wk-strength-a`, { waitUntil: "networkidle" });
  await m.locator("button.card").first().click();
  await moved();
  let s = await look(m);
  check("S6 a move on the session page opens its sheet: frame steady, focus inside it", s.steady && s.open.length === 1 && s.focusInOpenSheet, say(s));
  await m.keyboard.press("Escape");
  await moved();

  // Keyboard. A closed sheet is still in the page; its buttons must not be reachable.
  await m.goto(`${base}/member`, { waitUntil: "networkidle" });
  await seen(m.getByText("Your focus today"));
  let insideClosed = 0;
  let moves = 0;
  const stops = new Set();
  for (let i = 0; i < 60; i++) {
    await m.keyboard.press("Tab");
    s = await look(m);
    if (s.focusInClosedSheet) insideClosed++;
    if (!s.steady) moves++;
    stops.add(s.focusOn);
  }
  check(
    "S7 sixty presses of Tab: never inside a closed sheet, and the frame never moves",
    // …and Tab really was travelling: a page that swallowed the key would pass the first two.
    insideClosed === 0 && moves === 0 && stops.size >= 10,
    `${stops.size} different stops, ${insideClosed} inside a closed sheet, frame moved on ${moves}`
  );

  await firstCircle().focus();
  await m.keyboard.press("Enter");
  await moved();
  const opened = await look(m);
  await m.keyboard.press("Tab");
  await m.keyboard.press("Tab");
  await m.keyboard.press("Tab");
  const tabbed = await look(m);
  await m.keyboard.press("Escape");
  await moved();
  const closed = await look(m);
  check(
    "S8 by keyboard alone: Enter opens the sheet with focus in it, Tab stays in it, Escape returns to the circle",
    opened.open.length === 1 && opened.focusInOpenSheet && tabbed.focusInOpenSheet && closed.open.length === 0 && /^Mark /.test(closed.focusOn) && closed.steady,
    `opened: ${say(opened)} | after Tab: ${say(tabbed)} | closed: ${say(closed)}`
  );

  // ---- the console ----------------------------------------------------------
  // Deepika's side had no place for a sheet to open: "+ Add details" on a
  // check-in she enters during a call did nothing, from the day that button
  // was added. It has one now, held to the same questions — and to one of its
  // own, because here the sheet opens over a whole window, not a phone frame:
  // is it a column she can read, and does the page take clicks once it shuts.
  const ADD = "+ Add details";
  const c = await openPage(browser, "desktop", "sheets, in the console", problems, "no-preference");
  await signInAsCoach(c, base, coachPassword);
  const lookConsole = () =>
    c.evaluate((label) => {
      const active = document.activeElement;
      const open = [...document.querySelectorAll('[role="dialog"]')].filter((el) => getComputedStyle(el.parentElement).visibility === "visible");
      const box = open[0]?.getBoundingClientRect();
      const button = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === label);
      const at = button?.getBoundingClientRect();
      return {
        scrolled: Math.round(window.scrollY),
        open: open.map((el) => el.getAttribute("aria-label")),
        focusInOpenSheet: open.some((el) => el.contains(active)),
        focusOn: (active?.getAttribute("aria-label") || active?.textContent || active?.tagName || "").replace(/\s+/g, " ").trim().slice(0, 32),
        // The sheet: how wide, how far off the middle, how far off the bottom edge.
        width: box ? Math.round(box.width) : 0,
        widest: 32 * parseFloat(getComputedStyle(document.documentElement).fontSize),
        offCentre: box ? Math.abs(Math.round(box.left + box.width / 2 - window.innerWidth / 2)) : -1,
        offBottom: box ? Math.round(window.innerHeight - box.bottom) : -1,
        // Whatever is on top where the button is drawn — the button, unless something covers it.
        buttonOnTop: Boolean(at && document.elementFromPoint(at.left + at.width / 2, at.top + at.height / 2) === button),
      };
    }, ADD);
  const sayConsole = (k) =>
    `page scrolled ${k.scrolled}px · open: ${k.open.join(" + ") || "none"} · focus on "${k.focusOn}" · sheet ${k.width}px wide, ${k.offCentre}px off centre, ${k.offBottom}px off the bottom · button ${k.buttonOnTop ? "on top" : "covered"}`;

  for (const motion of ["no-preference", "reduce"]) {
    const when = motion === "reduce" ? "animations off" : "animations on ";
    await c.emulateMedia({ reducedMotion: motion });
    await c.goto(`${base}/coach/members/${KAVYA.username}`, { waitUntil: "networkidle" });
    const add = c.getByRole("button", { name: ADD, exact: true });
    await seen(add);
    await add.scrollIntoViewIfNeeded();
    const rest = await lookConsole();

    await add.click();
    await c.waitForTimeout(700);
    let k = await lookConsole();
    check(
      `S9  ${when} · the console: "${ADD}" opens the check-in sheet, focus inside it, page where it was`,
      k.open.join() === "Her check-in today" && k.focusInOpenSheet && k.scrolled === rest.scrolled && rest.buttonOnTop,
      sayConsole(k)
    );
    check(
      `S10 ${when} · the console: the sheet is a column in the middle of the window, on its bottom edge`,
      k.width >= 320 && k.width <= k.widest && k.offCentre <= 1 && k.offBottom === 0,
      sayConsole(k)
    );

    await c.keyboard.press("Escape");
    await c.waitForTimeout(700);
    k = await lookConsole();
    check(
      `S11 ${when} · the console: Escape closes it — focus back on the button, and nothing left lying over the page`,
      k.open.length === 0 && k.focusOn === ADD && k.scrolled === rest.scrolled && k.buttonOnTop,
      sayConsole(k)
    );
  }
}
