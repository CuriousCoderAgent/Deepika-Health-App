"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as seed from "./seed";
import { evaluateRadar, radarRules, type RadarRule } from "./radar";
import { draftWeekPlansFor, weekPlansFor } from "./plan";
import type {
  Article,
  CoachModule,
  DailyAction,
  EffortLevel,
  Feedback,
  Member,
  Message,
  PulseEntry,
  Report,
  Session,
  WeekPlan,
  Workout,
  WorkoutLog,
} from "./types";

interface State {
  members: Member[];
  modules: CoachModule[];
  workouts: Workout[];
  articles: Article[];
  actions: DailyAction[];
  pulses: PulseEntry[];
  workoutLogs: WorkoutLog[];
  messages: Message[];
  sessions: Session[];
  reports: Report[];
  feedback: Feedback[];
  rules: RadarRule[];
  resolvedRadar: string[];
  activeMemberId: string;
}

const initial: State = {
  members: seed.members,
  modules: seed.modules,
  workouts: seed.workouts,
  articles: seed.articles,
  actions: seed.dailyActions,
  pulses: seed.pulses,
  workoutLogs: seed.workoutLogs,
  messages: seed.messages,
  sessions: seed.sessions,
  reports: seed.reports,
  feedback: seed.feedbackItems,
  rules: radarRules,
  resolvedRadar: [],
  activeMemberId: "radhika",
};

// Bumped when seeded member content changes shape, so an existing demo
// browser picks up new seed data instead of showing a half-populated state.
const KEY = "dw-v0-state-4";

interface Ctx extends State {
  radar: ReturnType<typeof evaluateRadar>;
  activeMember: Member;
  setActiveMember: (id: string) => void;
  completeAction: (id: string, level: EffortLevel | "rest", reason?: string) => void;
  submitPulse: (
    memberId: string,
    v: {
      energy: number;
      sleep: number;
      stress: number;
      symptoms: string[];
      note?: string;
      partial?: boolean;
    },
    byCoach?: boolean
  ) => void;
  logWorkout: (log: Omit<WorkoutLog, "id">) => void;
  updateAction: (id: string, patch: Partial<DailyAction>) => void;
  addAction: (a: DailyAction) => void;
  removeAction: (id: string) => void;
  updateDraftWeek: (
    memberId: string,
    week: number,
    changes: Partial<Pick<WeekPlan, "focus" | "moduleIds">>
  ) => void;
  publishWeek: (memberId: string, week: number, rationale: string) => void;
  addCoachNote: (memberId: string, text: string) => void;
  addReport: (r: Omit<Report, "id">) => void;
  sendMessage: (memberId: string, m: Omit<Message, "id" | "memberId">) => void;
  markRead: (memberId: string) => void;
  toggleRule: (id: string) => void;
  resolveRadar: (id: string) => void;
  addFeedback: (f: Omit<Feedback, "id">) => void;
  updateFeedback: (id: string, patch: Partial<Feedback>) => void;
  saveSessionNotes: (id: string, patch: Partial<Session>) => void;
  reset: () => void;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Seeded content (modules, workouts) always comes from source, so
        // content edits ship without wiping the demo state.
        setState({
          ...initial,
          ...parsed,
          modules: seed.modules,
          workouts: seed.workouts,
          articles: seed.articles,
        });
      }
    } catch {
      /* first run, or storage unavailable */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked — the prototype still works in memory */
    }
  }, [state, hydrated]);

  const patch = (fn: (s: State) => State) => setState((s) => fn(s));

  const value: Ctx = useMemo(() => {
    const activeMember =
      state.members.find((m) => m.id === state.activeMemberId) ?? state.members[0];

    const radar = evaluateRadar(
      state.members,
      state.actions,
      state.pulses,
      state.messages,
      state.sessions,
      state.rules,
      state.resolvedRadar
    );

    return {
      ...state,
      radar,
      activeMember,

      setActiveMember: (id) => patch((s) => ({ ...s, activeMemberId: id })),

      completeAction: (id, level, reason) =>
        patch((s) => ({
          ...s,
          actions: s.actions.map((a) =>
            a.id === id
              ? {
                  ...a,
                  completed: level,
                  skipReason: level === "rest" ? reason : undefined,
                  provenance: {
                    source: "member_manual",
                    enteredBy: s.members.find((m) => m.id === a.memberId)?.name.split(" ")[0] ?? "Member",
                    at: new Date().toISOString().slice(0, 10),
                  },
                }
              : a
          ),
        })),

      submitPulse: (memberId, v, byCoach) =>
        patch((s) => {
          const existing = s.pulses.find((x) => x.memberId === memberId && x.dayOffset === 0);
          const entry: PulseEntry = {
            id: existing?.id ?? `p-${memberId}-${Date.now()}`,
            memberId,
            dayOffset: 0,
            ...v,
            provenance: {
              source: byCoach ? "coach_on_behalf" : "member_manual",
              enteredBy: byCoach
                ? "Deepika"
                : s.members.find((m) => m.id === memberId)?.name.split(" ")[0] ?? "Member",
              at: new Date().toISOString().slice(0, 10),
            },
          };
          return {
            ...s,
            pulses: existing
              ? s.pulses.map((x) => (x.id === existing.id ? entry : x))
              : [entry, ...s.pulses],
          };
        }),

      logWorkout: (log) =>
        patch((s) => ({ ...s, workoutLogs: [{ ...log, id: `wl-${Date.now()}` }, ...s.workoutLogs] })),

      updateAction: (id, p) =>
        patch((s) => ({ ...s, actions: s.actions.map((a) => (a.id === id ? { ...a, ...p } : a)) })),

      addAction: (a) => patch((s) => ({ ...s, actions: [a, ...s.actions] })),

      removeAction: (id) => patch((s) => ({ ...s, actions: s.actions.filter((a) => a.id !== id) })),

      updateDraftWeek: (memberId, week, changes) =>
        patch((s) => ({
          ...s,
          members: s.members.map((m) => {
            if (m.id !== memberId) return m;
            const draftWeekPlans = draftWeekPlansFor(m).map((w) =>
              w.week === week ? { ...w, ...changes } : w
            );
            return { ...m, draftWeekPlans };
          }),
        })),

      // Publishing a week is the only way a plan change reaches the member,
      // and it always carries a reason. Publishing the *current* week also
      // mirrors into the live fields every other screen reads, and lands a
      // plan-change card on her Today screen.
      publishWeek: (memberId, week, rationale) =>
        patch((s) => {
          let announce: string | null = null;
          const members = s.members.map((m) => {
            if (m.id !== memberId) return m;
            const rawTarget = draftWeekPlansFor(m).find((w) => w.week === week);
            if (!rawTarget) return m;
            const target = { ...rawTarget, focus: rawTarget.focus.filter(Boolean) };
            const weekPlans = weekPlansFor(m).map((w) => (w.week === week ? target : w));
            const isCurrent = week === m.week;
            if (isCurrent) announce = `Deepika changed your week. ${rationale}`;
            return {
              ...m,
              weekPlans,
              draftWeekPlans: weekPlans,
              ...(isCurrent
                ? {
                    activeModuleIds: target.moduleIds,
                    weeklyFocus: target.focus,
                    lastPlanChange: { at: "just now", rationale },
                  }
                : {}),
            };
          });
          return {
            ...s,
            members,
            messages: announce
              ? [
                  {
                    id: `m-${Date.now()}`,
                    memberId,
                    from: "system",
                    kind: "plan_update",
                    body: announce,
                    dayOffset: 0,
                    time: "just now",
                    read: false,
                  },
                  ...s.messages,
                ]
              : s.messages,
          };
        }),

      // Stores what a report says. Nothing here interprets it — see types.ts.
      addReport: (r) =>
        patch((s) => ({
          ...s,
          reports: [{ ...r, id: `rep-${Date.now()}` }, ...s.reports],
        })),

      addCoachNote: (memberId, text) =>
        patch((s) => ({
          ...s,
          members: s.members.map((m) =>
            m.id === memberId
              ? {
                  ...m,
                  notes: [
                    { id: `note-${Date.now()}`, at: new Date().toISOString().slice(0, 10), text },
                    ...(m.notes ?? []),
                  ],
                }
              : m
          ),
        })),

      sendMessage: (memberId, m) =>
        patch((s) => ({
          ...s,
          messages: [{ ...m, id: `m-${Date.now()}`, memberId }, ...s.messages],
        })),

      markRead: (memberId) =>
        patch((s) => ({
          ...s,
          messages: s.messages.map((m) => (m.memberId === memberId ? { ...m, read: true } : m)),
        })),

      toggleRule: (id) =>
        patch((s) => ({
          ...s,
          rules: s.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
        })),

      resolveRadar: (id) =>
        patch((s) => ({
          ...s,
          resolvedRadar: s.resolvedRadar.includes(id)
            ? s.resolvedRadar.filter((x) => x !== id)
            : [...s.resolvedRadar, id],
        })),

      addFeedback: (f) =>
        patch((s) => ({ ...s, feedback: [{ ...f, id: `f-${Date.now()}` }, ...s.feedback] })),

      updateFeedback: (id, p) =>
        patch((s) => ({ ...s, feedback: s.feedback.map((f) => (f.id === id ? { ...f, ...p } : f)) })),

      saveSessionNotes: (id, p) =>
        patch((s) => ({ ...s, sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...p } : x)) })),

      reset: () => {
        try {
          window.localStorage.removeItem(KEY);
        } catch {
          /* ignore */
        }
        setState(initial);
      },
    };
  }, [state]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
