# CLAUDE.md

Operational guidance for Claude Code working on this repository.
Read `docs/PROJECT-BRIEF.md` before making product decisions — it holds the
business context, the research the design rests on, and the prioritised backlog.

---

## What this is

A **V0 Vision Prototype** for Deepika Wellness: coaching software for a women's
midlife health practice in India. Two surfaces — a member app and a coach
console — built so the founder (Deepika) can use them and react, rather than
answer more discovery questions.

It is **not** the Pilot MVP. No auth, no backend, no real data. State lives in
`localStorage`. Do not add anything that implies otherwise.

**Product thesis:** Deepika provides the intelligence and the human
relationship. The software provides memory, structure, visibility,
reinforcement and continuity.

**North star:** do not optimise for app opens. Optimise for useful health
behaviour, sustainable adherence, and graceful return after imperfect days.

---

## Invariants — do not violate these without an explicit decision from the user

These are not style preferences. Each traces to research or to a regulatory
boundary documented in `docs/PROJECT-BRIEF.md`.

1. **Minimum is a success state.** Reaching the minimum effort level always
   renders as a filled, real colour. Never grey, never an outline, never a
   partial-credit or "you only did the minimum" treatment.
2. **Nothing is red, ever.** Missed actions use the neutral `rest` palette and
   the words "not today". There is no failure state in the member UI.
3. **No streaks.** No streak counts, no streak-at-risk language, no fire emoji,
   no "don't lose your progress". Use consistency framing: "9 of the last 14
   days". This applies to the coach console too — coach vocabulary leaks into
   coach messages.
4. **Marigold `#D99A2B` is reserved exclusively for Deepika's human voice.**
   Coach messages and voice notes only. If it appears anywhere else, a member
   can no longer tell a human from the system at a glance.
5. **Provenance is always visible.** Every stored value carries a `Provenance`
   envelope and renders a chip: `member` / `coach · on behalf` / `device`.
   Coach-entered data must never be able to look member-entered. Enforced in
   `lib/types.ts` and `lib/store.tsx` (`submitPulse(…, byCoach)`).
6. **Radar rules stay human-readable and auditable.** Ten rules in
   `lib/radar.ts`, each with a one-sentence `trigger`, each individually
   switchable. No risk score, no model, no opaque ranking. If you add a rule,
   add a plain-language trigger with it.
7. **Observe → Coach → Refer.** The product observes symptoms and trends,
   coaches behaviour, and refers anything medical. It must never:
   - diagnose a condition or a hormonal state
   - interpret a lab value
   - advise on hormone therapy, medication, or supplements
   - issue individualised nutrition prescriptions or numeric macro targets
     (e.g. "1.2 g/kg protein" is out of scope — general education is in scope)
   Modules carry `reviewNote` and `coachPlaybook.escalation` for this reason.
8. **No wearable dependency.** Every input must work manually. The target
   cohort mostly owns closed-ecosystem Indian smartwatches with no usable API.
9. **The home screen is a decision screen, not a dashboard.** Today answers
   "what should I do today?". Raw metrics live in Progress or behind context.
10. **Never imply AI that does not exist.** No sparkle icons on rule-derived
    suggestions. V0 has no AI and `docs/PROJECT-BRIEF.md` §18 defers it.

---

## Stack and commands

Next.js 14 (App Router) · TypeScript · Tailwind · React context + `localStorage`.
No database, no env vars, no secrets.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # must pass before any commit
```

Deploys to Vercel (import repo, zero config) or Railway (`npm start` reads
injected `PORT`).

Fonts load via `<link>` in `app/layout.tsx`, deliberately not `next/font` —
build-time font fetching turns a transient network blip into a failed deploy.
Keep it that way.

---

## Code map

```
app/
  page.tsx                  Landing / role chooser
  member/                   Mobile-first, phone shell, 5 tabs, persona switcher
    page.tsx                Today (M06) — the most important screen
    journey|movement|progress|coach/
    action/[id]/            Minimum→Target→Stretch completion
    workout/[id]/           Session + RPE + pain flag
    module/[id]/  reflection/
  coach/                    Sidebar console
    page.tsx                Radar (C01) — the screen that makes this valuable
    members/[id]/           Member 360 + Assessment + Journey builder
                            + Week planner + Session prep (C03–C08)
    sessions|library|messages|notifications|feedback/
lib/
  types.ts                  Domain model + Provenance envelope
  seed.ts                   6 personas, 14 modules, 3 workouts, plans, messages
  radar.ts                  10 rules + evaluator
  store.tsx                 Context, localStorage, all mutations
components/
  ui.tsx                    EffortRamp, ProvenanceChip, ConsistencyBand, Sparkline
  PulseCard.tsx             Daily Pulse (member + coach-on-behalf modes)
```

**Design tokens** live in `tailwind.config.ts` with comments explaining what
each colour means semantically. Read those comments before adding a colour.

---

## Conventions

- **Copy is product surface, not filler.** Write in the member's language, not
  the system's. "Not today" not "Skipped". "Needs attention" not
  "Non-compliant". Never write copy that makes a woman feel behind.
- **Seed data is opinionated on purpose.** Radhika has had a genuinely bad
  week, Anita has gone quiet, Priya has just returned after five days. Deepika
  reacts far more usefully to real situations than to placeholder names.
  Preserve that property when extending.
- **Accessibility floor:** 17px base, `.tap` class for 44px targets, visible
  keyboard focus, `prefers-reduced-motion` respected. The audience is 38–50.
- Verify with `npm run build` before committing. It type-checks.
- After changing `lib/radar.ts` or `lib/seed.ts`, confirm all ten rules still
  fire — the four Radar buckets should all be populated.

---

## Working with Deepika's feedback

Feedback will arrive as reactions, not specifications. When she says something
feels wrong:

1. Log it in the in-app Pilot Feedback board (`/coach/feedback`) so the trail
   survives the conversation.
2. Check it against the invariants above before building. If a request
   conflicts with one, say so and explain the reasoning — several invariants
   exist precisely because the intuitive design choice is the harmful one.
3. Prefer changing seed data or copy over adding features. Most "this feels
   wrong" reactions at V0 stage are about tone and content, not structure.

Current backlog and priorities: `docs/PROJECT-BRIEF.md` §Backlog.
