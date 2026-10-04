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
