/**
 * The date and daily-plan logic, tested without a browser.
 *
 * This is the part of the app where a bug does not show on a demo and does show
 * on the second day of real use, so it is the part worth pinning down. Run with
 * `npm run test:logic`.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const cal = require("../.test-build/lib/calendar.js");
const dp = require("../.test-build/lib/dailyPlan.js");
const radar = require("../.test-build/lib/radar.js");
const starter = require("../.test-build/lib/starterPlan.js");
const seed = require("../.test-build/lib/seed.js");
const privacy = require("../.test-build/lib/privacy.js");
const food = require("../.test-build/lib/foodParse.js");
const drafts = require("../.test-build/lib/replyDrafts.js");
const display = require("../.test-build/lib/display.js");
const rem = require("../.test-build/lib/reminders.js");

// ---------------------------------------------------------------- fixtures
const TODAY = "2026-10-06"; // a Tuesday
const member = (over = {}) => ({
  id: "priya-s", name: "Priya S", city: "", initials: "PS", age: 41,
  week: 1, phase: "Stabilise", lifeStage: "", goals: [], constraints: [],
  wontDo: "", medical: [], medications: [], engagement: "steady",
  weeklyFocus: [], activeModuleIds: [], assessmentComplete: 0, ...over,
});
const doc = (m, extra = {}) => ({
  member: m, actions: [], pulses: [], workoutLogs: [], messages: [],
  sessions: [], reports: [], foodEntries: [], ...extra,
});
const action = (over = {}) => ({
  id: "a1", memberId: "priya-s", dayOffset: 0, moduleId: "mv-walk-base",
  title: "Walking Base", why: "", completed: null,
  minimum: { label: "m", minutes: 1 }, target: { label: "t", minutes: 2 }, stretch: { label: "s", minutes: 3 },
  ...over,
});
const onboarded = (over = {}) =>
  member({ onboardedAt: "2026-10-06", anchorDate: TODAY, ...over });

// ------------------------------------------------------------------ calendar
test("dateKey uses India time, flipping at 00:00 IST (18:30 UTC)", () => {
  assert.equal(cal.dateKey(new Date("2026-10-04T18:29:59Z")), "2026-10-04");
  assert.equal(cal.dateKey(new Date("2026-10-04T18:30:00Z")), "2026-10-05");
});

test("hourOf is the hour in India, not the viewer's", () => {
  assert.equal(cal.hourOf(new Date("2026-10-04T18:29:59Z")), 23);
  assert.equal(cal.hourOf(new Date("2026-10-04T18:30:00Z")), 0);
  assert.equal(cal.hourOf(new Date("2026-10-05T03:30:00Z")), 9);
});

test("daysBetween handles month ends, leap years and direction", () => {
  assert.equal(cal.daysBetween("2026-10-04", "2026-10-04"), 0);
  assert.equal(cal.daysBetween("2026-02-27", "2026-03-01"), 2); // 2026 is not a leap year
  assert.equal(cal.daysBetween("2028-02-28", "2028-03-01"), 2); // 2028 is
  assert.equal(cal.daysBetween("2026-12-31", "2027-01-01"), 1);
  assert.equal(cal.daysBetween("2026-10-06", "2026-10-01"), -5);
});

test("addDays, weekdayOf and longDate agree with each other", () => {
  assert.equal(cal.addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(cal.addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(cal.weekdayOf("2026-10-04"), 0); // Sunday
  assert.equal(cal.weekdayOf("2026-10-06"), 2); // Tuesday
  assert.equal(cal.longDate("2026-10-04"), "Sunday, 4 October");
});

test("clockLabel reads like the seeded messages", () => {
  assert.equal(cal.clockLabel(new Date("2026-10-04T13:42:00Z")), "7:12 pm");
  assert.equal(cal.clockLabel(new Date("2026-10-04T01:05:00Z")), "6:35 am");
});

// ------------------------------------------------------------- modulesForDay
test("never more than three actions a day, whatever the plan holds", () => {
  const ids = ["mv-walk-base", "mv-mobility-10", "nu-protein", "nu-plate", "sl-reset", "sl-winddown"];
  for (let i = 0; i < 14; i++) {
    const day = cal.addDays("2026-10-05", i);
    assert.ok(dp.modulesForDay(ids, seed.modules, day).length <= 3, day);
  }
});

test("overflow rotates, so nothing is dropped for ever", () => {
  const ids = ["mv-walk-base", "mv-mobility-10", "nu-protein", "nu-plate", "sl-reset", "sl-winddown"];
  const seen = new Set();
  for (let i = 0; i < 6; i++) {
    dp.modulesForDay(ids, seed.modules, cal.addDays("2026-10-05", i)).forEach((m) => seen.add(m.id));
  }
  assert.deepEqual([...seen].sort(), [...ids].sort());
});

test("strength only on Tuesday and Friday, and never rotated out", () => {
  const ids = ["mv-strength-a", "mv-walk-base", "mv-mobility-10", "nu-protein", "sl-reset"];
  const on = (d) => dp.modulesForDay(ids, seed.modules, d).map((m) => m.id);
  assert.ok(on("2026-10-06").includes("mv-strength-a")); // Tue
  assert.ok(on("2026-10-09").includes("mv-strength-a")); // Fri
  assert.ok(!on("2026-10-07").includes("mv-strength-a")); // Wed
  assert.ok(!on("2026-10-05").includes("mv-strength-a")); // Mon
});

test("behaviour modules are a Wednesday thing; reading modules are never actions", () => {
  assert.deepEqual(dp.modulesForDay(["bh-minimum-day"], seed.modules, "2026-10-06").map((m) => m.id), []);
  assert.deepEqual(dp.modulesForDay(["bh-minimum-day"], seed.modules, "2026-10-07").map((m) => m.id), ["bh-minimum-day"]);
  assert.deepEqual(dp.modulesForDay(["hr-bone-muscle", "hr-perimenopause"], seed.modules, "2026-10-07"), []);
});

test("generated actions have real wording and a workout where there is one", () => {
  const strength = dp.actionFromModule(seed.modules.find((m) => m.id === "mv-strength-a"), "x", TODAY);
  assert.equal(strength.workoutId, "wk-strength-a");
  assert.equal(strength.id, "a-x-2026-10-06-mv-strength-a");
  const sleep = dp.actionFromModule(seed.modules.find((m) => m.id === "sl-reset"), "x", TODAY);
  assert.ok(!/five days/i.test(sleep.target.label), "weekly wording leaked onto a daily screen");
  assert.equal(strength.completed, null);
});

// ------------------------------------------------------------- reconcileToday
test("reconcile keeps anything she has done, whatever the plan says now", () => {
  const m = onboarded({ activeModuleIds: ["nu-protein"] });
  const done = action({ moduleId: "mv-walk-base", completed: "target" });
  const out = dp.reconcileToday([done], m, TODAY, seed.modules);
  assert.ok(out.some((a) => a.id === "a1" && a.completed === "target"));
  assert.ok(out.some((a) => a.moduleId === "nu-protein"));
});

test("reconcile drops untouched actions whose module left the plan", () => {
  const m = onboarded({ activeModuleIds: ["nu-protein"] });
  const out = dp.reconcileToday([action({ moduleId: "mv-walk-base" })], m, TODAY, seed.modules);
  assert.ok(!out.some((a) => a.moduleId === "mv-walk-base"));
});

test("reconcile never overwrites an edit Deepika made to a still-planned action", () => {
  const m = onboarded({ activeModuleIds: ["mv-walk-base"] });
  const edited = action({ target: { label: "Softened by Deepika", minutes: 5 } });
  const out = dp.reconcileToday([edited], m, TODAY, seed.modules);
  assert.equal(out.filter((a) => a.moduleId === "mv-walk-base").length, 1);
  assert.equal(out.find((a) => a.moduleId === "mv-walk-base").target.label, "Softened by Deepika");
});

// -------------------------------------------------------------------- rollDoc
test("the sample cohort is never rolled", () => {
  const d = doc(member({ id: "radhika", anchorDate: "2020-01-01", onboardedAt: "2020-01-01" }));
  assert.equal(dp.rollDoc(d, TODAY, seed.modules), d);
});

test("a brand-new member is anchored to today, with no plan yet", () => {
  const out = dp.rollDoc(doc(member()), TODAY, seed.modules);
  assert.equal(out.member.anchorDate, TODAY);
  assert.equal(out.actions.length, 0);
});

test("history shifts by the days that passed, and completions survive", () => {
  const m = onboarded({
    anchorDate: "2026-10-03", onboardedAt: "2026-10-01",
    weekPlans: starter.starterWeekPlans(), activeModuleIds: ["mv-walk-base"],
  });
  const d = doc(m, {
    actions: [action({ id: "old", dayOffset: 0, completed: "minimum" })],
    pulses: [{ id: "p", memberId: "priya-s", dayOffset: 0, energy: 3, sleep: 3, stress: 3, symptoms: [] }],
    messages: [{ id: "m", memberId: "priya-s", from: "member", kind: "text", body: "hi", dayOffset: 0, time: "7:12 pm", read: true }],
    sessions: [{ id: "s", memberId: "priya-s", dayOffset: 2, status: "scheduled" }],
  });
  const out = dp.rollDoc(d, TODAY, seed.modules); // three days later
  assert.equal(out.member.anchorDate, TODAY);
  assert.equal(out.actions.find((a) => a.id === "old").dayOffset, -3);
  assert.equal(out.actions.find((a) => a.id === "old").completed, "minimum");
  assert.equal(out.pulses[0].dayOffset, -3);
  assert.equal(out.messages[0].dayOffset, -3);
  assert.equal(out.sessions[0].dayOffset, -1); // was in two days; now one day ago
});

test("a new day gets a fresh set of actions, built from today's date", () => {
  const m = onboarded({ anchorDate: "2026-10-05", onboardedAt: "2026-10-01",
    weekPlans: starter.starterWeekPlans(), activeModuleIds: ["mv-walk-base", "sl-reset"] });
  const out = dp.rollDoc(doc(m), TODAY, seed.modules);
  const todays = out.actions.filter((a) => a.dayOffset === 0);
  assert.ok(todays.length >= 1 && todays.length <= 3);
  assert.ok(todays.every((a) => a.id.includes(TODAY)));
});

test("rolling twice in one day changes nothing (same object back)", () => {
  const m = onboarded({ anchorDate: "2026-10-05", onboardedAt: "2026-10-01",
    weekPlans: starter.starterWeekPlans(), activeModuleIds: ["mv-walk-base", "sl-reset"] });
  const once = dp.rollDoc(doc(m), TODAY, seed.modules);
  assert.equal(dp.rollDoc(once, TODAY, seed.modules), once);
});

test("someone who onboarded before the plan existed is rescued onto it", () => {
  const m = member({ onboardedAt: "2026-10-04" }); // no anchor, no plan, no modules
  const out = dp.rollDoc(doc(m), TODAY, seed.modules);
  assert.equal(out.member.weekPlans.length, 12);
  assert.ok(out.member.activeModuleIds.length > 0);
  assert.ok(out.actions.some((a) => a.dayOffset === 0));
});

test("the week advances with the calendar, and takes its modules with it", () => {
  const m = onboarded({ onboardedAt: "2026-09-21", anchorDate: TODAY, // 15 days in
    weekPlans: starter.starterWeekPlans(), activeModuleIds: ["mv-walk-base", "sl-reset", "bh-minimum-day"], week: 1 });
  const out = dp.rollDoc(doc(m), TODAY, seed.modules);
  assert.equal(out.member.week, 3);
  assert.equal(out.member.phase, "Stabilise");
  assert.ok(out.member.activeModuleIds.includes("nu-protein"), "week 3 adds protein");
});

test("the programme stops at week 12", () => {
  const m = onboarded({ onboardedAt: "2025-01-01", anchorDate: TODAY, weekPlans: starter.starterWeekPlans(), week: 12 });
  assert.equal(dp.rollDoc(doc(m), TODAY, seed.modules).member.week, 12);
});

test("a day someone has already shaped is left alone", () => {
  const m = onboarded({ weekPlans: starter.starterWeekPlans(), activeModuleIds: ["mv-walk-base", "sl-reset"] });
  const shaped = action({ id: "coach-made", moduleId: "mv-mobility-10" });
  const out = dp.rollDoc(doc(m, { actions: [shaped] }), TODAY, seed.modules);
  assert.equal(out.actions.filter((a) => a.dayOffset === 0).length, 1);
});

test("the starter plan is a private copy per member", () => {
  const a = starter.starterWeekPlans();
  a[0].moduleIds.push("tampered");
  assert.ok(!starter.starterWeekPlans()[0].moduleIds.includes("tampered"));
  assert.equal(starter.starterWeekPlans().length, 12);
});

// ----------------------------------------------------------------- engagement
test("engagement reflects what she has actually done", () => {
  const base = { onboardedAt: "2026-09-20", anchorDate: TODAY };
  const joinedToday = member({ onboardedAt: TODAY, anchorDate: TODAY });
  assert.equal(dp.engagementFor(joinedToday, [], [], []), "steady");
  assert.equal(dp.engagementFor(member(base), [], [], []), "quiet");

  const days = [-1, -2, -3, -4, -5];
  const good = days.map((o) => action({ id: "g" + o, dayOffset: o, completed: "minimum" }));
  assert.equal(dp.engagementFor(member(base), good, [], []), "strong");

  const poor = days.map((o) => action({ id: "p" + o, dayOffset: o, completed: o === -1 ? "minimum" : null }));
  assert.equal(dp.engagementFor(member(base), poor, [], []), "slipping");

  assert.equal(dp.engagementFor(member({ id: "radhika", engagement: "slipping" }), [], [], []), "slipping");
});

// ----------------------------------------------------------------------- radar
const evalRadar = (members, actions = [], messages = []) =>
  radar.evaluateRadar(members, actions, [], messages, [], radar.radarRules, []);

test("a member who joined this morning is welcomed, not flagged as silent", () => {
  const m = onboarded({ onboardedAt: TODAY, anchorDate: TODAY });
  const ids = evalRadar([m]).map((e) => e.ruleId);
  assert.ok(ids.includes("R11"));
  assert.ok(!ids.includes("R01"));
});

test("after a few quiet days she is flagged, and the welcome has passed", () => {
  const m = onboarded({ onboardedAt: "2026-10-01", anchorDate: TODAY });
  const ids = evalRadar([m]).map((e) => e.ruleId);
  assert.ok(ids.includes("R01"));
  assert.ok(!ids.includes("R11"));
});

test("once Deepika has written to her, the welcome prompt goes away", () => {
  const m = onboarded({ onboardedAt: TODAY, anchorDate: TODAY });
  const hello = { id: "m", memberId: m.id, from: "coach", kind: "text", body: "Welcome", dayOffset: 0, time: "9:00 am", read: false };
  assert.ok(!evalRadar([m], [], [hello]).some((e) => e.ruleId === "R11"));
});

test("the sample cohort still fills all four Radar buckets", () => {
  const events = radar.evaluateRadar(
    seed.members, seed.dailyActions, seed.pulses, seed.messages, seed.sessions, radar.radarRules, []
  );
  for (const b of ["attention", "prepare", "celebrate", "admin"]) {
    assert.ok(events.some((e) => e.bucket === b), `bucket ${b} is empty`);
  }
  assert.ok(!events.some((e) => e.ruleId === "R11"), "sample members must never look newly joined");
});

test("rules added in a release reach a stored copy, keeping her switches", () => {
  const stored = radar.radarRules.filter((r) => r.id !== "R11").map((r) => (r.id === "R03" ? { ...r, enabled: false } : r));
  const merged = radar.withShippedRules(stored);
  assert.ok(merged.some((r) => r.id === "R11"));
  assert.equal(merged.find((r) => r.id === "R03").enabled, false);
  assert.equal(merged.find((r) => r.id === "R01").enabled, true);
});

// -------------------------------------------------------------------- privacy
const withCoachPrivate = () => doc(
  member({ notes: [{ id: "n1", at: "2026-10-01", text: "Candid observation" }], draftWeekPlans: [{ week: 1 }] }),
  { sessions: [{ id: "s1", memberId: "priya-s", dayOffset: 1, status: "scheduled", privateNotes: "Private", memberRecap: "For her" }] }
);

test("a member is never sent Deepika's private notes or plan drafts", () => {
  const out = privacy.forMember(withCoachPrivate());
  assert.equal(out.member.notes, undefined);
  assert.equal(out.member.draftWeekPlans, undefined);
  assert.equal(out.sessions[0].privateNotes, undefined);
  assert.equal(out.sessions[0].memberRecap, "For her", "the recap is meant for her");
  assert.ok(!JSON.stringify(out).includes("Candid observation"));
  assert.ok(!JSON.stringify(out).includes("Private"));
});

test("saving as a member never deletes the coach's private notes", () => {
  const stored = withCoachPrivate();
  const fromBrowser = privacy.forMember(stored); // what her browser held, and sends back
  const kept = privacy.acceptFromMember(fromBrowser, stored);
  assert.equal(kept.member.notes[0].text, "Candid observation");
  assert.equal(kept.sessions[0].privateNotes, "Private");
  assert.equal(kept.member.draftWeekPlans.length, 1);
});

test("a member cannot write coach-private fields by sending them", () => {
  const stored = withCoachPrivate();
  const forged = withCoachPrivate();
  forged.member.notes = [{ id: "x", at: "2026-10-02", text: "Forged" }];
  forged.sessions[0].privateNotes = "Forged";
  const kept = privacy.acceptFromMember(forged, stored);
  assert.equal(kept.member.notes[0].text, "Candid observation");
  assert.equal(kept.sessions[0].privateNotes, "Private");
  // and with nothing stored, nothing gets in
  const fresh = privacy.acceptFromMember(forged, null);
  assert.equal(fresh.member.notes, undefined);
  assert.equal(fresh.sessions[0].privateNotes, undefined);
});

// --------------------------------------------------------- typed food logging
const FOODS = seed.foodItems;
const parse = (text) => food.parseMeal(text, FOODS);
/** "Roti / chapati" → { id, qty } pairs, in the order they were understood. */
const got = (text) => parse(text).items.map((p) => [p.item.id, p.qty]);

test("a meal typed the way it is said becomes entries", () => {
  assert.deepEqual(got("two rotis, dal and a bowl of curd"), [
    ["f-roti", 2], ["f-dal", 1], ["f-curd", 1],
  ]);
  const r = parse("two rotis, dal and a bowl of curd");
  assert.equal(r.items[0].protein, 6, "protein follows the list's figure per roti");
  assert.deepEqual(r.unknown, []);
  assert.deepEqual(got("2rotis+dal"), [["f-roti", 2], ["f-dal", 1]]);
});

test("Hinglish amounts and names", () => {
  assert.deepEqual(got("do roti aur aadha katori dal"), [["f-roti", 2], ["f-dal", 0.5]]);
  assert.deepEqual(got("ek glass doodh"), [["f-milk", 1]]);
  assert.deepEqual(got("dedh phulka"), [["f-roti", 1.5]]);
  assert.deepEqual(got("rajma chawal"), [["f-rajma", 1], ["f-rice", 1]]);
});

test("the most specific name wins", () => {
  const r = parse("palak paneer with 2 chapatis");
  assert.deepEqual(r.items.map((p) => [p.item.id, p.qty]), [["f-paneer", 1], ["f-roti", 2]]);
  assert.equal(r.items[0].heard, "palak paneer", "she can see why it is paneer");
  assert.deepEqual(got("aloo paratha"), [["f-paratha", 1]]);
  assert.deepEqual(got("chana dal"), [["f-dal", 1]]);
  assert.deepEqual(got("2 egg omelette"), [["f-egg", 2]]);
});

test("grams, millilitres and counted units convert to the list's portions", () => {
  assert.deepEqual(got("paneer 100g"), [["f-paneer", 2]]);
  assert.deepEqual(got("100 gm paneer"), [["f-paneer", 2]]);
  assert.deepEqual(got("4 cubes of paneer"), [["f-paneer", 1]]);
  assert.deepEqual(got("200g chicken"), [["f-chicken", 2]]);
  assert.deepEqual(got("200 ml milk"), [["f-milk", 1]]);
  assert.deepEqual(got("half litre milk"), [["f-milk", 2.5]]);
  assert.deepEqual(got("20 almonds"), [["f-almonds", 2]]);
  assert.deepEqual(got("20 badam"), [["f-almonds", 2]], "the count is of almonds whatever she calls them");
  assert.deepEqual(got("a handful of almonds"), [["f-almonds", 1]]);
});

test("fractions, ranges and multipliers", () => {
  assert.deepEqual(got("1½ roti"), [["f-roti", 1.5]]);
  assert.deepEqual(got("1 1/2 roti"), [["f-roti", 1.5]]);
  assert.deepEqual(got("one and a half rotis"), [["f-roti", 1.5]]);
  assert.deepEqual(got("½ bowl rajma"), [["f-rajma", 0.5]]);
  assert.deepEqual(got("half a bowl of rajma"), [["f-rajma", 0.5]]);
  assert.deepEqual(got("2-3 rotis"), [["f-roti", 2.5]]);
  assert.deepEqual(got("roti x2"), [["f-roti", 2]]);
  assert.deepEqual(got("a couple of eggs"), [["f-egg", 2]]);
  assert.deepEqual(got("500 rotis"), [["f-roti", 20]], "absurd amounts are capped, not saved");
});

test("an amount after the dish is that dish's, and the same dish adds up", () => {
  assert.deepEqual(got("rotis 2, dal"), [["f-roti", 2], ["f-dal", 1]]);
  assert.deepEqual(got("roti, dal, 2 more rotis"), [["f-roti", 3], ["f-dal", 1]]);
  assert.deepEqual(got("roti, roti 2"), [["f-roti", 3]]);
});

test("what it does not know is handed back, never guessed", () => {
  const r = parse("2 samosas and chai");
  assert.deepEqual(r.items.map((p) => p.item.id), ["f-chai"]);
  assert.deepEqual(r.unknown, [{ name: "samosas", qty: 2 }]);

  const after = parse("dal 2 samosas");
  assert.deepEqual(after.items.map((p) => [p.item.id, p.qty]), [["f-dal", 1]], "the 2 is the samosas'");
  assert.deepEqual(after.unknown, [{ name: "samosas", qty: 2 }]);

  assert.deepEqual(parse("pizza").items, []);
  assert.deepEqual(parse("pizza").unknown, [{ name: "pizza", qty: 1 }]);
  assert.deepEqual(parse("veg sandwich").unknown, [{ name: "veg sandwich", qty: 1 }]);
  assert.deepEqual(parse("I had 2 ragi rotis").unknown, [], "how it was made is not another food");
  assert.deepEqual(got("I had 2 ragi rotis"), [["f-roti", 2]]);
  assert.deepEqual(parse(""), { items: [], unknown: [], skipped: [], meal: null });
});

test("no-protein extras are recognised and left out", () => {
  const r = parse("2 rotis with ghee and pickle");
  assert.deepEqual(r.items.map((p) => [p.item.id, p.qty]), [["f-roti", 2]]);
  assert.deepEqual(r.skipped, ["ghee", "pickle"]);
  assert.deepEqual(r.unknown, []);
  assert.deepEqual(parse("black coffee").items, []);
  assert.deepEqual(parse("black coffee").skipped, ["black coffee"]);
  assert.deepEqual(got("chai with milk"), [["f-chai", 1]], "tea with milk is not also a glass of milk");
  assert.deepEqual(got("butter chicken"), [["f-chicken", 1]]);
});

test("the meal is read from the text when it names exactly one", () => {
  const r = parse("for lunch: dal chawal");
  assert.equal(r.meal, "Lunch");
  assert.deepEqual(r.items.map((p) => p.item.id), ["f-dal", "f-rice"]);
  assert.equal(parse("breakfast and lunch: poha").meal, null);
  const tea = parse("tea time makhana");
  assert.equal(tea.meal, "Snack");
  assert.deepEqual(tea.items.map((p) => p.item.id), ["f-makhana"], "tea time is not a cup of tea");
  assert.equal(food.mealForHour(10), "Breakfast");
  assert.equal(food.mealForHour(11), "Lunch");
  assert.equal(food.mealForHour(16), "Snack");
  assert.equal(food.mealForHour(19), "Dinner");
});

test("quantities read and step the way a portion does", () => {
  assert.equal(food.formatQty(0.5), "½");
  assert.equal(food.formatQty(1), "1");
  assert.equal(food.formatQty(2.5), "2½");
  assert.deepEqual([0.5, 1, 1.5, 2.5, 20].map((q) => food.stepQty(q, 1)), [1, 2, 2, 3, 20]);
  assert.deepEqual([0.5, 1, 1.5, 2, 2.5].map((q) => food.stepQty(q, -1)), [0.5, 0.5, 1, 1, 2]);
});

test("every name points at one dish on the list", () => {
  const ids = new Set(FOODS.map((f) => f.id));
  const owner = new Map();
  for (const [id, names] of Object.entries(food.SYNONYMS)) {
    assert.ok(ids.has(id), `${id} is not on the food list`);
    for (const n of names) {
      assert.ok(!owner.has(n) || owner.get(n) === id, `"${n}" is under ${owner.get(n)} and ${id}`);
      owner.set(n, id);
    }
  }
  for (const n of food.NO_PROTEIN) assert.ok(!owner.has(n), `"${n}" is both a dish and a no-protein extra`);
});

// ------------------------------------------------------------- welcome back
const touch = {
  action: (dayOffset, completed = "minimum") => action({ id: `a${dayOffset}${completed}`, dayOffset, completed }),
  pulse: (dayOffset) => ({ id: `p${dayOffset}`, memberId: "priya-s", dayOffset, energy: 3, sleep: 3, stress: 3, symptoms: [], provenance: { source: "member_manual", enteredBy: "Priya", at: TODAY } }),
  message: (dayOffset, from = "member") => ({ id: `m${dayOffset}${from}`, memberId: "priya-s", from, kind: "text", body: "", dayOffset, time: "", read: true }),
  food: (dayOffset, source = "member_manual") => ({ id: `f${dayOffset}${source}`, memberId: "priya-s", dayOffset, name: "Dal", qty: 1, unitLabel: "bowl", protein: 5, meal: "Lunch", provenance: { source, enteredBy: "x", at: TODAY } }),
};
const back = ({ actions = [], pulses = [], messages = [], food = [] } = {}) =>
  dp.isWelcomeBack("priya-s", actions, pulses, messages, food);

test("welcome back after two quiet days, from any sign of her", () => {
  assert.equal(back({ actions: [touch.action(-3)] }), true);
  assert.equal(back({ pulses: [touch.pulse(-4)] }), true);
  assert.equal(back({ messages: [touch.message(-6)] }), true);
  assert.equal(back({ food: [touch.food(-3)] }), true);
});

test("not welcome back when she was here in the last two days", () => {
  assert.equal(back({ actions: [touch.action(-5), touch.action(-2)] }), false);
  assert.equal(back({ actions: [touch.action(-5)], pulses: [touch.pulse(-1)] }), false);
  assert.equal(back({ actions: [touch.action(-5), touch.action(-1, "rest")] }), false, "a 'not today' is being here");
  assert.equal(back({ actions: [touch.action(-5)], food: [touch.food(-1)] }), false);
});

test("not welcome back for someone who has never started", () => {
  assert.equal(back(), false);
  assert.equal(back({ actions: [touch.action(-4, null)] }), false, "a planned action is not a sign of her");
  assert.equal(back({ messages: [touch.message(-5, "coach")] }), false, "Deepika writing is not her");
  assert.equal(back({ food: [touch.food(-5, "coach_on_behalf")] }), false);
});

test("welcome back holds all day, once she starts", () => {
  assert.equal(back({ actions: [touch.action(-4), touch.action(0)], pulses: [touch.pulse(0)] }), true);
});

test("the sample cohort's Priya is the returning member the seed says she is", () => {
  assert.equal(
    dp.isWelcomeBack("priya", seed.dailyActions, seed.pulses, seed.messages, seed.foodEntries),
    true
  );
  assert.equal(
    dp.isWelcomeBack("radhika", seed.dailyActions, seed.pulses, seed.messages, seed.foodEntries),
    false
  );
});

// ------------------------------------------------------- Deepika's console
test("drafts answering her open Radar flags come first", () => {
  const order = drafts.draftsFor(["R08"]).map((d) => [d.draft.id, d.suggested]);
  assert.deepEqual(order[0], ["welcome-back", true]);
  assert.equal(order.filter(([, s]) => s).length, 1);
  assert.equal(drafts.draftForRules(["R06"]), null, "an unanswered message needs a real reply, not a draft");
  assert.equal(drafts.draftForRules(["R06", "R01"]).id, "check-in");
  assert.equal(drafts.draftsFor([]).length, drafts.REPLY_DRAFTS.length, "every draft is always on offer");
});

test("every draft is addressed to her and keeps to the app's rules", () => {
  for (const d of drafts.REPLY_DRAFTS) {
    const text = d.text("Meera");
    assert.ok(text.includes("Meera"), `${d.id} does not use her name`);
    assert.ok(!/\d+\s*days?/i.test(text), `${d.id} mentions a number of days`);
    assert.ok(!/\b(missed|behind|failed|streak|should have)\b/i.test(text), `${d.id} has guilt copy`);
  }
});

test("names in the console: short, searchable, and initials behind the privacy screen", () => {
  const meera = member({ id: "mn84", name: "Meera Nair", initials: "MN" });
  assert.equal(display.shortName(meera), "Meera N.");
  assert.equal(display.shortName(member({ name: "Radhika" })), "Radhika");
  assert.equal(display.shortName(member({ id: "x9", name: "  " })), "X9");
  assert.equal(display.initialsOf(meera), "MN");
  assert.equal(display.initialsOf(member({ name: "Anita Rao", initials: "" })), "AR");
  assert.ok(display.matchesMember(meera, "meera"));
  assert.ok(display.matchesMember(meera, "nair"));
  assert.ok(display.matchesMember(meera, "MN84"), "the username still finds her");
  assert.ok(!display.matchesMember(meera, "anita"));
});

// ---------------------------------------------------------------- reminders
/** A member last rolled forward on `anchor`, with records relative to it. */
const remDoc = ({ anchor = TODAY, onboardedAt = "2026-09-01", pulses = [], actions = [], food = [] } = {}) =>
  doc(onboarded({ anchorDate: anchor, onboardedAt }), {
    pulses: pulses.map((d) => touch.pulse(d)),
    actions: actions.map((d) => touch.action(d)),
    foodEntries: food.map(([d, src]) => touch.food(d, src)),
  });
const decide = (d, lastSentOn = null, slot = "evening") => rem.decideReminder(slot, d, lastSentOn, TODAY);

test("a reminder goes out when she has not checked in today", () => {
  const r = decide(remDoc({ pulses: [-1] }));
  assert.equal(r.send, true);
  assert.equal(r.title, "Bharosa");
  assert.match(r.body, /check-in/);
  assert.match(decide(remDoc({ pulses: [-1] }), null, "morning").body, /Good morning/);
});

test("never twice a day, and never once she has shown up", () => {
  assert.deepEqual(decide(remDoc({ pulses: [-1] }), TODAY), { send: false, reason: "already sent today" });
  assert.equal(decide(remDoc({ pulses: [0] })).reason, "already here today");
  assert.equal(decide(remDoc({ actions: [0] })).reason, "already here today");
  assert.equal(decide(remDoc({ food: [[0, "member_manual"]] })).reason, "already here today");
  assert.equal(decide(remDoc({ pulses: [-1], food: [[0, "coach_on_behalf"]] })).send, true, "Deepika logging for her is not her");
});

test("records from a document not yet rolled forward are read in today's frame", () => {
  // Last opened three days ago, when she checked in "today": that is three days ago now.
  const stale = remDoc({ anchor: "2026-10-03", pulses: [0] });
  assert.deepEqual(rem.quietness(stale, TODAY), { quietDays: 3, hereToday: false });
  assert.equal(decide(stale).send, true);
});

test("the quieter she goes, the fewer reminders — and after a month, none", () => {
  const quiet = (days) => remDoc({ pulses: [-days] });
  assert.equal(decide(quiet(4), "2026-10-05").reason, "quiet: every other day at most");
  assert.equal(decide(quiet(4), "2026-10-04").send, true);
  assert.match(decide(quiet(4), "2026-10-04").body, /No catching up/, "after a gap, the wording changes");
  assert.equal(decide(quiet(12), "2026-10-01").reason, "quiet: weekly at most");
  assert.equal(decide(quiet(12), "2026-09-29").send, true);
  assert.equal(decide(quiet(30)).send, false);
  assert.equal(decide(quiet(30)).reason, "quiet for a month — Deepika's call, not the app's");
});

test("someone who has never logged anything is quiet since she joined", () => {
  assert.equal(decide(remDoc({ onboardedAt: TODAY })).send, true);
  assert.equal(decide(remDoc({ onboardedAt: "2026-08-01" })).send, false);
  assert.equal(decide(null).reason, "no record yet");
});

test("no reminder text carries anything about her health", () => {
  for (const d of [remDoc({ pulses: [-1] }), remDoc({ pulses: [-5] })]) {
    for (const slot of rem.SLOTS) {
      const r = rem.decideReminder(slot, d, null, TODAY);
      assert.ok(!/sleep|energy|symptom|protein|weight|pain|period|mood|\d/i.test(r.body), r.body);
    }
  }
});

test("reminders only go out at sensible hours in India", () => {
  assert.ok(rem.inSlotWindow("morning", 7));
  assert.ok(!rem.inSlotWindow("morning", 5));
  assert.ok(!rem.inSlotWindow("morning", 11));
  assert.ok(rem.inSlotWindow("evening", 19));
  assert.ok(!rem.inSlotWindow("evening", 22));
});

test("a subscription can only point at a real push service", () => {
  assert.ok(rem.isPushEndpoint("https://fcm.googleapis.com/fcm/send/abc"));
  assert.ok(rem.isPushEndpoint("https://web.push.apple.com/QGx"));
  assert.ok(rem.isPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/x"));
  assert.ok(rem.isPushEndpoint("https://wns2-par02p.notify.windows.com/w/?token=x"));
  assert.ok(!rem.isPushEndpoint("http://fcm.googleapis.com/fcm/send/abc"), "https only");
  assert.ok(!rem.isPushEndpoint("https://fcm.googleapis.com:8443/x"), "no other ports");
  assert.ok(!rem.isPushEndpoint("https://169.254.169.254/latest/meta-data"));
  assert.ok(!rem.isPushEndpoint("https://fcm.googleapis.com.evil.example/x"));
  assert.ok(!rem.isPushEndpoint("https://evil.example/?u=https://fcm.googleapis.com"));
  assert.ok(rem.isPushKey("B".repeat(87), 80, 100));
  assert.ok(!rem.isPushKey("B".repeat(87) + "<", 80, 100));
});

test("a run decides once per member, sends to each device, and forgets dead ones", async () => {
  const sent = [];
  const dropped = [];
  const marked = [];
  const docs = {
    meera: remDoc({ pulses: [-1] }),
    asha: remDoc({ pulses: [0] }), // already here today
  };
  const devices = [
    { endpoint: "https://fcm.googleapis.com/a", userId: "meera", p256dh: "k", auth: "a", lastSentOn: null },
    { endpoint: "https://fcm.googleapis.com/b", userId: "meera", p256dh: "k", auth: "a", lastSentOn: null },
    { endpoint: "https://fcm.googleapis.com/c", userId: "asha", p256dh: "k", auth: "a", lastSentOn: null },
  ];
  const deps = {
    devices: async () => devices,
    readDoc: async (id) => docs[id] ?? null,
    markSent: async (id, day) => marked.push([id, day]),
    drop: async (e) => dropped.push(e),
    send: async (d, msg) => {
      sent.push([d.endpoint, msg.body]);
      return d.endpoint.endsWith("/b") ? "gone" : "sent";
    },
  };
  const summary = await rem.runReminders("evening", TODAY, 19, deps);
  assert.deepEqual(summary, {
    slot: "evening", inWindow: true, members: 2, sent: 1,
    skipped: { "already here today": 1 }, gone: 1, failed: 0,
  });
  assert.deepEqual(sent.map(([e]) => e), ["https://fcm.googleapis.com/a", "https://fcm.googleapis.com/b"]);
  assert.deepEqual(dropped, ["https://fcm.googleapis.com/b"]);
  assert.deepEqual(marked, [["meera", TODAY]]);
  assert.ok(!JSON.stringify(summary).includes("meera"), "the summary never names anyone");

  const outside = await rem.runReminders("evening", TODAY, 3, deps);
  assert.equal(outside.inWindow, false);
  assert.equal(outside.members, 0, "outside the window nothing is even read");
});
