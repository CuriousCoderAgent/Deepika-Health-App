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
import { readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createServer } from "node:http";

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
const dv = require("../.test-build/lib/dayView.js");
const wl = require("../.test-build/lib/workoutLog.js");
const google = require("../.test-build/lib/google.js");
const auth = require("../.test-build/lib/auth.js");

// ---------------------------------------------------------------- fixtures
/** Every source file under a folder, as [path, text]. */
const sources = (dir) =>
  readdirSync(new URL(`../${dir}`, import.meta.url), { recursive: true, withFileTypes: true })
    .filter((f) => f.isFile() && /\.tsx?$/.test(f.name))
    .map((f) => {
      const file = `${f.parentPath ?? f.path}/${f.name}`;
      return [file, readFileSync(file, "utf8")];
    });

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
    seed.members, seed.dailyActions, seed.pulses, seed.messages, seed.sessions, radar.radarRules, [],
    seed.workoutLogs, seed.workouts, TODAY
  );
  for (const b of ["attention", "prepare", "celebrate", "admin"]) {
    assert.ok(events.some((e) => e.bucket === b), `bucket ${b} is empty`);
  }
  assert.ok(!events.some((e) => e.ruleId === "R11"), "sample members must never look newly joined");
  assert.ok(!events.some((e) => e.ruleId === "R12"), "nobody in the sample cohort has flagged pain");
  assert.equal(new Set(events.map((e) => e.id)).size, events.length, "every flag has its own id");
});

// ------------------------------------------------- a pain flag reaches Deepika
const WORKOUTS = [{ id: "wk-a", name: "Strength A" }];
const hurtLog = (over = {}) => ({
  id: "wl-1", memberId: "priya-s", workoutId: "wk-a", dayOffset: 0,
  completedLevel: "minimum", rpe: 7, painFlag: true, ...over,
});
const radarWith = ({ members, actions = [], pulses = [], messages = [], sessions = [], handled = [], logs = [], today = TODAY }) =>
  radar.evaluateRadar(members, actions, pulses, messages, sessions, radar.radarRules, handled, logs, WORKOUTS, today);

test("a pain flag is on the Radar the moment she saves it, above everything else", () => {
  // The session page tells her Deepika will see it first and to wait for a
  // reply. Until this rule existed, nothing told Deepika.
  const quiet = onboarded({ id: "anita-k", onboardedAt: "2026-09-20" }); // silent: fires R01
  const hurt = onboarded({ id: "priya-s", onboardedAt: "2026-09-20" });
  const events = radarWith({
    members: [quiet, hurt],
    pulses: [{ id: "p", memberId: "priya-s", dayOffset: 0, energy: 3, sleep: 3, stress: 3, symptoms: [] }],
    logs: [hurtLog({ feltLike: "left knee on the way down" })],
  });
  assert.equal(events[0].ruleId, "R12", "the pain flag is first, ahead of a member listed before her");
  assert.equal(events[0].memberId, "priya-s");
  assert.equal(events[0].bucket, "attention");
  assert.equal(events[0].detail, "Flagged that something hurt in Strength A, today: “left knee on the way down”");
  // Not everyone Deepika coaches is a woman; the rule's own wording names no one.
  assert.ok(!/\b(she|her)\b/i.test(events[0].trigger + events[0].suggestedAction + events[0].detail));
  assert.ok(events.some((e) => e.ruleId === "R01" && e.memberId === "anita-k"), "and the rest still follow");
});

test("a session without a pain flag raises nothing", () => {
  const m = onboarded();
  const events = radarWith({ members: [m], logs: [hurtLog({ painFlag: false })] });
  assert.ok(!events.some((e) => e.ruleId === "R12"));
});

test("a pain flag stays for four weeks unless she handles it, and never ages off in one", () => {
  const m = onboarded({ onboardedAt: "2026-08-01" });
  const at = (dayOffset) => radarWith({ members: [m], logs: [hurtLog({ dayOffset })] }).filter((e) => e.ruleId === "R12");
  assert.equal(at(-1)[0].detail, "Flagged that something hurt in Strength A, yesterday.");
  assert.equal(at(-10).length, 1, "still there after the week the other rules look at");
  assert.equal(at(-28).length, 1);
  assert.equal(at(-29).length, 0);
});

test("handling one pain flag never hides the next one", () => {
  const m = onboarded({ onboardedAt: "2026-08-01" });
  const first = hurtLog({ id: "wl-1", dayOffset: -6 });
  const handled = radar.markHandled([], radarWith({ members: [m], logs: [first] })[0].id, "2026-09-30");
  // a fortnight later it is still handled — one particular flag stays handled for good
  const later = radarWith({ members: [m], logs: [hurtLog({ id: "wl-1", dayOffset: -20 })], handled, today: "2026-10-14" });
  assert.equal(later.find((e) => e.ruleId === "R12").resolved, true);
  // and a second flag is a new thing on the page
  const again = radarWith({ members: [m], logs: [first, hurtLog({ id: "wl-2", dayOffset: 0 })], handled });
  const pain = again.filter((e) => e.ruleId === "R12");
  assert.deepEqual(pain.map((e) => e.resolved), [false, true], "newest first; only the old one is handled");
});

// ------------------------------------------------------------ what "Handled" means
test("handled hides one session or one message, not every later one", () => {
  // This is the bug it replaces: ids were `member-rule` and kept for ever, so
  // one Handled on "session tomorrow" hid every session she ever had after it.
  const m = onboarded({ onboardedAt: "2026-08-01" });
  const pulse = { id: "p", memberId: m.id, dayOffset: 0, energy: 3, sleep: 3, stress: 3, symptoms: [] };
  const session = (id) => ({ id, memberId: m.id, dayOffset: 1, status: "scheduled", type: "1:1 coaching", time: "6:00 pm" });
  const msg = (id, dayOffset) => ({ id, memberId: m.id, from: "member", kind: "text", body: "?", dayOffset, time: "9:00 am", read: false });

  const first = radarWith({ members: [m], pulses: [pulse], sessions: [session("s-1")], messages: [msg("m-1", 0)] });
  let handled = [];
  for (const e of first.filter((e) => e.ruleId === "R07" || e.ruleId === "R06")) handled = radar.markHandled(handled, e.id, TODAY);
  const same = radarWith({ members: [m], pulses: [pulse], sessions: [session("s-1")], messages: [msg("m-1", 0)], handled });
  assert.ok(same.filter((e) => e.ruleId === "R07" || e.ruleId === "R06").every((e) => e.resolved));

  // next week: another session, and she has written again
  const next = radarWith({
    members: [m], pulses: [pulse], sessions: [session("s-2")], messages: [msg("m-1", -7), msg("m-2", 0)],
    handled, today: cal.addDays(TODAY, 7),
  });
  assert.equal(next.find((e) => e.ruleId === "R07").resolved, false, "a new session is a new flag");
  assert.equal(next.find((e) => e.ruleId === "R06").resolved, false, "a new message is a new flag");
});

test("handling a pattern hides it for a week, then it comes back if still true", () => {
  const m = onboarded({ id: "anita-k", onboardedAt: "2026-09-01" }); // nothing recorded: R01
  const id = radarWith({ members: [m] }).find((e) => e.ruleId === "R01").id;
  const handled = radar.markHandled([], id, TODAY);
  const on = (n) => radarWith({ members: [m], handled, today: cal.addDays(TODAY, n) }).find((e) => e.ruleId === "R01");
  assert.equal(on(0).resolved, true);
  assert.equal(on(radar.HANDLED_DAYS - 1).resolved, true);
  assert.equal(on(radar.HANDLED_DAYS).resolved, false, "still silent a week on: Deepika is told again");
  assert.equal(on(0).pattern, true, "and the page can say so when she handles it");
});

test("a Handled from before it had a date no longer hides anything", () => {
  const m = onboarded({ id: "anita-k", onboardedAt: "2026-09-01" });
  const e = radarWith({ members: [m], handled: ["anita-k-R01", "anita-k-R07"] }).find((x) => x.ruleId === "R01");
  assert.equal(e.resolved, false);
});

test("marking handled, and taking it back", () => {
  let list = radar.markHandled([], "a-R01", "2026-10-01");
  list = radar.markHandled(list, "a-R01", "2026-10-06");
  assert.deepEqual(list, ["a-R01|2026-10-06"], "handling again restamps it rather than adding a second");
  list = radar.markHandled(list, "b-R07-s-1", "2026-10-06");
  assert.deepEqual(radar.reopenHandled(list, "a-R01"), ["b-R07-s-1|2026-10-06"]);
  assert.deepEqual(radar.reopenHandled(["old-style", "a-R01|2026-10-06"], "old-style"), ["a-R01|2026-10-06"]);
  let many = [];
  for (let i = 0; i < 620; i++) many = radar.markHandled(many, `m-R06-${i}`, "2026-10-06");
  assert.equal(many.length, 500, "the list is bounded");
  assert.equal(many[many.length - 1], "m-R06-619|2026-10-06", "and keeps the newest");
});

test("coming back is celebrated however much she does that day", () => {
  // Two things marked on the day she returned used to read as "no gap".
  const m = onboarded({ onboardedAt: "2026-09-01" });
  const before = action({ id: "old", dayOffset: -5, completed: "minimum" });
  const one = [before, action({ id: "new-1", dayOffset: 0, completed: "minimum" })];
  const two = [...one, action({ id: "new-2", dayOffset: 0, completed: "target", moduleId: "sl-reset" })];
  const r08 = (actions) => radarWith({ members: [m], actions }).find((e) => e.ruleId === "R08");
  // Day -5 and then today: four days with nothing in between, five days since
  // she last did something. It used to say "after 5 inactive days".
  assert.equal(r08(one).detail, "First action in 5 days.");
  assert.equal(r08(two).detail, "First action in 5 days.");
  assert.equal(r08(one).id, r08(two).id, "and it is the same flag, so handling it once is enough");
});

test("a comeback is counted the way a quiet spell is, and starts where the rule says", () => {
  const m = onboarded({ onboardedAt: "2026-09-01" });
  const back = (gap) =>
    radarWith({
      members: [m],
      actions: [action({ id: "old", dayOffset: -gap, completed: "minimum" }), action({ id: "new", dayOffset: 0, completed: "minimum" })],
    }).find((e) => e.ruleId === "R08");
  assert.equal(back(2), undefined, "two days since the last one is not a comeback");
  assert.equal(back(3).detail, "First action in 3 days.", "three is — the same line R01 draws at 72 hours");
  const rule = radar.radarRules.find((r) => r.id === "R08");
  assert.match(rule.trigger, /3 or more days after the last one/);
  assert.doesNotMatch(rule.trigger + back(3).detail, /inactive/, "nothing claims a count of inactive days");
  // And the member who is still away reads the same number from the other rule.
  const away = radarWith({ members: [m], actions: [action({ id: "old", dayOffset: -3, completed: "minimum" })] });
  assert.equal(away.find((e) => e.ruleId === "R01").detail, "Nothing recorded for 3 days.");
});

test("saving a session again the same day corrects the record instead of adding one", () => {
  const first = hurtLog({ painFlag: false, rpe: 5 });
  const { id: _, ...said } = first;
  const once = wl.withSessionLog([], said, "wl-1");
  assert.deepEqual(once.map((l) => l.id), ["wl-1"], "the first save is a new record");

  const other = { ...said, workoutId: "strength-b" };
  const logs = wl.withSessionLog(once, other, "wl-2");
  assert.deepEqual(logs.map((l) => l.id), ["wl-2", "wl-1"], "a different session is its own record, newest first");

  const again = wl.withSessionLog(logs, { ...said, rpe: 8, completedLevel: "stretch" }, "wl-3");
  assert.deepEqual(again.map((l) => l.id), ["wl-2", "wl-1"], "the same session and day: still two records, same ids, same order");
  assert.equal(again[1].rpe, 8);
  assert.equal(again[1].completedLevel, "stretch");

  assert.equal(wl.withSessionLog(again, { ...said, dayOffset: said.dayOffset - 1 }, "wl-4").length, 3, "the same session on another day is another record");
  assert.equal(wl.withSessionLog(again, { ...said, memberId: "anita-k" }, "wl-5").length, 3, "and so is another member's");
  assert.equal(wl.sessionLogOn(again, said.memberId, said.workoutId, said.dayOffset).id, "wl-1");
  assert.equal(wl.sessionLogOn(again, said.memberId, said.workoutId, said.dayOffset - 3), undefined);
  assert.equal(logs[1].rpe, 5, "and the list it was given is left as it was");
});

test("one session is one pain flag, and a handled one comes back only when she says more", () => {
  const m = onboarded({ onboardedAt: "2026-09-20" });
  const { id: _, ...said } = hurtLog({ feltLike: "left knee" });
  const flags = (logs, handled = []) => radarWith({ members: [m], logs, handled }).filter((e) => e.ruleId === "R12");

  // Saved twice — a double tap, or going back and saving again.
  let logs = wl.withSessionLog([], said, "wl-1");
  logs = wl.withSessionLog(logs, said, "wl-2");
  assert.equal(flags(logs).length, 1, "it used to be two flags for one session");

  // Deepika handles it. Saving the same thing again does not bring it back…
  const handled = radar.markHandled([], flags(logs)[0].id, TODAY);
  logs = wl.withSessionLog(logs, { ...said, rpe: 9 }, "wl-3");
  assert.equal(flags(logs, handled)[0].resolved, true, "a changed effort rating is not news about the pain");

  // …but she was told Deepika would see what she wrote, so new words are a new flag.
  logs = wl.withSessionLog(logs, { ...said, feltLike: "left knee — worse on the stairs tonight" }, "wl-4");
  assert.equal(flags(logs, handled).length, 1);
  assert.equal(flags(logs, handled)[0].resolved, false, "what she added is back in front of Deepika");
  assert.match(flags(logs, handled)[0].detail, /worse on the stairs/);

  // Unticking it takes the flag away; ticking it again is a flag she has raised afresh.
  logs = wl.withSessionLog(logs, { ...said, painFlag: false }, "wl-5");
  assert.equal(flags(logs, handled).length, 0);
  const all = radar.markHandled(handled, `${m.id}-R12-wl-4`, TODAY);
  logs = wl.withSessionLog(logs, { ...said, feltLike: "left knee — worse on the stairs tonight" }, "wl-6");
  assert.equal(flags(logs, all)[0].resolved, false, "even with the same words, because in between she had said it did not hurt");
});

test("rules added in a release reach a stored copy, keeping her switches", () => {
  const stored = radar.radarRules
    .filter((r) => r.id !== "R11" && r.id !== "R12")
    .map((r) => (r.id === "R03" ? { ...r, enabled: false } : r));
  const merged = radar.withShippedRules(stored);
  assert.ok(merged.some((r) => r.id === "R11"));
  assert.equal(merged.find((r) => r.id === "R12").enabled, true, "the pain rule reaches her switched on");
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
  // a pain flag is answered before anything else she might write
  assert.equal(drafts.draftForRules(["R11", "R01", "R12"]).id, "something-hurt");
  assert.notEqual(drafts.draftsFor([])[0].draft.id, "something-hurt", "but it is not pushed at her when nothing hurt");
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

// ------------------------------------------------------------- a day, read once
const dayData = ({ actions = [], pulses = [], food = [], messages = [], workouts = [] } = {}) => ({
  actions, pulses, foodEntries: food, messages, workoutLogs: workouts,
});

test("a day is coloured by the biggest thing done in it", () => {
  const a = (completed) => action({ id: `x-${completed}`, completed });
  assert.equal(dv.levelForDay([a("minimum"), a("stretch"), a("target")]), "stretch");
  assert.equal(dv.levelForDay([a("minimum"), a("rest")]), "minimum", "something done outranks a 'not today'");
  assert.equal(dv.levelForDay([a("rest"), a(null)]), "rest");
  assert.equal(dv.levelForDay([a(null)]), null);
  assert.equal(dv.levelForDay([]), null);
});

test("a day view holds what she did, felt, ate and wrote that day — and nobody else's", () => {
  const data = dayData({
    actions: [
      touch.action(-1, "target"), touch.action(-1, "rest"), touch.action(0, null),
      action({ id: "other", memberId: "someone-else", dayOffset: -1, completed: "stretch" }),
    ],
    pulses: [touch.pulse(-1)],
    food: [touch.food(-1), touch.food(-1), touch.food(0)],
    messages: [touch.message(-1), touch.message(-1, "coach")],
    workouts: [{ id: "w", memberId: "priya-s", workoutId: "wk", dayOffset: -1, completedLevel: "target", rpe: 6, painFlag: false }],
  });
  const d = dv.dayView("priya-s", -1, data);
  assert.equal(d.level, "target");
  assert.equal(d.actions.length, 2);
  assert.equal(d.done.length, 1, "a 'not today' is not something done");
  assert.equal(d.pulse.dayOffset, -1);
  assert.equal(d.protein, 10);
  assert.equal(d.foodCount, 2);
  assert.equal(d.wrote, 1, "Deepika's message is not hers");
  assert.equal(d.workouts.length, 1);
  assert.ok(dv.hasAnything(d));
  assert.ok(!dv.hasAnything(dv.dayView("priya-s", -5, data)));
});

test("the last n days run oldest to today, and their counts are plain counts", () => {
  const data = dayData({
    actions: [touch.action(-6, "minimum"), touch.action(-2, "stretch"), touch.action(-2, "target"), touch.action(0, "rest")],
    pulses: [touch.pulse(-6), touch.pulse(0)],
    food: [touch.food(-2), touch.food(-2), touch.food(-1)],
  });
  const days = dv.lastDays("priya-s", 7, data);
  assert.deepEqual(days.map((d) => d.dayOffset), [-6, -5, -4, -3, -2, -1, 0]);
  assert.deepEqual(days.map((d) => d.level), ["minimum", null, null, null, "stretch", null, "rest"]);
  assert.deepEqual(dv.spanStats(days), {
    days: 7, activeDays: 2, checkIns: 2, foodDays: 2, proteinAvg: 8, sessions: 0,
  });
  assert.equal(dv.spanStats(dv.lastDays("priya-s", 7, dayData())).proteinAvg, null, "no food logged is not zero grams");
});

test("days are named the way a person says them", () => {
  assert.equal(dv.dayName(0, TODAY), "Today");
  assert.equal(dv.dayName(-1, TODAY), "Yesterday");
  assert.equal(dv.dayName(-2, TODAY), "Sun 4 Oct");
  assert.equal(dv.dayName(-6, TODAY), "Wed 30 Sep", "across a month end");
  assert.equal(dv.dayLetter(0, TODAY), "T");
  assert.equal(dv.dayOfMonth(-6, TODAY), 30);
});

test("a check-in reads back as the mood she tapped, when it was one", () => {
  assert.equal(dv.moodOf({ energy: 3, stress: 3 }).label, "Okay");
  assert.equal(dv.moodOf({ energy: 2, stress: 3 }).label, "Tired");
  assert.equal(dv.moodOf({ energy: 5, stress: 1 }), null, "detailed numbers are not forced into a mood");
});

test("a check-in with no sleep rating is not a bad night", () => {
  // The one-tap mood saves sleep as 0. Two of those used to put "Your sleep
  // was more disrupted than usual" on her Today screen.
  const moodOnly = { sleep: 0 };
  assert.equal(dv.lowSleepNights([moodOnly, moodOnly, moodOnly]), 0);
  assert.equal(dv.lowSleepNights([{ sleep: 2 }, moodOnly, { sleep: 1 }, { sleep: 3 }]), 2);
  assert.equal(dv.lowSleepNights([]), 0);
});

test("last seen counts anything of hers, and says it in words", () => {
  const data = dayData({
    actions: [touch.action(-5, "minimum"), touch.action(-2, "rest"), touch.action(0, null)],
    food: [touch.food(-1, "coach_on_behalf")],
    messages: [touch.message(-1, "coach")],
  });
  assert.equal(dv.lastSeen("priya-s", data), -2, "a 'not today' is being here; Deepika's entries are not");
  assert.equal(dv.lastSeen("priya-s", dayData()), null);
  assert.equal(dv.lastSeenLabel(0), "Here today");
  assert.equal(dv.lastSeenLabel(-1), "Here yesterday");
  assert.equal(dv.lastSeenLabel(-4), "Last here 4 days ago");
  assert.equal(dv.lastSeenLabel(null), "Nothing logged yet");
});

test("weeks are full runs of seven days ending today, averaged only over what she rated", () => {
  const pulse = (d, energy, sleep, stress) => ({ ...touch.pulse(d), energy, sleep, stress });
  const data = dayData({
    actions: [touch.action(0, "minimum"), touch.action(-6, "target"), touch.action(-7, "stretch"), touch.action(-13, "rest")],
    pulses: [pulse(0, 4, 0, 4), pulse(-3, 2, 3, 3), pulse(-8, 3, 4, 2)],
    food: [touch.food(-1), touch.food(-1), touch.food(-2)],
  });
  const [older, recent] = dv.weekBuckets("priya-s", 2, data);
  assert.deepEqual([recent.weeksAgo, recent.fromOffset, recent.toOffset], [0, -6, 0]);
  assert.deepEqual([older.weeksAgo, older.fromOffset, older.toOffset], [1, -13, -7]);
  assert.equal(recent.activeDays, 2);
  assert.equal(recent.checkIns, 2);
  assert.equal(recent.energy, 3);
  assert.equal(recent.sleep, 3, "the mood tap with no sleep rating is left out, not counted as zero");
  assert.equal(recent.calm, 3.5);
  assert.equal(recent.protein, 8, "averaged over the two days she logged, not seven");
  assert.equal(older.activeDays, 1, "a 'not today' is not an active day");
  assert.equal(older.sleep, 4);
  assert.equal(older.protein, null);
});

test("how far back her record goes decides how many weeks there are to show", () => {
  assert.equal(dv.weeksOfHistory("priya-s", dayData()), 0);
  assert.equal(dv.weeksOfHistory("priya-s", dayData({ pulses: [touch.pulse(0)] })), 1);
  assert.equal(dv.weeksOfHistory("priya-s", dayData({ pulses: [touch.pulse(-6)] })), 1);
  assert.equal(dv.weeksOfHistory("priya-s", dayData({ pulses: [touch.pulse(-7)] })), 2);
  assert.equal(dv.weeksOfHistory("priya-s", dayData({ actions: [touch.action(-200, "minimum")] })), 12, "capped at the length of the journey");
  assert.equal(dv.weeksOfHistory("priya-s", dayData({ actions: [touch.action(-30, null)] })), 0, "a planned action is not a record of her");
  assert.equal(dv.shortDate(-2, TODAY), "4 Oct");
});

test("the console calls a member what the member said, and assumes nothing", () => {
  const words = (m) => {
    const p = display.pronouns(m);
    return `${p.Subject} see${p.s} it; ${p.subject} ${p.is} here; write to ${p.object}; ${p.possessive} app; ${p.Possessive} week; by ${p.reflexive}`;
  };
  assert.equal(words({ id: "a", gender: "woman" }), "She sees it; she is here; write to her; her app; Her week; by herself");
  assert.equal(words({ id: "a", gender: "man" }), "He sees it; he is here; write to him; his app; His week; by himself");
  const they = "They see it; they are here; write to them; their app; Their week; by themselves";
  assert.equal(words({ id: "a", gender: "other" }), they);
  assert.equal(words({ id: "a" }), they, "someone who was never asked is not assumed to be a woman");
  assert.equal(words(undefined), they);
  assert.equal(words(null), they);

  // The six sample members are written as women, and say so.
  assert.deepEqual(seed.members.map((m) => m.gender), Array(6).fill("woman"));
  // A copy of one stored before the question existed still reads as written…
  assert.equal(display.pronouns({ id: "radhika" }).subject, "she");
  // …but never over what a record itself says.
  assert.equal(display.pronouns({ id: "radhika", gender: "other" }).subject, "they");
});

test("what the Radar says about one member uses that member's word; its rules name no one", () => {
  const since = (gender) =>
    radarWith({ members: [onboarded({ onboardedAt: "2026-10-01", gender })] }).find((e) => e.ruleId === "R01").detail;
  assert.equal(since("woman"), "Nothing recorded since she joined 5 days ago.");
  assert.equal(since("man"), "Nothing recorded since he joined 5 days ago.");
  assert.equal(since(undefined), "Nothing recorded since they joined 5 days ago.");

  // A rule is about members in general, so its own wording has no "her" in it.
  for (const rule of radar.radarRules) {
    assert.doesNotMatch(`${rule.name} ${rule.trigger} ${rule.suggestedAction}`, /\b(she|her|hers|herself|woman|women)\b/i, rule.id);
  }
});

test("the library is written so that anyone assigned a module can read it about themselves", () => {
  // "What better looks like" is on Deepika's library page and on the member's
  // own module page. It used to read "She can carry shopping in one hand…" —
  // to the member, about herself, and to a man about someone else.
  const shown = [seed.modules, seed.workouts, seed.notificationTemplates, seed.articles ?? []];
  const said = JSON.stringify(shown).match(/[^"]*\b(she|her|hers|herself)\b[^"]*/gi) ?? [];
  assert.deepEqual(said, []);
});

/**
 * Everything a source file can put on a screen: string literals, the fixed
 * parts of template strings, and text between JSX tags. Comments are not part
 * of the syntax tree, so they are not read — and here most of them say "her".
 */
function screenText(file, code) {
  const ts = require("typescript");
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
  const found = [];
  const add = (node, text) =>
    found.push({ line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, text });
  const visit = (node) => {
    if (ts.isImportDeclaration(node)) return; // "@/components/HerWeek" is a path, not copy
    if (ts.isStringLiteralLike(node) || ts.isJsxText(node)) add(node, node.text);
    else if (ts.isTemplateExpression(node)) {
      add(node, [node.head, ...node.templateSpans.map((s) => s.literal)].map((part) => part.text).join(" … "));
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

test("screen text is read from source, and comments are not", () => {
  // The check below is only as good as this reader, so it is tested first.
  const code = [
    'import Her from "@/components/HerWeek";',
    "// a comment may say her",
    'const label = busy ? "Resetting…" : "Reset her password";',
    "const line = `Week ${week} is on his Journey now.`;",
    'const row = <p title="Her last 14 days">{/* she */} See her app <b>{name}</b></p>;',
  ].join("\n");
  assert.deepEqual(
    screenText("sample.tsx", code).map((x) => `${x.line}: ${x.text.trim()}`),
    ["3: Resetting…", "3: Reset her password", "4: Week  …  is on his Journey now.", "5: Her last 14 days", "5: See her app"]
  );
});

test("the console never spells a member's pronoun out itself", () => {
  // pronouns() in lib/display.ts is the one place "she" and "he" are written
  // down. A "her" typed straight into a console string is wrong about someone:
  // the password-reset error still said "Her password is set…" after every
  // screen had been fixed, because an API route sends it and no page holds it.
  //
  // The console is these folders and the components only it uses. A component
  // the member app shares (PulseCard, Toast) is left out: most of its text is
  // read by members, and may say "she" of Deepika.
  const consoleOnly =
    /\/(app\/coach|app\/api\/coach)\/|\/components\/(HerWeek|QuickFind|MemberName|InvitePanel|ResetPassword)\.tsx$|\/lib\/(radar|replyDrafts)\.ts$/;
  const files = ["app", "components", "lib"].flatMap(sources).filter(([file]) => consoleOnly.test(file));
  assert.ok(files.length >= 15, `the console's files were found (${files.length})`);
  const typed = [];
  for (const [file, code] of files) {
    for (const { line, text } of screenText(file, code)) {
      // A line that names Deepika is about her, and "she" is right for her.
      if (/\bDeepika\b/.test(text)) continue;
      const word = text.match(/\b(she|her|hers|herself|he|him|his|himself|women|men)\b/i)?.[0];
      if (word) typed.push(`${file.replace(/^.*\/(?=(app|components|lib)\/)/, "")}:${line}  “${word}” in: ${text.replace(/\s+/g, " ").trim().slice(0, 90)}`);
    }
  }
  assert.equal(
    typed.length,
    0,
    `console copy that assumes who a member is:\n  ${typed.join("\n  ")}\n` +
      "Take the word from pronouns() in lib/display.ts, or write the sentence without one."
  );
});

test("no screen works out today's date for itself", () => {
  // `new Date().toISOString().slice(0, 10)` is the date in London: from
  // midnight to 5:30 in the morning in India it is still yesterday there. The
  // session page and the report form both stamped what she saved that way, and
  // the week strip on Movement named its days from the phone's own clock.
  // "Today" is dateKey() in lib/calendar.ts, and that file is the one place
  // allowed to work it out. (The hour is different: "good morning" is rightly
  // her own morning, wherever she is.)
  const utcDate = /new Date\(\)\s*\.toISOString\(\)\s*\.(slice|substring|substr|split)\(/;
  const ownCalendar = /new Date\(\)\s*\.get(Day|Date|Month|FullYear)\(/;
  const offenders = ["app", "components", "lib"]
    .flatMap(sources)
    .filter(([file]) => !file.endsWith("lib/calendar.ts"))
    .filter(([, text]) => utcDate.test(text) || ownCalendar.test(text))
    .map(([file]) => file.replace(/^.*\/(app|components|lib)\//, "$1/"));
  assert.deepEqual(offenders, []);
});

// ------------------------------------------------------ signing in with Google
const GOOGLE_ENV = { GOOGLE_CLIENT_ID: "client-1.apps.example", GOOGLE_CLIENT_SECRET: "shh" };
const SECRET = "a-test-secret-that-is-long-enough";
const idToken = (claims) => `${Buffer.from('{"alg":"RS256"}').toString("base64url")}.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.sig`;
const goodClaims = (over = {}) => ({
  iss: "https://accounts.google.com", aud: "client-1.apps.example", sub: "1093847",
  email: "meera.nair@example.com", email_verified: true, name: "Meera Nair",
  nonce: "the-nonce-for-this-attempt", exp: Math.floor(Date.now() / 1000) + 3600, ...over,
});
const expecting = { clientId: "client-1.apps.example", issuers: ["https://accounts.google.com", "accounts.google.com"], nonce: "the-nonce-for-this-attempt" };

test("Google sign-in is off until both keys are set, and only ever talks to Google", () => {
  assert.equal(google.googleConfig({}), null);
  assert.equal(google.googleConfig({ GOOGLE_CLIENT_ID: "x" }), null, "an id with no secret is not switched on");
  assert.equal(google.googleConfig({ GOOGLE_CLIENT_SECRET: "x" }), null);
  assert.equal(google.googleConfig({ GOOGLE_CLIENT_ID: "  ", GOOGLE_CLIENT_SECRET: "x" }), null, "blank is not set");

  const on = google.googleConfig({ ...GOOGLE_ENV, COACH_GOOGLE_EMAIL: " Deepika@Example.com " });
  assert.equal(on.authUrl, "https://accounts.google.com/o/oauth2/v2/auth");
  assert.equal(on.tokenUrl, "https://oauth2.googleapis.com/token");
  assert.equal(on.coachEmail, "deepika@example.com");
  assert.equal(google.googleConfig(GOOGLE_ENV).coachEmail, null, "Deepika signs in with Google only if she says which address is hers");

  // The test setting can point at this machine and nowhere else.
  const standIn = (value) => google.googleConfig({ ...GOOGLE_ENV, GOOGLE_TEST_ISSUER: value }).tokenUrl;
  assert.equal(standIn("http://127.0.0.1:4010"), "http://127.0.0.1:4010/token");
  assert.equal(standIn("http://localhost:4010/"), "http://localhost:4010/token");
  for (const elsewhere of ["https://evil.example", "http://evil.example", "http://10.0.0.5:4010", "https://127.0.0.1:4010", "http://127.0.0.1.evil.example", "not a url"]) {
    assert.equal(standIn(elsewhere), "https://oauth2.googleapis.com/token", elsewhere);
  }
});

test("she is sent to Google with a fresh state, nonce and challenge, and never the secret", () => {
  const config = google.googleConfig(GOOGLE_ENV);
  const one = google.newFlow("signin");
  const two = google.newFlow("signin");
  assert.notEqual(one.state, two.state);
  assert.notEqual(one.nonce, two.nonce);
  assert.notEqual(one.verifier, two.verifier);
  assert.ok(one.verifier.length >= 43 && one.verifier.length <= 128 && /^[A-Za-z0-9_-]+$/.test(one.verifier), "a code verifier Google accepts");

  const url = new URL(google.authorizationUrl(config, one, "https://app.example/api/auth/google/callback"));
  const q = Object.fromEntries(url.searchParams);
  assert.equal(url.origin + url.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
  assert.deepEqual(
    { ...q, state: "", nonce: "", code_challenge: "" },
    { client_id: "client-1.apps.example", redirect_uri: "https://app.example/api/auth/google/callback", response_type: "code",
      scope: "openid email profile", state: "", nonce: "", code_challenge: "", code_challenge_method: "S256", prompt: "select_account" },
    "exactly these, and nothing asking for more than who she is"
  );
  assert.equal(q.state, one.state);
  assert.equal(q.nonce, one.nonce);
  assert.equal(q.code_challenge, createHash("sha256").update(one.verifier).digest("base64url"));
  assert.ok(!url.href.includes("shh") && !url.href.includes(one.verifier), "neither secret leaves in the address");
});

test("an attempt's cookie cannot be edited, reused late, or passed off as a session", async () => {
  const now = Date.parse("2026-11-24T10:00:00Z");
  const flow = google.newFlow("create", undefined, now);
  const sealed = google.sealFlow(flow, SECRET);
  assert.deepEqual(google.openFlow(sealed, SECRET, now + 60_000), flow);

  assert.equal(google.openFlow(sealed, SECRET, now + 11 * 60_000), null, "ten minutes, then it is over");
  assert.equal(google.openFlow(sealed, "another-secret", now), null);
  assert.equal(google.openFlow(undefined, SECRET, now), null);
  assert.equal(google.openFlow("", SECRET, now), null);
  assert.equal(google.openFlow("nonsense", SECRET, now), null);

  // "signin" rewritten to "create" — which would skip the join code — fails.
  const [payload, signature] = google.sealFlow(google.newFlow("signin", undefined, now), SECRET).split(".");
  const edited = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url").toString()), intent: "create" })).toString("base64url");
  assert.equal(google.openFlow(`${edited}.${signature}`, SECRET, now), null);

  // Connecting is for one named account.
  assert.equal(google.openFlow(google.sealFlow({ ...flow, intent: "link" }, SECRET), SECRET, now), null, "a link with nobody named");
  assert.equal(google.openFlow(google.sealFlow(google.newFlow("link", "meera-nair", now), SECRET), SECRET, now).user, "meera-nair");

  // The session cookie is signed with the same secret. Neither passes for the other.
  process.env.AUTH_SECRET = SECRET;
  assert.equal(await auth.readSessionToken(sealed), null, "an attempt is not a session");
  const session = await auth.createSessionToken({ sub: "meera-nair", role: "member", name: "Meera" });
  assert.equal(google.openFlow(session, SECRET), null, "and a session is not an attempt");
  assert.deepEqual(await auth.readSessionToken(session), { sub: "meera-nair", role: "member", name: "Meera" });
});

test("a session has to name someone", async () => {
  process.env.AUTH_SECRET = SECRET;
  // Validly signed, and for nobody. This used to come back as a session whose
  // sub was undefined — and the proxy only asks whether there is one.
  assert.equal(await auth.readSessionToken(await auth.createSessionToken({ sub: "", role: "member", name: "" })), null);
  assert.equal(await auth.readSessionToken(await auth.createSessionToken({ sub: "x", role: "admin", name: "" })), null);
  assert.equal(await auth.readSessionToken(await auth.createSessionToken({ role: "coach", name: "Deepika" })), null);
  const good = await auth.createSessionToken({ sub: "deepika", role: "coach", name: "Deepika" });
  assert.equal((await auth.readSessionToken(good)).role, "coach");
  assert.equal(await auth.readSessionToken(good.slice(0, -2) + "xx"), null, "a changed signature");
});

test("who Google says she is — accepted only for this app, this attempt, and a verified address", () => {
  const read = (over, expect = expecting) => google.personFrom(google.readIdToken(idToken(goodClaims(over))), expect);
  assert.deepEqual(read({}), { ok: true, person: { sub: "1093847", email: "meera.nair@example.com", name: "Meera Nair" } });
  assert.equal(read({ iss: "accounts.google.com" }).ok, true, "Google uses both spellings of its own name");
  assert.equal(read({ email_verified: "true" }).ok, true);
  assert.equal(read({ aud: ["client-1.apps.example"] }).ok, true);

  const refused = (over, expect) => { const r = read(over, expect); return r.ok ? "accepted" : r.problem; };
  assert.equal(refused({ iss: "https://accounts.example.com" }), "issuer");
  assert.equal(refused({ iss: undefined }), "issuer");
  assert.equal(refused({ aud: "another-app.apps.example" }), "audience", "a token Google issued to some other app");
  assert.equal(refused({ aud: ["client-1.apps.example", "another-app"], azp: "another-app" }), "audience");
  assert.equal(refused({ exp: Math.floor(Date.now() / 1000) - 3600 }), "expired");
  assert.equal(refused({ exp: "soon" }), "expired");
  assert.equal(refused({ nonce: "the-nonce-of-an-earlier-attempt" }), "nonce", "a token from a different attempt, replayed");
  assert.equal(refused({ nonce: undefined }), "nonce");
  assert.equal(refused({ email_verified: false }), "unverified");
  assert.equal(refused({ email_verified: undefined }), "unverified");
  assert.equal(refused({ sub: "" }), "malformed");
  assert.equal(refused({ sub: 12345 }), "malformed");
  assert.equal(refused({ email: "not-an-address" }), "malformed");
  assert.equal(refused({ email: undefined }), "malformed");

  assert.equal(google.personFrom(null, expecting).ok, false);
  for (const junk of [undefined, null, 42, "", "a.b", "a.b.c.d", "a.!!!.c", `a.${Buffer.from("[1,2]").toString("base64url")}.c`]) {
    assert.equal(google.readIdToken(junk), null, String(junk));
  }

  // The name she will be known by here, when the account is made this way.
  assert.equal(read({ name: undefined, given_name: "Meera", family_name: "Nair" }).person.name, "Meera Nair");
  assert.equal(read({ name: "", given_name: undefined }).person.name, "meera.nair", "no name at all: the first part of the address");
  assert.equal(read({ name: "  Meera\n\tNair\u0007  " }).person.name, "Meera Nair");
  assert.equal(read({ name: "x".repeat(300) }).person.name.length, 80);
});

test("a username is made for someone who did not have to choose one", () => {
  const allowed = (u) => u.length >= 3 && u.length <= 24 && /^[a-z0-9][a-z0-9._-]*$/.test(u);
  const cases = [
    ["Meera Nair", "meera@example.com", "meera-nair"],
    ["Renée D’Souza", "r@example.com", "renee-d-souza"],
    ["  Dr. A.P.J.  Iyer  ", "x@example.com", "dr-a-p-j-iyer"],
    ["मीरा नायर", "meera.nair84@example.com", "meera-nair84"], // not writable in a-z: her address instead
    ["Li", "li.wei@example.com", "li-wei"],
    ["", "ab@example.com", "member"],
    ["A Very Long Name That Goes On And On", "a@example.com", "a-very-long-name-tha"],
  ];
  for (const [name, email, expected] of cases) {
    const made = google.usernameFrom(name, email);
    assert.equal(made, expected, name);
    assert.ok(allowed(made), `${made} obeys the rule for typed usernames`);
  }

  const tries = google.usernameCandidates("a-very-long-name-tha", () => "zz99");
  assert.equal(tries[0], "a-very-long-name-tha", "her own name first");
  assert.deepEqual(tries.slice(1, 4), ["a-very-long-name-tha-2", "a-very-long-name-tha-3", "a-very-long-name-tha-4"]);
  assert.equal(tries.at(-1), "a-very-long-name-th-zz99");
  assert.ok(tries.every(allowed), tries.filter((t) => !allowed(t)).join());
  assert.equal(new Set(google.usernameCandidates("meera-nair")).size, 13, "thirteen different names to try");
});

test("Google is told to send her back to the address she came from", () => {
  const url = "https://deepika.example/api/auth/google?x=1";
  assert.equal(google.appOrigin(url, {}), "https://deepika.example");
  assert.equal(google.appOrigin("http://localhost:3000/api/auth/google", {}), "http://localhost:3000");
  assert.equal(google.appOrigin(url, { APP_ORIGIN: "https://app.example/some/path" }), "https://app.example", "pinned, for a server behind a proxy");
  assert.equal(google.appOrigin(url, { APP_ORIGIN: "javascript:alert(1)" }), "https://deepika.example");
  assert.equal(google.appOrigin(url, { APP_ORIGIN: "nonsense" }), "https://deepika.example");
});

test("the one call to Google: a token comes back, or nothing does", async () => {
  let reply = () => ({ status: 200, body: JSON.stringify({ id_token: "h.p.s", access_token: "unused" }) });
  let asked = null;
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      asked = { method: req.method, type: req.headers["content-type"], form: Object.fromEntries(new URLSearchParams(body)) };
      const { status, body: out } = reply();
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(out);
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const issuer = `http://127.0.0.1:${server.address().port}`;
  const config = google.googleConfig({ ...GOOGLE_ENV, GOOGLE_TEST_ISSUER: issuer });
  const given = { code: "the-code", verifier: "the-verifier", redirectUri: "https://app.example/api/auth/google/callback" };
  const quiet = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args.join(" "));
  try {
    assert.equal(await google.exchangeCode(config, given), "h.p.s");
    assert.deepEqual(asked, {
      method: "POST", type: "application/x-www-form-urlencoded",
      form: { grant_type: "authorization_code", code: "the-code", code_verifier: "the-verifier",
              redirect_uri: "https://app.example/api/auth/google/callback", client_id: "client-1.apps.example", client_secret: "shh" },
    });

    reply = () => ({ status: 400, body: JSON.stringify({ error: "invalid_grant", error_description: "Bad Request" }) });
    assert.equal(await google.exchangeCode(config, given), null);
    assert.match(logged.at(-1), /status 400, invalid_grant/, "Google's reason reaches the log");
    reply = () => ({ status: 200, body: JSON.stringify({ access_token: "only" }) });
    assert.equal(await google.exchangeCode(config, given), null, "no id_token, no sign-in");
    reply = () => ({ status: 200, body: "<html>not json</html>" });
    assert.equal(await google.exchangeCode(config, given), null);
    reply = () => ({ status: 200, body: JSON.stringify({ id_token: "x".repeat(200_000) }) });
    assert.equal(await google.exchangeCode(config, given), null, "a reply far too large to be a token");
    assert.ok(logged.every((line) => !line.includes("shh") && !line.includes("the-code") && !line.includes("the-verifier")), "nothing secret is logged");
  } finally {
    await new Promise((r) => server.close(r));
    assert.equal(await google.exchangeCode(config, given), null, "nobody there at all");
    console.error = quiet;
  }
});
