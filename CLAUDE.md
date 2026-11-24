# CLAUDE.md

Operational guidance for Claude Code working on this repository.
Read `docs/PROJECT-BRIEF.md` before making product decisions — it holds the
business context, the research the design rests on, and the prioritised backlog.

## The name is currently undecided (21 Aug 2026)

**Bharosa is a working name and is being replaced.** Deepika does not like it,
so it is on its way out — do not treat any occurrence of it in this repository
as final, and do not spend effort making it more consistent. When a name is
chosen it gets changed everywhere in one pass: app name, page titles, launcher
icon, notification sender, store listing, privacy policy, and the Android
package ID in `android/twa-manifest.json`.

Until then the string "Bharosa" stays where it is. Renaming twice is worse than
renaming once, and the package ID in particular is permanent from the first
install, so nothing ships under a placeholder.

**Deepika is the coach, not the brand.** Whatever the product ends up being
called, every line of copy naming her as the person doing the coaching stays
exactly as it is. She is not a brand in the app; she is the human on the other
end of it, and that is the whole thesis.

---

## There are two apps now (21 Aug 2026)

This repository is one of two products, and they are no longer variants of the
same thing:

**This app — Deepika's practice.** Coaching-led and individual. Deepika supplies
the judgement; the software supplies memory, structure, visibility,
reinforcement and continuity. Built with Claude.

**The other app — a separate, AI-centric product.** Built by Codex, driven by
the founder rather than by Deepika, aimed at a general market. It does not
carry Deepika's name and is not this product's future. Nothing in this
repository should be shaped around it.

**They share no backend and no database.** Codex's app is getting its own
Vercel deployment and its own Postgres. This matters beyond tidiness: the
records here belong to Deepika's clients, and a general-audience consumer app
must not be able to reach them. Do not add bearer-token auth, a public API, or
anything else whose purpose is to let another application log into this one.

### Where this app is going

The 20 pilot members are the first goal, not the whole ambition. The intended
path is that it grows past the people Deepika coaches one-to-one — members
sharing it with others who use the app without a direct coaching relationship
with her.

Two consequences worth holding in mind while building:

- **Not every future user will have Deepika.** Anything that only makes sense
  when a coach is reading it will need a considered answer for someone who has
  no coach. That is not today's problem, but it is the reason to keep the
  member experience coherent on its own rather than assuming a human backstop.
- **The data model should tolerate more than one coach.** Retrofitting that is
  painful, and the growth path above makes it likely rather than hypothetical.

What does **not** change: this app stays coaching-led. AI does not take over
the relationship here. That is the other app's premise, not this one's.

---

## What this is

A **V0 Vision Prototype** for Bharosa: coaching software for a women's
midlife health practice in India, built around Deepika's practice. Two surfaces — a member app and a coach
console — built so the founder (Deepika) can use them and react, rather than
answer more discovery questions.

It is **not** the Pilot MVP, but it is no longer only a demo: it has real
sign-in, per-account data, and optional durable storage, because the twenty
pilot members are going to use it. There is still no AI in it — do not add UI
implying otherwise.

**Product thesis:** Deepika provides the intelligence and the human
relationship. The software provides memory, structure, visibility,
reinforcement and continuity.

**North star:** do not optimise for app opens. Optimise for useful health
behaviour, sustainable adherence, and graceful return after imperfect days.

---

## Product defaults (revised 10 Aug 2026 — no longer hard invariants)

This used to be a numbered list of invariants requiring "an explicit decision
from the user" to touch. The user has now given that decision: this build is
for a small pilot of people Deepika already knows, not a public launch, and
these should be treated as the current starting point, not a fixed constraint.
Change any of them freely. The original reasoning (behavioural-change research,
mostly) is still written up in `docs/PROJECT-BRIEF.md` if useful context, it
just no longer blocks anything.

What used to be here: minimum-as-success styling, no red/no failure-state
colour, no streaks, marigold reserved for Deepika's voice, provenance chips,
Radar rules being plain-language and switchable, no wearable dependency, Today
as a decision screen rather than a dashboard. All open to revisit.

**One item is not on that list — see below.**

## Scope of practice: the one thing I'm holding on

Not a design preference, and not about audience size. Two separate facts, and
"it's a small pilot, not a public launch" doesn't change either of them:

1. Per `docs/PROJECT-BRIEF.md` §1, Deepika is completing **ACE health-coach
   certification**. ACE's own materials are explicit that a health coach may
   not diagnose, interpret labs, or prescribe treatment — that's a rule from
   the certifying body about what the *credential* permits, not a rule about
   deployment scale. Software that auto-generates "your iron levels have
   improved, focus on protein" for her clients puts that credential on the
   line exactly as much in a pilot of 20 as in a public launch.
2. Interpreting diagnostic lab results is regulated as the practice of
   medicine in most jurisdictions, India included. That's independent of
   which certifications a coach holds unless one of them is a medical licence.
   I don't know India's Clinical Establishments rules well enough to say
   precisely where the line sits — which is itself the point: this needs a
   real answer from whoever advises Deepika on her certifications, not a
   guess baked into shipped software.

The 20 pilot members are real women, not a demo audience — the small scale
makes this *more* exposed, if anything: it's Deepika's own network, not
strangers.

**What's already built and not blocked by any of this:** members can upload
blood reports; values are transcribed and trended; Deepika can see them,
message about them, and add coach notes in a 1:1 (`app/coach/members/[id]`
Assessment tab, `app/member/reports`). None of that is a diagnosis pipeline —
it's Deepika, using her own judgement, looking at a client's numbers, which
she's obviously allowed to do as a coach in conversation.

**What I'll hold off building:** a feature that has the *software itself*
generate the interpretation ("AI Summary: your iron levels have improved…")
and hands it to a member without Deepika in the loop. Same for anything UI
that implies AI exists when it doesn't yet — there's no backend in this repo
to hold an API key safely (see Stack below), so a real integration is a
separate scoping conversation, not a checkbox to remove.

If you get a straight answer from her certification body or a lawyer that
auto-generated interpretation is fine for this pilot, tell me and I'll build
it — this isn't me refusing to revisit it, it's me not wanting to guess on
her behalf on the one item here with a real person on the other end of a
wrong guess.

**One more thing worth 30 seconds:** is this prototype still "Deepika reacts
to a demo," or are the 20 pilot members actually going to log in and use it?
That changes whether DPDP genuinely doesn't matter yet (demo) or does (real
health data from real people, consent and deletion flows and all). Worth
being deliberate about which one this is before it ships either way.

---

## Stack and commands

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind · React context,
persisted to Postgres when `DATABASE_URL` is set and to `localStorage` when it
is not. Which Next.js release, and why: `docs/DEPLOYMENT.md` → *The Next.js
version*. Next 16 is newer than most of what anyone remembers about Next — the
docs for the installed version ship in `node_modules/next/dist/docs/`; read
those rather than going from memory of 14 or 15.

Storage is per account either way — one document per member, split and
rejoined by `lib/persist.ts`. `lib/db.ts` is server-only; importing it from a
client component would put the connection string in the browser bundle.

Accounts come from two places: the environment (`MEMBERS`, `COACH_PASSWORD`,
`AUTH_SECRET`), all with fallbacks so a deployment with nothing set still
opens on demo credentials; and the database, for members who signed
themselves up. Those fallbacks are public, so a deployment must never have
the database without `AUTH_SECRET` and `COACH_PASSWORD` — nothing in the code
stops it serving real records on the demo sign-in. `lib/accounts.ts` handles the second kind and is server-only.
`proxy.ts` (Next 16's name for middleware) imports from `lib/auth.ts` and never
from there: it runs ahead of every signed-in page and only has to check a
cookie's signature, while `lib/accounts.ts` reaches the database.
See `docs/DEPLOYMENT.md`.

**Signing in with Google** is built, and on in production since 24 November
2026: it appears only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are
both set (they are, for Production only), and with neither no screen mentions
Google. `lib/google.ts` (server-only) says how it works at
the top. Three rules it rests on: a Google account is matched to an account
here by Google's id for it, never by email address; signing in never creates
an account — only "Create your account" does, join code included; and
connecting Google to an existing account asks for the password first.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # must pass before any commit
npm run lint     # ESLint; next build no longer lints
```

`.claude/settings.json` lets the routine checks run without a permission prompt
in a Claude Code session: the build, the logic tests, the end-to-end checks,
lint, the type-check, the dev server, the website build (`node build.mjs` in
`website/`) and read-only git. Nothing that commits, pushes, installs, deploys
or reaches a real database is on that list — the end-to-end checks make their
own database and delete it — and it should stay that way. It is there to save
prompts on checks, not to get round one.

Deploys to Vercel (import repo, zero config) or Railway (`npm start` reads
injected `PORT`). Either needs Node 20.9 or later; Vercel builds on 24. After a
deploy, `/api/health` says whether the app reached
its database — and opening it is what makes the tables, and applies any change
to them (`MIGRATIONS` in `lib/db.ts`), instead of the first member doing so.

Fonts load via `<link>` in `app/layout.tsx`, deliberately not `next/font` —
build-time font fetching turns a transient network blip into a failed deploy.
Keep it that way.

**Two doors stay shut on Next 16**, because the worst Next.js advisories keep
coming through them and the app uses neither: the image-resizing address
(`next.config.mjs`) and POSTs to a page (`proxy.ts`, `app/api/[...missing]`).
On Vercel the first is answered by Vercel's own image service, ahead of the
app — only the empty allow-list in `next.config.mjs` stops that, and only
opening the address on a deployed build shows whether it has.
So: no Server Actions, no `<form>` that posts to a page, no `next/image` — not
without opening that door on purpose and changing `tests/e2e/refused.mjs`
with it. Every save goes to a route under `/api`. The reasoning, with the
advisories behind it, is in `docs/DEPLOYMENT.md` under "The Next.js version",
and `tests/e2e/refused.mjs` checks the doors stay shut. (The other rules from
the Next 14 days — no rewrite to another host, no `fetch` in server code — are
lifted; the advisories behind them are fixed in 16.)

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
  radar.ts                  12 rules + evaluator, and what "Handled" means
  dayView.ts                One day of one member, read the same way everywhere
                            (Today's history, Insights, Deepika's week view)
  store.tsx                 Context, localStorage, all mutations
  calendar.ts               Dates in India time; the one definition of "today"
  dailyPlan.ts              Roll a member forward a day; build today's actions
  workoutLog.ts             One record per session and day; saving again corrects
                            it, and when that counts as a new pain flag
  starterPlan.ts            The 12-week plan a new member starts on
  privacy.ts                What a member may read/write of her own document
  foodParse.ts              "2 rotis and dal" → entries she checks; a word matcher, not AI
  reminders.ts              When a check-in reminder goes out and what it says (pure)
  push.ts                   Web Push sending and VAPID keys — server-only
  google.ts                 Signing in with Google: the attempt, the checks on
                            what Google says, a username from a name — server-only
  sessionCookies.ts         The one place a session is started, whichever way in
  replyDrafts.ts            Drafts for Deepika's messages, suggested by the Radar
  display.ts                Members by name in the console; initials behind the
                            privacy screen (privacyScreen.ts, per device); and
                            she / he / they for a member — pronouns()
  useWidth.ts               A chart's real pixel width, so it is drawn, not stretched
components/
  ui.tsx                    EffortRamp, ProvenanceChip, ConsistencyBand, Sparkline
  charts.tsx                TrendRows, Columns, StatTile, DataTable — Insights
  BottomSheet.tsx           Every sheet. Read its comment before changing focus
                            or visibility: both broke the Today screen once
  QuickDone.tsx             Mark an action done from Today: three sizes, not
                            today, Undo. Sessions go to the session page
  DayHistory.tsx            Her last 14 days; yesterday can still be marked
  Toast.tsx                 "Recorded" / "Handled", with Undo — both sides
  QuickFind.tsx             Deepika's jump-to-a-member (/ or Ctrl+K)
  HerWeek.tsx               Her last 7 days, a row each, on the member page
  PulseCard.tsx             Daily Pulse (member + coach-on-behalf modes)
  MealText.tsx              Type what you ate → check → add
  Reminders.tsx             Reminder setting; ReminderPrompt / InstallPrompt are
                            the one-time offers on Today after a check-in
  MemberName.tsx            A member's name in the console, or her initials
  GoogleConnection.tsx      Connect / disconnect Google, on Your account
tests/
  logic.test.mjs            The rules with no browser: dates, the daily plan,
                            the Radar, privacy (npm run test:logic)
  e2e/                      The app in a browser against a throwaway Postgres
                            (npm run test:e2e) — read its README first
```

**Time.** Every record is a `dayOffset` from the date in `member.anchorDate`, and
loading a member on a later day shifts them all forward. The seeded sample
cohort has no anchor and is frozen on purpose — never roll them. Anything that
needs "today" calls `dateKey()` from `lib/calendar.ts`, which is India time, not
the viewer's clock.

**Coach-private data.** A member's document also holds Deepika's private notes
and plan drafts. They must never reach the member: `lib/privacy.ts` strips them
on read and refuses them on write. Anything new that Deepika keeps about a member
and the member must not see belongs there too.

`website/` is the public launch site — a separate static project, not part of
the Next app. Own deployment, own domain, no scripts or cookies. The product
name lives in `website/site.config.json`, so the rename is a one-line change
there. See `website/README.md` for the launch checklist. Its copy describes
only what this app really does; if a feature changes, change the page.

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
- After changing `lib/radar.ts` or `lib/seed.ts`, run `npm run test:logic` — it
  checks that the sample cohort still fills all four Radar buckets. There are
  now twelve rules; R11 (a new member who has not been greeted) only ever fires
  for real members, never the sample cohort, and nobody in the sample cohort
  has flagged pain (R12).
- Run `npm run test:logic` as well as `npm run build` before committing.
- Run `npm run test:e2e` as well when the change touches a screen a member or
  Deepika uses, or what gets saved: Today, a sheet, the session page, the
  Radar, the store, signing in. It takes about two minutes, makes its own database,
  and cannot reach a real one (`tests/e2e/README.md`). When a bug gets through
  it, add the check that would have caught it.
- **A promise on her screen needs a rule on Deepika's.** The session page told a
  member who flagged pain that Deepika would see it first and to wait for a
  reply — for months nothing told Deepika. If member copy says Deepika will
  see, read or reply to something, check that the console actually raises it.
- **"Handled" means this one.** A Radar flag about one thing (a session, a
  message, a pain flag, a symptom report) carries that record's id; a flag
  about a pattern comes back after a week if still true. Never key a flag on
  a count or a day offset — both change overnight. See `lib/radar.ts`.
- **Not every member is "she".** Onboarding asks, and offers Man and Other. A
  sentence in the console about one member takes its words from
  `pronouns(member)` in `lib/display.ts` — "they" for anyone who was never
  asked. Copy about members in general says "a member". Text a member reads
  about herself — the module library above all — is written with no "she" in
  it at all. Deepika is still "she": that is who she is, not an assumption.
  `npm run test:logic` reads the console's source for a pronoun typed straight
  into a string — an error an API route sends to the console counts too.
- **A rating of 0 means "not rated".** The one-tap mood saves sleep as 0. Any
  rule or sentence that reads sleep has to skip it (`lowSleepNights` in
  `lib/dayView.ts`), or a mood-only check-in reads as a bad night.
- **Look at screens with animations on.** Checks run with reduced motion hid a
  sheet that pushed the whole phone frame up for everyone else. Reduced motion
  is for stable screenshots; `reducedMotion: "no-preference"` is what members
  have, and a flow is not checked until it has been run that way.
  `npm run test:e2e` runs the flow with animations on and every sheet both ways.

---

## Working with Deepika's feedback

Feedback will arrive as reactions, not specifications. When she says something
feels wrong:

1. Log it in the in-app Pilot Feedback board (`/coach/feedback`) so the trail
   survives the conversation.
2. Check it against Scope of practice above before building — that's the one
   item still worth pausing on. Everything else in Product defaults is fair
   game to change on request.
3. Prefer changing seed data or copy over adding features. Most "this feels
   wrong" reactions at V0 stage are about tone and content, not structure.

Current backlog and priorities: `docs/PROJECT-BRIEF.md` §Backlog.
