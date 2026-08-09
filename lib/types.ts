/**
 * Domain model for Deepika Wellness V0.
 * Mirrors §13 of the V0 Product Architecture (data model + dual-entry).
 *
 * The rule that shapes everything here: every observed value carries its own
 * provenance. Coach-entered data must never be able to masquerade as
 * member-entered data, at the type level as well as in the UI.
 */

export type EffortLevel = "minimum" | "target" | "stretch";

export type SourceType =
  | "member_manual"
  | "coach_on_behalf"
  | "wearable"
  | "imported_document"
  | "system_derived";

export type ModuleCategory =
  | "movement"
  | "nutrition"
  | "sleep"
  | "hormonal"
  | "behaviour";

export type RadarBucket = "attention" | "prepare" | "celebrate" | "admin";

export type EngagementState = "strong" | "steady" | "slipping" | "quiet";

/** Every value the system stores about a member carries this envelope. */
export interface Provenance {
  source: SourceType;
  enteredBy: string; // display name — "Radhika", "Deepika", "Apple Health"
  at: string; // ISO date
}

export interface EffortSpec {
  label: string;
  minutes: number;
}

export interface Member {
  id: string;
  name: string;
  age: number;
  city: string;
  initials: string;
  /** Weeks since program start. */
  week: number;
  phase: "Stabilise" | "Build" | "Consolidate";
  lifeStage: string;
  goals: string[];
  constraints: string[];
  /** M05 "what I will not do" — a personalisation input, not decoration. */
  wontDo: string;
  medical: string[];
  medications: string[];
  engagement: EngagementState;
  weeklyFocus: string[];
  activeModuleIds: string[];
  /** Set when the coach republishes a plan; surfaced to the member as a reason. */
  lastPlanChange?: { at: string; rationale: string };
  bodyComp?: { label: string; value: string; at: string; provenance: Provenance }[];
  assessmentComplete: number; // 0–100
}

export interface DailyAction {
  id: string;
  memberId: string;
  /** Day offset from "today". 0 = today, -1 = yesterday. */
  dayOffset: number;
  moduleId: string;
  title: string;
  why: string;
  minimum: EffortSpec;
  target: EffortSpec;
  stretch: EffortSpec;
  /** null = untouched, "rest" = explicitly not today (never a failure state). */
  completed: EffortLevel | "rest" | null;
  skipReason?: string;
  provenance?: Provenance;
  /** Links a movement action to a workout definition. */
  workoutId?: string;
}

export interface PulseEntry {
  id: string;
  memberId: string;
  dayOffset: number;
  energy: number; // 1–5
  sleep: number; // 1–5
  stress: number; // 1–5
  symptoms: string[];
  note?: string;
  provenance: Provenance;
}

export interface ExerciseSet {
  name: string;
  prescription: string;
  cue: string;
  /** Deepika's own repertoire — kept deliberately small in V0. */
  supervisedOnly?: boolean;
}

export interface Workout {
  id: string;
  name: string;
  intent: string;
  warmup: string[];
  exercises: ExerciseSet[];
  minimum: EffortSpec;
  target: EffortSpec;
  stretch: EffortSpec;
  supervision: "supervised" | "independent" | "check-in";
  stopGuidance: string;
}

export interface WorkoutLog {
  id: string;
  memberId: string;
  workoutId: string;
  dayOffset: number;
  completedLevel: EffortLevel;
  rpe: number;
  painFlag: boolean;
  feltLike?: string;
  provenance: Provenance;
}

export interface CoachModule {
  id: string;
  name: string;
  category: ModuleCategory;
  version: string;
  status: "active" | "draft" | "retired";
  purpose: string;
  betterLooksLike: string;
  eligibility: string;
  keyIdeas: string[];
  minimum: EffortSpec;
  target: EffortSpec;
  stretch: EffortSpec;
  tracking: string;
  coachPlaybook: {
    ask: string[];
    barriers: string[];
    escalation: string;
  };
  notificationTemplates: string[];
  progression: string;
  reviewNote?: string;
  reviewedOn?: string;
}

export interface Message {
  id: string;
  memberId: string;
  from: "coach" | "member" | "system";
  kind: "text" | "voice" | "plan_update";
  body: string;
  seconds?: number;
  dayOffset: number;
  time: string;
  read: boolean;
}

export interface Session {
  id: string;
  memberId: string;
  type: "1:1 coaching" | "Supervised strength" | "Assessment" | "Follow-up";
  dayOffset: number;
  time: string;
  mode: "In person" | "Video";
  status: "scheduled" | "complete";
  memberQuestions: string[];
  agenda: string[];
  privateNotes?: string;
  memberRecap?: string;
  commitments: { text: string; done: boolean }[];
}

export interface WeeklyReflection {
  id: string;
  memberId: string;
  weekOf: string;
  biggestWin: string;
  hardestPart: string;
  feltUnrealistic: string;
  confidenceNextWeek: number; // 1–5
  questions: string;
  provenance: Provenance;
}

export interface RadarEvent {
  id: string;
  memberId: string;
  ruleId: string;
  ruleName: string;
  /** Human-readable trigger. V0 rules must be auditable, never opaque. */
  trigger: string;
  bucket: RadarBucket;
  detail: string;
  suggestedAction: string;
  resolved: boolean;
  snoozed: boolean;
}

export interface Feedback {
  id: string;
  reporter: string;
  role: "member" | "coach";
  screen: string;
  category: "confusing" | "idea" | "bug";
  severity: "low" | "medium" | "high";
  text: string;
  easeScore?: number;
  status: "new" | "triaged" | "building" | "fixed";
}

export interface NotificationTemplate {
  id: string;
  trigger: string;
  copy: string;
  voice: "coach" | "system";
  timing: string;
  /** Notification rules from §11.2 — enforced, not aspirational. */
  capped: boolean;
}
