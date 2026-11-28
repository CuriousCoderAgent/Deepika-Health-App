# Pilot feedback — running log

Raw feedback as it arrives, with what was found in the code when it was
checked. Round 2 is open: nothing in it is built. Round 1 has shipped and is
kept for the reasoning.

Sorted roughly by size, not by the order they were given.

---

## Round 2 — 28 Nov 2026 — open, nothing built

**Where it came from.** A recorded mock of Deepika's first call with a client
(36 minutes), with Eshan as the client and then giving feedback on the call.
This is the first time her method has been said out loud end to end, so it is
logged as what the practice *is*, not only as reactions to screens.

Two things are deliberately not here: what the client said about himself, which
was personal and is not product input, and a spreadsheet Deepika made for
herself, which was mentioned and has not been seen. Items 3 and 5 wait on it.

Times in brackets are positions in the recording. Hindi is quoted as it was
transcribed, which the transcript itself marks as close rather than exact.

### 1. The programme has a name: "Project You"

> "This is Project You." (01:18)
>
> "As busy professionals we focus on so many areas. There are many projects: we
> have the office, we have the house project, we have the kid project. But we
> forget to focus on ourselves." (04:35)

**Status:** a decision, not a build. `CLAUDE.md` has said since August that
"Bharosa" is a working name waiting to be replaced. This may be the
replacement, or it may be the name of the programme inside an app that is
called something else. Only Deepika and Eshan can say which.

If it is the app's name, it is the one-pass rename `CLAUDE.md` describes:
`lib/brand.ts`, page titles, the launcher icon, the notification sender, the
store listing, the privacy policy, `website/site.config.json`, the Android
package ID, and one place added since — the app name on Google's consent
screen. The package ID is permanent from the first install, so the name has to
be final before the Android app ships, not after.

### 2. Four to six months, not twelve weeks

> "…what are the key areas we need to focus on in the next four or five
> months." (00:53)
>
> "For the next four to five months, or six months, we are going to focus on
> ourselves." (05:22)

**Status:** a mismatch to settle before more is built on either side of it.

Everything in the app is a twelve-week journey: `lib/starterPlan.ts` is weeks
1 to 12 in three phases, the Journey screen is headed "12-week foundation
journey — Week N of 12", and week 12 is "Review what held without daily
coaching". Deepika describes a programme
of four to six months with goals set for three to six.

Two ways to reconcile them, and they are different products: the twelve weeks
are one cycle and a member goes round again with new goals; or the journey is
one longer arc and the three phases stretch. The first needs almost no model
change. Worth asking her which she means.

### 3. One primary goal, one secondary, three at most — and never a date

> "Let's pick up a primary goal and a secondary goal… We can have three goals
> max, not more than that." (25:12, 25:51)
>
> "I'm not putting any time goal here. But continuously, every one month, we'll
> try to monitor… how it is going." (26:55)
>
> "Whenever we add a time bound thing, we are going to work towards it, but we
> cannot commit." (26:55)

**Status:** not built. The largest item in the round.

Goals today are `Member.goals`, a list of sentences. Onboarding step 3 offers
six ("Stop feeling wiped out by the afternoon", "Get my strength back"…) and a
member may tick all of them. Nothing says which matters most, nothing says how
anyone would know it had moved, and nothing brings it back for a monthly look.
They are also feelings, where hers are outcomes: a distance run, a
measurement.

What it would reach: the member type, onboarding step 3, the Journey screen,
the coach's Overview ("What she is trying to get to") and Session prep, and a
monthly prompt on the Radar. A goal with a number attached is a number the
member or Deepika types and the app draws over time — stored and trended,
never judged and never given a deadline by the software. That is her rule as
well as the scope rule.

Smallest honest version: on the member's page Deepika marks one goal primary
and one secondary during the first call, each with a line in her own words
for how they will know. The member sees them at the top of Journey. Once a
month the Radar asks Deepika to look at them again.

### 4. Outcomes become behaviours: one to three a week

> "Outcome driven goals can happen only when you add some behaviour goals."
> (27:41)
>
> "We'll pick two habits, two behaviours every week." (35:44)

**Status:** mostly here already, under other names.

A week's focus lines and the daily actions of its modules, each with a
Minimum, a Target and a Stretch, are behaviour goals. What is missing is the
thread back: nothing records which goal a behaviour is for, and every new
member starts on the same twelve weeks whatever she chose in onboarding
(`lib/starterPlan.ts` says so itself: it is there so that Today is not empty
until Deepika has made the plan hers).

Follows item 3. Once goals have a primary and a secondary, the Journey builder
can show them beside the week being planned.

### 5. The intake form should be multiple choice, and goals should fall out of it

> "The form that you have created needs to be in MCQ format, so that they are
> able to select the relevant options." (35:12, Eshan)
>
> "Main bas multiple choice questions hi rakhungi." (34:34, Deepika)

**Status:** waiting on her form.

The app's first-run flow is already mostly multiple choice — life stage,
goals, what gets in the way — but it is not her form. Hers lives outside the
app: in the call she reads from "your intake form" and "the chart", and she
reads the client's values back to him, which the app never asks for. Until
her form has been seen there is nothing to map.

Once it has: each option pointing at the goals it suggests is a table Deepika
writes once, and the app reads it. That needs no AI (see item 6), and it keeps
the choice hers — the form proposes, she confirms in the call.

### 6. "The agent"

> "An agent can help you with [that]…" (35:12)
>
> "Maybe the agent will help you there also, to create these behavioural
> goals." (35:59)
>
> "The agent will make a note for me." (36:21)

**Status:** three different jobs, and only one of them is AI.

- **Goals from the form.** A lookup from answers to suggestions (item 5). No
  AI.
- **Behaviours for a goal.** Her module library already holds them. Offering
  the modules that fit a goal is the same kind of rule as the reply drafts the
  Radar suggests (`lib/replyDrafts.ts`). No AI.
- **Notes from a call.** Turning a conversation into notes is AI, and it is
  the one that needs a decision. A member's voice and what she says about her
  health would go to an outside provider. The privacy page promises today that
  nothing is used to train anything and names the only outside parties
  involved; this would add one, and recording a call needs her to have agreed
  to it. The same is true if a call is recorded and run through an AI tool
  outside the app: it is her data either way.

Against `CLAUDE.md`: there is no AI in the app and no screen may imply there
is; this app stays coaching-led. An assistant that drafts for Deepika and
never speaks to a member is inside that line. It is still a scoping
conversation of its own, with the privacy notice and consent as part of it,
not something to add quietly. Until then the Notes tab takes notes typed or
pasted in.

### 7. A line of her own, seen every day

> "Go home, write a line for yourself and post it somewhere in front of you: on
> your desk, on a notepad, in your phone. And look at it every morning and
> every night." (24:28)

**Status:** not built, small, and the app is the phone she means.

Nothing holds it. Journey shows her goals and "what I will not do"; Today
opens on a greeting and Deepika's note.

Smallest honest version: one sentence the member writes, shown at the top of
Journey and quietly on Today, visible to Deepika on Overview. Her words, never
reworded by the app. The longer vision she is asked for in the call (one,
five, ten years on) and her values could live beside it; worth asking Deepika
whether she wants them kept or only spoken.

### 8. Being answerable: a nudge at a time she chooses

> "If in your app I can get a check, you know, 'have you stopped working at
> 10?'… If I'm answerable to someone, I'll also be mindful." (29:45, as the
> client)
>
> "Ab agar yeh karne baithu ki main har client ke saath… to phir to mujhe
> bahut zyada kaam karna padega." (32:24, Deepika, on analysing each client's
> triggers by hand)

**Status:** not built. Wanted by the client and by the coach for different
reasons, and one part of it the hosting cannot do today.

What exists: one check-in reminder a day, morning or evening
(`lib/reminders.ts`), under the rules shown on her console — no guilt, never
a health detail on a lock screen, fewer the quieter someone goes. "Not today"
already asks why and offers five reasons, and Session prep already lists
"Reasons she gave". So part of the pattern-spotting Deepika does not want to
do by hand is collected now.

What is new: a nudge tied to one behaviour, at a time the member picks,
answered with one tap, with the answer in front of Deepika.

Two things to hold:

- **The tone.** In the recording the client says that after a couple of misses
  he would "feel ashamed" and comply. The brief's whole design answers the
  opposite fear — members leaving out of guilt and shame
  (`docs/PROJECT-BRIEF.md` §1 and §2).
  What the research supports is being answerable to a person who is on your
  side, not being told off by an app. So: the answer goes to Deepika, a missed
  one is never counted up, and the wording stays inside "No guilt copy".
- **The clock.** Reminders are sent by two scheduled jobs a day, at about
  07:30 and 19:30 India time (`vercel.json`), and that scheduler only promises
  the hour. A nudge at 10:15 pm needs finer timekeeping. Vercel's newer
  Schedules are documented as running as often as every fifteen minutes on
  the current plan, with up to fifteen minutes of drift — close enough for
  "around quarter past ten". That is from its documentation, read on 28
  November, and has not been tried here.

### 9. The first call: say what it is beforehand, and keep it to health

> "We give them a precursor of what is going to happen in this session."
> (32:52, Eshan)
>
> "I'm going to send out an email that this is what we're going to do." (33:10,
> Deepika)
>
> "To main wellness wheel to hata hi deti hu." (33:46, Deepika)

**Status:** one draft to write, and one thing not to build.

Deepika's own conclusion from the mock was to narrow the first call: goals
already drawn from the form, then what is in the way and what has been tried
before, then exercise, then food, then two behaviours for the week. The
wellness wheel comes out of session one — "maybe one month down the line".

In the app: the draft the Radar offers for a new member (R11, "Hello") says
nothing about a first call. A second draft, "Before our first call", in her
words, is copy and not a feature. And nothing about the wheel is built now.

### 10. What stays Deepika's and never becomes the software's

Checked against the scope-of-practice section of `CLAUDE.md`, because three
moments in the call sit close to it:

- A blood report used to choose what to work on in nutrition (28:31), and a
  marker mentioned by name (20:11). That is Deepika's own judgement in
  conversation. The app stores a value and draws it over time; it never says
  what a value means. ACE's list of what a coach may not do includes
  interpreting labs, so how far she takes this in a call is worth her
  checking with them — the position in `CLAUDE.md` is unchanged.
- A waist measurement and a body-fat figure as goals (26:24). Fine to record
  and trend. Never a target the app computes.
- The other pillars — emotional, financial — and "a counselling session or a
  psychotherapist" (18:24). In the app that is a referral, not content. The
  referral network is already on the Pilot MVP gate in the brief.

### 11. Who it is for

> "I'm looking at women 30 plus or 40 plus… you might be struggling with
> postpartum weight… early signs of perimenopause or entering menopause."
> (04:04)

**Status:** two small differences from what is written down.

The brief says 38 to 50; she says 30 plus. And "postpartum" is not among the
five answers to "Where you are right now" for a woman
(`app/onboarding/page.tsx`), which are all about the cycle. The mock client
was a man, which Round 1 already made workable.

---

## Round 1 — 10 Aug 2026 — all shipped

Kept for the reasoning, and because three of these turned out to be different
from what the report assumed.

### 1. Men should be able to create accounts

> "Options for men should also be there in the app to make an account. This app
> targets women TG but is not restrictive in nature. So maybe asking the gender
> before we begin the data capturing."

**Status:** shipped. The largest item in the round — a positioning
change, not a field.

Signup takes name, username and password, with no gender question. Nothing
blocks a man signing up today; what happens is that the app then talks to him
as if he were a woman in midlife.

What a gender question would have to reach:

- **Onboarding step 3** asks "Where you are right now" with five options that
  are all menstrual-cycle states ("My cycle is regular", "I think I'm in
  perimenopause"…). For a man this screen is not merely irrelevant, it is
  unanswerable — and it is a **required** step, so he cannot get past it.
- **Radar rules** R05 fires on reported symptoms including night waking and hot
  flushes; the seeded symptom vocabulary is perimenopausal throughout.
- **Article matching** selects on midlife-women topics.
- **Copy across the member app** uses "she"/"her" in places, and the seeded
  cohort is six women.
- **`docs/PROJECT-BRIEF.md` and `CLAUDE.md`** both frame the product as a
  women's midlife health practice. Widening the audience is a decision that
  belongs in the brief, not only in the signup form.

Open question worth settling before building: is the intent *"men can use it
and the app adapts"* (branch the life-stage questions, neutralise the copy,
different article set) or *"men can create an account and get the general
health parts"*? Those are different amounts of work and different products.

Smallest honest version: ask gender at signup, branch the life-stage step so
non-women get an age/life-context question instead of a cycle question, and
neutralise the copy that assumes a woman. That is enough to make the app usable
rather than merely enterable.

### 2. Landing line is too narrow

> "Can't say on the front page that app is for women in their forties. Think of
> a better line which caters to people who want to be awakened towards healthy
> living."

**Status:** shipped.

Current line, `app/page.tsx`:

> "Strength, energy and steadiness through your forties and beyond — with
> someone who actually knows you."

Pairs with item 1 — same decision, different surface. The replacement should
keep the thing that makes this product different (a real coach who knows you,
not an app that tracks you) without naming an age or a gender.

### 3. Deepika cannot sign out on a phone or tablet

> "Signout for Deepika account"

**Status:** shipped. **This was a real bug, not a discoverability problem.**

`app/coach/layout.tsx` has sign-out in the desktop sidebar (line 38) — but that
sidebar is `hidden … lg:flex`, so it disappears below 1024px. The mobile nav
that replaces it (line 90) has the six navigation links and **no sign-out at
all**. On a phone or a small tablet Deepika is signed in with no way out short
of clearing cookies.

Where it does exist, on desktop, it is `text-xs text-ink-faint` with a
back-chevron at the very top of the sidebar, which reads as "go back" rather
than "sign out".

### 4. Sign-out in the member app is invisible

> "Signout button?"

**Status:** shipped. It existed; nobody could tell.

`app/member/page.tsx` line 112: the circular button in the top-right of Today
showing her first initial is a sign-out button. It carries `aria-label="Sign
out"` and a `title`, so a screen reader announces it correctly — but visually
it is a letter in a circle, which every other app on her phone has taught her
means "profile", not "log out".

That she asked the question is the finding.

### 5. "Good morning" at night

**Status:** shipped.

`app/member/page.tsx`, the `greeting()` helper: all three branches return
`Good morning, ${name}.` — hardcoded, with no reference to the clock. It says
good morning at 11pm.

Note when fixing: the phone's clock is the member's local time, which is what
we want here. The rest of the app works in `dayOffset` from a fixed seeded
"today", so this should read the real clock without disturbing that.

### 6. Age field turns into 0

> "0 already there where age needs to be written"

**Status:** shipped. Two causes, not one — see below.

`app/onboarding/page.tsx`: the field is `type="number"` with
`onChange={(e) => setAge(Number(e.target.value))}`. `Number("")` is `0`, so the
moment she clears the pre-filled 45 to type her own age, the field shows `0`.
She then types after it, or deletes it again — either way the first thing the
app does when she touches it is put a nonsense number in front of her.

Two things to fix together: hold the field as a string so empty stays empty,
and reconsider pre-filling 45 at all. A guessed age she has to clear before
answering is a small insult on the first screen that asks her anything.

### 7. "per katori" → "per bowl"

**Status:** shipped. Mechanical, and the smallest item here.

21 occurrences in `lib/seed.ts` (food portion labels) and one in
`app/member/food/page.tsx` line 444 (the helper text: "a katori of dal is…").

Worth deciding once: "bowl" everywhere, or "bowl (katori)" on first use. Katori
is the more precise word for the portion actually meant, and the audience knows
it — but if it reads as jargon to the people being shown the app, precision
loses.

### 8. Bottom navigation in Teams purple, active tab turquoise

> "Change the bottom button colors to purple, as in used by MS Teams purple.
> Whichever button is pressed should turn to turquoise."

**Status:** shipped.

Currently `app/member/layout.tsx`: five tabs, active is `text-effort-stretch`
(the deep green), inactive `text-ink-faint`. They are icon-and-label, not
filled buttons.

- Teams purple is **#6264A7**.
- Turquoise needs care. Plain `#40E0D0` fails contrast badly for text or icons
  at this size — a deeper turquoise around **#0F9B94** holds up. Worth checking
  against the 17px/44px accessibility floor in `CLAUDE.md` before it ships.

To confirm when building: purple as the *icon and label colour*, or as a filled
bar behind the nav? "Button colours" could mean either, and they look very
different on a phone.

Also worth flagging: the palette in `tailwind.config.ts` is semantic — the
greens are effort levels (minimum / target / stretch), and the same green is
used for the active tab and for "you hit your target". Introducing purple and
turquoise into the navigation splits navigation colour away from meaning
colour, which is defensible and probably an improvement, but it should be a
deliberate split rather than two palettes that drifted apart.

---

## What the build changed against the report

**Item 6 had a second cause.** Holding the age as a string fixed the 0 that
appeared when the field was cleared, but new members were still landing on a
pre-filled 45, because `newMember()` in `lib/emptyState.ts` set that as a
default. Both are gone: the field starts empty and onboarding will not advance
without a real answer between 18 and 99.

**A layout bug surfaced next to it.** The "Your age" caption and its input
overlapped. `.label` carries no display rule of its own and this is the only
place it is used on a `<label>` rather than a `<p>`, so the element stayed
inline and the input's top margin pulled it up over the text. It had been
there as long as the field has.

**The nav needed more than a hue swap.** With every tab a saturated purple,
colour alone no longer said which one you were on — the old design leaned on
faint grey for inactive to make the active one pop. The active tab now also
gets a tinted pill behind its icon and a heavier stroke.

**Item 8's turquoise is not the obvious turquoise.** #40E0D0 measures 1.8:1 on
white, unreadable at the 10px the tab labels use. #0B7F7A measures 4.9:1 and
reads as the same colour.

**Nothing needed neutralising in the member copy.** Every "she" and "her" in
the member surface refers to Deepika, who is a woman; the app addresses the
member as "you" throughout. Article matching keys off life stage, so the
branched question keeps perimenopause content away from anyone who did not
select those options, with no separate change.
