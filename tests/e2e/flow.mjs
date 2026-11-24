/**
 * One member's first two days, then what Deepika sees of them.
 *
 * It follows the path a real person walks — sign up, answer the first-run
 * questions, mark something done, change her mind, check in, come back the
 * next day and log a session that hurt — and then signs in as Deepika to see
 * that all of it arrived, in the right place and on the right day.
 *
 * What it checks is behaviour and what was saved, not layout. Where it reads
 * the database, that is deliberate: "the screen said saved" and "it was saved"
 * have been different things in this app before.
 */
import { aDayPasses, check, gone, note, openPage, seen, settle, shot, signInAsCoach, signUpAndOnboard, textOf, until } from "./harness.mjs";

const MEERA = { name: "Meera Nair", username: "meera-nair", password: "first-pass-123" };
const ARJUN = { name: "Arjun Rao", username: "arjun-rao", password: "second-pass-456", gender: "Man" };
const HINT = "Tap a circle when you’ve done one";
const SESSION = "Foundations session";
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default async function flow({ base, browser, db, problems, coachPassword, today }) {
  const saved = (test, ms) => db.memberWhen(MEERA.username, test, ms);

  // ---------------------------------------------------------------- A. her first day
  const m = await openPage(browser, "phone", "member", problems);
  await signUpAndOnboard(m, base, MEERA);
  check("A1  sign-up and the first-run questions lead to Today", new URL(m.url()).pathname === "/member");

  const marks = () => m.getByRole("button", { name: /^Mark .* done$/ });
  const count = await marks().count();
  check("A2  Today has one to three actions, each with a circle to mark it", count >= 1 && count <= 3, `${count} actions`);
  check("A3  a first-timer is told how", await seen(m.getByText(HINT)));

  // The first action that is not a strength session: those are logged from the
  // session page, which part B covers.
  const minimum = m.getByRole("button", { name: /^Minimum/ });
  const openSession = m.getByRole("link", { name: "Open the session" });
  let picked = null;
  for (let i = 0; i < count && !picked; i++) {
    await marks().nth(i).click();
    await seen(minimum.or(openSession));
    if (await openSession.isVisible()) {
      await m.keyboard.press("Escape");
      await gone(openSession);
      continue;
    }
    picked = (await marks().nth(i).getAttribute("aria-label")).replace(/^Mark (.*) done$/, "$1");
  }
  const three =
    Boolean(picked) &&
    (await minimum.isVisible()) &&
    (await m.getByRole("button", { name: /^Target/ }).isVisible()) &&
    (await m.getByRole("button", { name: /^Stretch/ }).isVisible());
  check("A4  the circle opens the three sizes, without leaving Today", three, picked ?? "no action that is not a session");
  if (!picked) throw new Error("Nothing on Today could be marked from the sheet, so the rest cannot run.");
  const mine = (doc) => doc.actions.find((a) => a.title === picked && a.dayOffset === 0);
  const circle = (label) => m.getByRole("button", { name: label, exact: true });

  await minimum.click();
  check(
    "A5  it says it was recorded, and offers an Undo",
    (await seen(m.getByText("Recorded. That is a complete day."))) && (await m.getByRole("button", { name: "Undo" }).isVisible())
  );
  check(
    "A6  the count moves, and the greeting stops sounding as if it is waiting",
    (await seen(m.getByText(new RegExp(`^1 of ${count}$`)))) && (await seen(m.getByText("That's a full day already.")))
  );
  check("A7  the first-timer hint goes once she has marked something", await gone(m.getByText(HINT)));
  let doc = await saved((d) => mine(d)?.completed === "minimum");
  check("A8  it is in the database at the size she chose", mine(doc)?.completed === "minimum", JSON.stringify(mine(doc)?.completed));

  await circle(`${picked}: done. Change`).click();
  await m.getByRole("button", { name: "Clear what I marked" }).click();
  doc = await saved((d) => mine(d)?.completed === null);
  check("A9  she can clear a mis-tap", mine(doc)?.completed === null, JSON.stringify(mine(doc)?.completed));

  await circle(`Mark ${picked} done`).click();
  await m.getByRole("button", { name: /^Target/ }).click();
  await m.getByRole("button", { name: "Undo" }).click();
  check("A10 Undo takes it straight back", await seen(circle(`Mark ${picked} done`)));
  await circle(`Mark ${picked} done`).click();
  await m.getByRole("button", { name: /^Target/ }).click();
  doc = await saved((d) => mine(d)?.completed === "target");
  check("A11 and marking it again sticks", mine(doc)?.completed === "target", JSON.stringify(mine(doc)?.completed));

  await m.getByRole("button", { name: "Good", exact: true }).click();
  check(
    "A12 the check-in folds to one line once answered",
    (await seen(m.getByText("Feeling good today"))) && (await gone(m.getByRole("button", { name: "Stressed", exact: true })))
  );
  await m.getByRole("button", { name: "Change", exact: true }).click();
  await m.getByRole("button", { name: "Tired", exact: true }).click();
  const tiredShown = await seen(m.getByText("Feeling tired today"));
  const todays = (d) => d.pulses.filter((p) => p.dayOffset === 0);
  doc = await saved((d) => todays(d).length === 1 && todays(d)[0].energy === 2);
  check(
    "A13 changing it replaces the check-in instead of adding a second",
    tiredShown && todays(doc).length === 1 && todays(doc)[0].energy === 2,
    `${todays(doc).length} check-ins today, energy ${todays(doc)[0]?.energy}`
  );

  await m.getByRole("button", { name: /See each day/ }).click();
  const history = m.getByRole("dialog", { name: "Your last 14 days" });
  await seen(history);
  const historyText = await textOf(history);
  check(
    "A14 the history shows today: what she did, and how she felt",
    new RegExp(`Today ${escapeRegex(picked)} · Target`).test(historyText) && /Felt tired/.test(historyText),
    historyText.slice(0, 160)
  );
  await m.keyboard.press("Escape");
  await gone(history);

  await m.goto(`${base}/member/progress`, { waitUntil: "networkidle" });
  await seen(m.getByText("The last 7 days"));
  const tiles = await textOf(m.locator('p.label:has-text("The last 7 days")').locator(".."));
  check("A15 Insights counts her week", /Active days 1 of 7/.test(tiles) && /Check-ins 1 /.test(tiles), tiles);
  const readout = await textOf(m.getByRole("group", { name: /Energy, sleep and calm/ }).locator("span.sr-only"));
  check("A16 her ratings can be read without hovering, and an unrated sleep is not a number", /Today: Energy 2, Sleep not rated, Calm 3/.test(readout), readout);
  await m.getByRole("button", { name: "Journey", exact: true }).click();
  check("A17 the journey view waits for a second week instead of drawing one point", await seen(m.getByText("This view fills in a week at a time")));
  await shot(m, "flow-insights");

  // ---------------------------------------------------------------- B. the next day
  // A day passes, and on what is now yesterday there is a strength session she
  // did but never tapped.
  await aDayPasses(db, MEERA.username, today, (d) => {
    const { skipReason, provenance, ...template } = d.actions.find((a) => a.dayOffset === 0);
    d.actions.push({ ...template, id: "a-e2e-session", title: SESSION, workoutId: "wk-strength-a", completed: null });
  });
  await m.goto(`${base}/member`, { waitUntil: "networkidle" });
  await seen(m.getByText("Your focus today"));
  check("B1  today starts fresh, and the first-timer hint does not come back", (await seen(m.getByText(/^0 of \d$/))) && !(await m.getByText(HINT).isVisible()));

  await m.getByRole("button", { name: /See each day/ }).click();
  await seen(history);
  const offered = await history.locator("li").nth(1).getByRole("button").allInnerTexts();
  check(
    "B2  yesterday offers what she left unmarked, and only that",
    (await history.getByText("Did one of these and didn’t tap it?").isVisible()) && offered.includes(SESSION) && !offered.includes(picked),
    JSON.stringify(offered)
  );
  await shot(m, "flow-history");

  await history.getByRole("button", { name: SESSION, exact: true }).click();
  await seen(openSession);
  check("B3  a session is sent to the session page, marked as yesterday's", /\/member\/workout\/wk-strength-a\?day=-1$/.test(await openSession.getAttribute("href")));
  await openSession.click();
  await m.waitForURL(/workout\/wk-strength-a\?day=-1/, { timeout: 30_000 });
  const didYesterday = m.getByRole("button", { name: "I did this yesterday" });
  check("B4  the session page says which day it is logging", (await seen(didYesterday)) && (await m.getByText("logging this for").isVisible()));
  const firstSession = await textOf(m.locator("h1"));
  await didYesterday.click();
  check("B5  and asks about yesterday", await seen(m.getByRole("heading", { name: "How did it go yesterday?" })));
  await m.getByRole("button", { name: /Something hurt/ }).click();
  await m.fill("textarea", "left knee on the way down");
  await m.getByRole("button", { name: "Save it" }).click();
  check(
    "B6  she is told it was logged for yesterday, and to wait for Deepika",
    (await seen(m.getByRole("heading", { name: "Logged for yesterday." }))) && (await m.getByText("Do not do the next session until she has replied").isVisible())
  );
  doc = await saved((d) => d.workoutLogs.length === 1);
  const logged = doc.workoutLogs[0];
  const session = doc.actions.find((a) => a.id === "a-e2e-session");
  check(
    "B7  the session and its pain flag are saved on yesterday, not today",
    doc.workoutLogs.length === 1 && logged?.dayOffset === -1 && logged?.painFlag === true && session?.dayOffset === -1 && session?.completed === "target",
    `log on day ${logged?.dayOffset}, pain ${logged?.painFlag}; action on day ${session?.dayOffset}, ${session?.completed}`
  );
  check(
    "B8  her record rolled forward a day and kept what she did",
    doc.member.anchorDate === today && doc.actions.some((a) => a.title === picked && a.dayOffset === -1 && a.completed === "target"),
    `anchored on ${doc.member.anchorDate}`
  );
  const todayActions = (d) => d.actions.filter((a) => a.dayOffset === 0);
  check("B9  today is untouched by it", todayActions(doc).length >= 1 && todayActions(doc).every((a) => a.completed === null));

  // Anything else she left unmarked yesterday takes one tap, from the same list.
  const other = doc.actions.find((a) => a.dayOffset === -1 && a.completed === null && !a.workoutId);
  await m.goto(`${base}/member`, { waitUntil: "networkidle" });
  await seen(m.getByText("Your focus today"));
  if (other) {
    await m.getByRole("button", { name: /See each day/ }).click();
    await seen(history);
    await history.getByRole("button", { name: other.title, exact: true }).click();
    check(
      "B10 marking yesterday asks about yesterday",
      (await seen(m.getByText("How much of it did you do yesterday?"))) &&
        (await m.getByRole("button", { name: "Didn’t get to it" }).isVisible()) &&
        !(await m.getByText("why today").isVisible())
    );
    await shot(m, "flow-quick-yesterday");
    await minimum.click();
    check("B11 and says so", await seen(m.getByText("Recorded for yesterday.")));
    doc = await saved((d) => d.actions.find((a) => a.id === other.id)?.completed === "minimum");
    const fixed = doc.actions.find((a) => a.id === other.id);
    check("B12 it lands on yesterday, not today", fixed?.completed === "minimum" && fixed?.dayOffset === -1, `${fixed?.completed} on day ${fixed?.dayOffset}`);
    check(
      "B13 and today's own copy of the same action is left alone",
      todayActions(doc).length >= 1 && todayActions(doc).every((a) => a.completed === null) && new Set(doc.actions.map((a) => a.id)).size === doc.actions.length,
      todayActions(doc).map((a) => `${a.title}: ${a.completed}`).join(", ")
    );
  } else {
    note("B10–B13 skipped: the session was the only thing left unmarked yesterday.");
  }

  // She checks in today, so Deepika sees her as here.
  await m.getByRole("button", { name: "Okay", exact: true }).click();
  await seen(m.getByText("Feeling okay today"));
  await saved((d) => todays(d).length === 1);

  // A private note of Deepika's sits in the same record. It must never be sent to her.
  doc = await db.memberDoc(MEERA.username);
  doc.member.notes = [{ id: "n1", at: today, text: "PRIVATE-COACH-NOTE" }];
  await db.setMemberDoc(MEERA.username, doc);
  const sentToHer = await m.evaluate(async () => (await fetch("/api/state", { cache: "no-store" })).text());
  check("B14 Deepika's private notes are never sent to the member they are about", !sentToHer.includes("PRIVATE-COACH-NOTE") && sentToHer.includes('"configured":true'));

  // ---------------------------------------------------------------- C. Deepika
  const c = await openPage(browser, "desktop", "coach", problems);
  await signInAsCoach(c, base, coachPassword);
  const attention = c.locator("main section").first();
  const firstCard = () => attention.locator("div.card").first();
  await seen(firstCard());
  const glance = (await c.locator("main a.card.press").allInnerTexts()).map((text) => text.replace(/\s+/g, " ").trim());
  check("C1  the Radar opens with the day in four numbers", glance.length === 4 && /^Here today \d+ of \d+ members$/.test(glance[0]), JSON.stringify(glance));

  let card = await textOf(firstCard());
  check(
    "C2  the pain flag she saved is the first thing on the Radar",
    /Meera/.test(card) && card.includes(`Flagged that something hurt in ${firstSession}, yesterday: “left knee on the way down”`) && /R12/.test(card),
    card.slice(0, 220)
  );
  check(
    "C3  with what to do about it, and a reply ready to edit",
    card.includes("Reply before the next session") && /draft=something-hurt/.test(await firstCard().getByRole("link", { name: "Write to her" }).getAttribute("href"))
  );
  await shot(c, "flow-radar-pain");

  const toast = c.locator('[role="status"]', { hasText: /handled/i });
  const undo = c.getByRole("button", { name: "Undo" });
  const meeraFlagged = async () => /Meera/.test(await attention.innerText());
  const handled = (d) => d.resolvedRadar ?? [];

  await firstCard().getByRole("button", { name: "Handled", exact: true }).click();
  await seen(toast);
  check("C4  Handled takes it off the page and offers an Undo", (await textOf(toast)) === "Handled. Undo" && (await until(async () => !(await meeraFlagged()))), await textOf(toast));
  await undo.click();
  check("C5  Undo puts it back", await until(meeraFlagged));
  await firstCard().getByRole("button", { name: "Handled", exact: true }).click();
  let coach = await db.coachWhen((d) => handled(d).length === 1);
  check(
    "C6  it is saved as that one flag, with the day it was handled",
    handled(coach).length === 1 && new RegExp(`^${MEERA.username}-R12-wl-\\d+\\|${today}$`).test(handled(coach)[0]),
    JSON.stringify(handled(coach))
  );

  // A flag about a pattern says it will come back. (Once the last Undo has left
  // the screen: while it is there, the next Handled joins it.)
  await gone(undo, 12_000);
  const quiet = attention.locator("div.card", { hasText: /Nothing recorded for \d+ days/ }).first();
  const ownButton = quiet.locator("div.divide-y > div", { hasText: /Nothing recorded for \d+ days/ }).getByRole("button", { name: "Handled", exact: true });
  await ((await ownButton.count()) ? ownButton.first() : quiet.getByRole("button", { name: "Handled", exact: true })).click();
  await seen(toast);
  check("C7  handling a pattern says when it comes back", (await textOf(toast)) === "Handled. If it is still true in a week, it comes back. Undo", await textOf(toast));
  await undo.click();
  await gone(undo);

  // Two in a row. When a card goes, the next slides up under the same finger —
  // so one Undo has to bring back both.
  const flags = async () => Number(await attention.locator("h2 + span").innerText());
  const before = await flags();
  await firstCard().getByRole("button", { name: "Handled", exact: true }).first().click();
  await firstCard().getByRole("button", { name: "Handled", exact: true }).first().click();
  const twoGone = await until(async () => (await flags()) === before - 2);
  const twoToast = await textOf(toast);
  await shot(c, "flow-radar-two-handled");
  await undo.click();
  check(
    "C8  a double tap handles two, and one Undo brings both back",
    twoGone && /^2 flags handled\./.test(twoToast) && (await until(async () => (await flags()) === before)),
    `${twoToast} · ${before} flags, now ${await flags()}`
  );
  await settle();
  coach = await db.coachDoc();
  check("C9  and nothing but the pain flag is left handled", handled(coach).length === 1 && /R12/.test(handled(coach)[0]), JSON.stringify(handled(coach)));

  await c.getByRole("button", { name: /Show the rules/ }).click();
  check(
    "C10 the rules panel lists the pain rule, and says what Handled means",
    (await seen(c.getByText("Member flagged that something hurt during a session in the last 4 weeks"))) && (await c.getByText("comes back after a week").isVisible())
  );
  await c.getByRole("button", { name: /Hide rules/ }).click();

  // Typed with no pause after the "/", on purpose: the box must already have
  // focus, or the start of the name goes to the page behind it.
  await c.keyboard.press("/");
  await c.keyboard.type("meera");
  const options = c.locator('#quick-find-list [role="option"]');
  await until(async () => (await options.count()) === 1);
  const found = await options.allInnerTexts();
  check('C11 quick find takes what is typed straight after "/", and finds her by name', found.length === 1 && /Meera Nair/.test(found[0]) && /Here today/.test(found[0]), JSON.stringify(found));
  await c.keyboard.press("Enter");
  await c.waitForURL(/\/coach\/members\/meera-nair/, { timeout: 15_000 });
  const weekLabel = c.locator('p.label:has-text("Her last 7 days")');
  await seen(weekLabel);
  const week = await textOf(weekLabel.locator('xpath=ancestor::div[contains(@class,"card")][1]'));
  check(
    "C12 her page shows the week day by day, with the session and its flag",
    /Yesterday.*Tired.*E 2/.test(week) && week.includes(`${picked} · Target`) && /Session effort 6 ?\/ ?10/.test(week) && week.includes("flagged pain"),
    week.slice(0, 420)
  );
  const sentToCoach = await c.evaluate(async () => (await fetch("/api/state", { cache: "no-store" })).text());
  check("C13 and Deepika does still see her own private note", sentToCoach.includes("PRIVATE-COACH-NOTE"));
  await shot(c, "flow-coach-member", { fullPage: true });

  // She flags pain a second time. The first Handled must not hide it.
  await m.goto(`${base}/member/workout/wk-strength-b`, { waitUntil: "networkidle" });
  const finished = m.getByRole("button", { name: "I have finished" });
  check("C14 opened the ordinary way, the session page is about today", (await seen(finished)) && !(await m.getByText("logging this for").isVisible()));
  const secondSession = await textOf(m.locator("h1"));
  await finished.click();
  await m.getByRole("button", { name: /Something hurt/ }).click();
  await m.getByRole("button", { name: "Save it" }).click();
  check("C15 and logs for today", await seen(m.getByRole("heading", { name: "Logged.", exact: true })));
  await saved((d) => d.workoutLogs.length === 2);

  await c.goto(`${base}/coach`, { waitUntil: "networkidle" });
  await seen(firstCard());
  card = await textOf(firstCard());
  check(
    "C16 a second pain flag is back at the top — and only the new one",
    /Meera/.test(card) && card.includes(`Flagged that something hurt in ${secondSession}, today.`) && !card.includes(`in ${firstSession},`),
    card.slice(0, 220)
  );
  await firstCard().getByRole("link", { name: "Write to her" }).click();
  await c.waitForURL(/draft=something-hurt/, { timeout: 15_000 });
  const drafted = await until(async () => {
    const text = (await c.locator("textarea").evaluateAll((all) => all.map((el) => el.value))).join(" ");
    return text.includes("thank you for flagging that something hurt") && text;
  });
  check('C17 "Write to her" opens her page with the draft in the box, in her name', Boolean(drafted) && drafted.includes("Meera,"), String(drafted).slice(0, 120));

  await c.goto(`${base}/coach/members`, { waitUntil: "networkidle" });
  const row = c.locator('main a[href="/coach/members/meera-nair"]');
  await seen(row);
  const rowText = await textOf(row);
  check("C18 the members list says when she was last here, and that she is new", /Meera N\./.test(rowText) && /Here today/.test(rowText) && /new/i.test(rowText), rowText);
  await c.getByRole("button", { name: /^New this week/ }).click();
  const names = c.locator('main a[href^="/coach/members/"] p.font-medium');
  await until(async () => (await names.count()) === 1);
  const onlyNew = await names.allInnerTexts();
  check('C19 "New this week" shows only her, never the frozen samples', onlyNew.length === 1 && onlyNew[0] === "Meera N.", JSON.stringify(onlyNew));

  // The same Undo on a phone, where it has to clear the bottom bar.
  const p = await openPage(browser, "phone", "coach on a phone", problems);
  await signInAsCoach(p, base, coachPassword);
  const phoneCard = p.locator("main section").first().locator("div.card").first();
  await seen(phoneCard);
  await phoneCard.getByRole("button", { name: "Handled", exact: true }).first().click();
  const phoneUndo = p.getByRole("button", { name: "Undo" });
  await seen(phoneUndo);
  const undoBox = await phoneUndo.boundingBox();
  const barBox = await p.locator('nav[aria-label="Console"]').boundingBox();
  check(
    "C20 on a phone the Undo sits above the bottom bar, on screen",
    Boolean(undoBox && barBox) && undoBox.y > 0 && undoBox.y + undoBox.height <= barBox.y,
    `Undo ends at ${undoBox ? Math.round(undoBox.y + undoBox.height) : "?"}, bar starts at ${barBox ? Math.round(barBox.y) : "?"}`
  );
  await shot(p, "flow-radar-phone-undo");
  await phoneUndo.click();
  await settle();

  // ------------------------------------------- D. the same session, saved twice
  // She opens today's session again and saves it again. That used to add a
  // second record — and a second pain flag on the Radar for one session.
  await m.goto(`${base}/member/workout/wk-strength-b`, { waitUntil: "networkidle" });
  await finished.click();
  const hurt = m.getByRole("button", { name: /Something hurt/ });
  check(
    "D1  opened again, the form starts from what she said — the pain flag still on — and says saving updates it",
    (await seen(m.getByText("You logged this earlier today. Saving again updates it."))) && (await hurt.getAttribute("aria-pressed")) === "true",
    `pain flag pressed: ${await hurt.getAttribute("aria-pressed")}`
  );
  await m.fill("textarea", "right shoulder, sharp");
  await m.getByRole("button", { name: "Save it" }).click();
  await seen(m.getByRole("heading", { name: "Logged.", exact: true }));
  doc = await saved((d) => d.workoutLogs.some((l) => l.feltLike === "right shoulder, sharp"));
  await settle();
  doc = await db.memberDoc(MEERA.username);
  const ofToday = doc.workoutLogs.filter((l) => l.dayOffset === 0 && l.workoutId === "wk-strength-b");
  check(
    "D2  it is still one record of that session today, now with what she added, dated in India (read from the database)",
    doc.workoutLogs.length === 2 && ofToday.length === 1 && ofToday[0].painFlag === true && ofToday[0].provenance?.at === today,
    `${doc.workoutLogs.length} records, ${ofToday.length} of this session today, stamped ${ofToday[0]?.provenance?.at}`
  );

  await c.goto(`${base}/coach`, { waitUntil: "networkidle" });
  await seen(firstCard());
  const hers = (await attention.locator("div.card", { hasText: "Meera" }).allInnerTexts()).join(" ").replace(/\s+/g, " ");
  const painFlags = hers.match(/Flagged that something hurt/g) ?? [];
  check(
    "D3  and Deepika has one pain flag for it, not two, carrying what she wrote",
    painFlags.length === 1 && hers.includes(`Flagged that something hurt in ${secondSession}, today: “right shoulder, sharp”`),
    hers.slice(0, 260)
  );

  // ------------------------------------------ E. a member who is not a woman
  // The console said "her" about everyone. Onboarding asks, and offers Man and
  // Other; the console now uses what the member said, and "they" if nobody asked.
  const a = await openPage(browser, "phone", "a second member", problems);
  await signUpAndOnboard(a, base, ARJUN);
  await db.memberWhen(ARJUN.username, (d) => d.member.gender === "man" && Boolean(d.member.onboardedAt));

  /** Everything written on his page, tab by tab — placeholders and tooltips too. */
  const everyTab = async () => {
    let all = "";
    for (const tab of ["Overview", "Assessment", "Journey builder", "Week planner", "Notes", "Session prep"]) {
      await c.getByRole("button", { name: tab, exact: true }).click();
      all += ` [${tab}] ` + (await textOf(c.locator("main")));
      all += " " + (await c.locator("main [placeholder], main [title]").evaluateAll((els) => els.map((el) => `${el.getAttribute("placeholder") ?? ""} ${el.getAttribute("title") ?? ""}`).join(" ")));
    }
    return all.replace(/\s+/g, " ");
  };
  // Labels are shown in capitals, so the lines are looked for whatever their case.
  const says = (text, lines) => lines.every((line) => text.toLowerCase().includes(line.toLowerCase()));
  // Not a /g pattern: those remember where the last test() stopped.
  const womanly = /\b(she|her|hers|herself)\b/i;
  const whereItSays = (text, words) => (text.match(new RegExp(`.{0,30}\\b(?:${words})\\b.{0,30}`, "gi")) ?? []).slice(0, 4).join(" | ");

  await c.goto(`${base}/coach/members/${ARJUN.username}`, { waitUntil: "networkidle" });
  await seen(c.getByRole("link", { name: /^See his app/ }));
  let his = await everyTab();
  check(
    "E1  a member who said he is a man is he, him and his on his page",
    says(his, ["See his app", "What he is trying to get to", "His last 7 days", "Send him something", "he never sees this", "Reset his password"]),
    his.slice(0, 300)
  );
  check('E2  and nothing on any tab of it still says "she" or "her"', !womanly.test(his), whereItSays(his, "she|her|hers|herself"));

  await c.goto(`${base}/coach`, { waitUntil: "networkidle" });
  await seen(firstCard());
  const hisCard = c.locator("main div.card", { hasText: "Arjun" }).first();
  check(
    "E3  the Radar offers to write to him, and still to her",
    (await seen(hisCard.getByRole("link", { name: "Write to him" }))) && (await c.locator("main div.card", { hasText: "Meera" }).first().getByRole("link", { name: "Write to her" }).isVisible()),
    (await textOf(hisCard)).slice(0, 200)
  );

  // Someone who joined before the question was asked has no answer on record.
  const asked = await db.memberDoc(ARJUN.username);
  delete asked.member.gender;
  await db.setMemberDoc(ARJUN.username, asked);
  await c.goto(`${base}/coach/members/${ARJUN.username}`, { waitUntil: "networkidle" });
  await seen(c.getByRole("link", { name: /^See their app/ }));
  his = await everyTab();
  check(
    "E4  and a member nobody asked is they — never assumed to be a woman",
    says(his, ["See their app", "What they are trying to get to", "Their last 7 days", "Send them something", "they never see this"]) &&
      !womanly.test(his) &&
      !/\b(he|him|his|himself)\b/i.test(his),
    whereItSays(his, "she|her|hers|herself|he|him|his|himself") || his.slice(0, 300)
  );
}
