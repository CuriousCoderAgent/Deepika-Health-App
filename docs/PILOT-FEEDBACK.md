# Pilot feedback — running log

Raw feedback as it arrives, with what was found in the code when it was
checked. Nothing here is built yet. Items move out of this file when they ship.

Sorted roughly by size, not by the order they were given.

---

## Round 1 — 10 Aug 2026

### 1. Men should be able to create accounts

> "Options for men should also be there in the app to make an account. This app
> targets women TG but is not restrictive in nature. So maybe asking the gender
> before we begin the data capturing."

**Status:** not started. This is the largest item in the round — a positioning
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

**Status:** not started.

Current line, `app/page.tsx`:

> "Strength, energy and steadiness through your forties and beyond — with
> someone who actually knows you."

Pairs with item 1 — same decision, different surface. The replacement should
keep the thing that makes this product different (a real coach who knows you,
not an app that tracks you) without naming an age or a gender.

### 3. Deepika cannot sign out on a phone or tablet

> "Signout for Deepika account"

**Status:** not started. **This one is a real bug, not a discoverability
problem.**

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

**Status:** not started. It exists; nobody can tell.

`app/member/page.tsx` line 112: the circular button in the top-right of Today
showing her first initial is a sign-out button. It carries `aria-label="Sign
out"` and a `title`, so a screen reader announces it correctly — but visually
it is a letter in a circle, which every other app on her phone has taught her
means "profile", not "log out".

That she asked the question is the finding.

### 5. "Good morning" at night

**Status:** not started.

`app/member/page.tsx`, the `greeting()` helper: all three branches return
`Good morning, ${name}.` — hardcoded, with no reference to the clock. It says
good morning at 11pm.

Note when fixing: the phone's clock is the member's local time, which is what
we want here. The rest of the app works in `dayOffset` from a fixed seeded
"today", so this should read the real clock without disturbing that.

### 6. Age field turns into 0

> "0 already there where age needs to be written"

**Status:** not started. Cause identified.

`app/onboarding/page.tsx`: the field is `type="number"` with
`onChange={(e) => setAge(Number(e.target.value))}`. `Number("")` is `0`, so the
moment she clears the pre-filled 45 to type her own age, the field shows `0`.
She then types after it, or deletes it again — either way the first thing the
app does when she touches it is put a nonsense number in front of her.

Two things to fix together: hold the field as a string so empty stays empty,
and reconsider pre-filling 45 at all. A guessed age she has to clear before
answering is a small insult on the first screen that asks her anything.

### 7. "per katori" → "per bowl"

**Status:** not started. Mechanical, and the smallest item here.

21 occurrences in `lib/seed.ts` (food portion labels) and one in
`app/member/food/page.tsx` line 444 (the helper text: "a katori of dal is…").

Worth deciding once: "bowl" everywhere, or "bowl (katori)" on first use. Katori
is the more precise word for the portion actually meant, and the audience knows
it — but if it reads as jargon to the people being shown the app, precision
loses.

### 8. Bottom navigation in Teams purple, active tab turquoise

> "Change the bottom button colors to purple, as in used by MS Teams purple.
> Whichever button is pressed should turn to turquoise."

**Status:** not started.

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

## Notes on sequencing

Items 3, 5, 6 and 7 are small, independent and safe — they can go out as one
pass without waiting for anything.

Items 1, 2 and 8 all depend on decisions that are not mine to make: who the
product is for, and what the navigation should look like. Worth settling those
before writing code for any of them, since 1 and 2 are the same decision seen
from two screens.

Item 4 is small but its fix depends on item 3 — both are "how do you get out of
this app", and they should be answered the same way on both surfaces.
