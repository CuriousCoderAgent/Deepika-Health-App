# Bharosa — product direction

A brief for whoever is building the mobile app, written 19 Aug 2026. It applies
whichever shell ships (Expo native or the TWA); the product is the same either
way.

Read `docs/PROJECT-BRIEF.md` for the research this rests on. This document is
about what to build next and, just as importantly, what not to.

---

## 1. The thesis, in one paragraph

**Deepika provides the intelligence and the human relationship. The software
provides memory, structure, visibility, reinforcement and continuity.** People
do not stay because the app is clever. They stay because a real person knows
what happened in their week. Every feature decision should ask: *does this make
the coaching relationship work better, or is it just app surface?*

The north star is **not app opens**. It is useful health behaviour, sustainable
adherence, and graceful return after imperfect days.

---

## 2. Where the mobile app is today

Checked against `agent/add-android-mobile-app` at commit `029f5b2`.

Five tabs. **Today** works properly — she can complete an action at three
effort levels and log her daily pulse. **Journey**, **Progress** and **Coach**
are read-only views of the member document. **Profile** signs out and links to
the web policies.

That is a real, working app, and the auth is well made. But measured against
the web product, the phone can do about a fifth of what a member can do.

### Missing entirely on mobile

| Capability | Why it matters |
| --- | --- |
| **Sign-up** | Login only. She must create the account on the web first, then install the app. Two systems to explain in one WhatsApp message. |
| **Onboarding** | Someone who signs up but hasn't answered the first-run questions lands in an empty Today with no prompt. |
| **Replying to the coach** | She can read Deepika's messages and cannot answer. This is the single strangest gap — the coach relationship *is* the product, and the phone is where she'd actually reply. |
| **Food / protein logging** | The most-used daily surface on web. |
| **Workout logging** | Including effort rating and the pain flag, which is a safety signal. |
| **Weekly reflection** | The input Deepika reads before a 1:1. |
| **Reading / articles** | The whole education layer. |
| **Report upload** | Blood work and body composition. |
| **Account deletion** | **Play Store rejects without it.** Links out to a page that explains the process but nothing performs the deletion. |

**Order to close them:** account deletion (blocks launch), replying to the
coach, food logging, sign-up + onboarding, workout logging, then the rest.

---

## 3. What makes this a modern product rather than a form with a database

Ordered by real impact, not novelty.

### 3.1 Make logging almost free — the highest-leverage thing on this list

The number-one reason health apps get abandoned is that logging is tedious.
Nothing else here matters as much.

- **Food by natural language.** She types or speaks *"two rotis, dal, a bit of
  bhindi"* and gets structured entries with protein estimates she can correct.
  Today she taps through a picker. This alone could be the difference between
  a member who logs for three weeks and one who logs for twelve.
- **Food by photo.** Point the camera at the plate, get a first guess, correct
  it. Native has the advantage here.
- **Voice for everything.** Driving, cooking, hands full. The audience is
  38–50 and busy.

### 3.2 AI that helps the coach, not that replaces her

- **Draft Deepika's replies.** She reviews, edits and sends — the message is
  always hers. This is the most valuable AI feature in the product, because
  Deepika's time is the constraint on the whole business.
- **Session prep.** Before a 1:1, a plain summary of what actually happened in
  that member's fortnight: what she logged, what she skipped, what she said.
- **Radar triage.** Rank who needs attention and why, in plain language.

### 3.3 AI that helps the member — carefully

- **Suggest questions to ask her coach.** *"You've mentioned waking at 3am
  three times this fortnight. Want to ask Deepika about it?"* This prompts a
  conversation with a human rather than answering for her. Safe, and it makes
  the coaching better.
- **Transcribe report photos into values.** Extraction, not interpretation —
  it saves typing numbers from a PDF.
- **Describe her own week back to her.** Purely descriptive: what she logged,
  how it moved. No advice.
- **Better reading matches.** Currently rule-based; this is a genuine fit for
  a model.

### 3.4 The line that does not move

**The software must not interpret her medical data for her.** No *"your iron
has improved, focus on protein"*. No AI answering a health question directly.
No generated training plan without Deepika in the loop.

Two reasons, and neither is about caution for its own sake. Deepika is
completing **ACE health-coach certification**, and ACE's own materials are
explicit that a health coach may not diagnose, interpret labs, or prescribe
treatment — software doing it under her brand puts her credential at risk.
And interpreting diagnostic results is regulated as the practice of medicine
in most jurisdictions, India included.

Recording numbers, trending them, and showing them to Deepika is fine — that
is already built. A coach looking at her client's results and talking about
them is fine. Software generating the interpretation and handing it to the
member is the thing to avoid.

If her certifying body or a lawyer says otherwise in writing, revisit it.
Until then, route every interpretive question to Deepika.

### 3.5 Notifications, done with restraint

The check-in reminder is the main retention lever, and the fastest way to get
uninstalled. Timed to her stated preference (already captured at onboarding).
Quiet, specific, skippable. Never guilt: *"Your evening check-in"*, not
*"You haven't logged in 3 days!"*

---

## 4. Adoption — an honest reframe

This will not go viral the way a consumer social app does, and chasing that
would damage it. Health coaching is a trust product with a human bottleneck.
What actually drives growth here:

1. **It works, and she tells her friends.** Word of mouth from real results is
   the entire growth engine for a coaching practice. Everything above serves
   this.
2. **A shareable progress card** — twelve weeks, her own milestones, no health
   data, explicitly opt-in. This is the one honest "viral" mechanic, and it
   only works if the underlying progress is real.
3. **Referral with intent.** "Invite a friend" makes sense only if Deepika has
   capacity. Which raises the actual strategic question below.
4. **Getting to first value in under five minutes.** Sign up, answer six
   questions, see a plan. Every extra step loses people.

**The real scaling question is not a feature.** Deepika can coach perhaps 30
people well. Beyond that the product has to become either multi-coach (other
coaches run their own cohorts on the same software) or group-programme shaped.
That is a business-model decision, and it should be made deliberately rather
than discovered when she is overwhelmed. Worth designing the data model for
multiple coaches now even if only one uses it — retrofitting that is painful.

---

## 5. Do not build these

Each was considered and rejected for a reason grounded in behavioural
research, not taste:

- **Streaks.** They punish exactly the person this product is for — the woman
  who has a bad fortnight. Losing a 40-day streak is a well-documented quit
  trigger. Progress is shown as *"9 of the last 14 days included at least one
  healthy action"*, which survives a bad week intact.
- **Leaderboards and social comparison.** Midlife health is not a competition,
  and comparison against other women is corrosive here.
- **Red failure states.** A missed day is "not today", not a red X. There is a
  dedicated `rest` colour token separate from `danger` precisely so a skipped
  action can never be styled as an error.
- **Badges and points.** Extrinsic motivation crowds out the intrinsic kind,
  which is the only kind that lasts twelve weeks.
- **Wearable dependency.** Do not require a device to get value. Optional
  integration later is fine; a gate is not.
- **Any UI implying AI exists before it does.** No fake "AI insights" panels.

---

## 6. Copy rules

Copy is product surface, not filler.

- Write in the member's language, not the system's: *"Not today"* not
  *"Skipped"*. *"Needs attention"* not *"Non-compliant"*.
- **Never write anything that makes a woman feel behind.**
- Deepika is a person in this app, not a brand. Copy naming her as the coach
  stays. The product is Bharosa; the coach is Deepika.
- Minimum is a real, valid success — not a consolation. The effort ramp is
  Minimum / Target / Stretch and Minimum is styled as a genuine win.

---

## 7. Accessibility floor

The audience is 38–50, often reading on a phone in poor light.

- 17px base font, never smaller than 12px for anything meaningful
- 44px minimum tap targets
- Visible keyboard focus, `prefers-reduced-motion` respected
- Contrast checked, not assumed — 4.5:1 for body text
- **Form inputs at 16px minimum**, or iOS Safari force-zooms on focus

---

## 8. If both apps continue

They must agree on: the API contract, what the privacy policy claims, what
deletion actually does, and the brand. Two apps describing different retention
policies for the same database is the kind of inconsistency that fails a store
review and, more importantly, is simply untrue for whoever reads the wrong one.

Only one should reach the Play Store. The package name is permanent once an
installed build exists.
