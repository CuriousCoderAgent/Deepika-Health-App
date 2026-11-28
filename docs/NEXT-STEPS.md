# Next steps

The one place that says what is waiting, on whom, and for what. Started 28
November 2026. Change it when something here moves, and delete what is done
instead of ticking it.

Two other lists exist and are not repeated here: what only the owner can do to
finish the launch (`docs/LAUNCH-CHECKLIST.md`), and the older build backlog
(`docs/PROJECT-BRIEF.md` §5, `docs/V1-ROADMAP.md`).

---

## 1. Make the app fit Deepika's method

**Waiting on:** a conversation with Eshan, and Deepika's answers. Nothing here
is built, and nothing should be until the questions below have answers.

### The three inputs

All three are to be read before deciding what changes.

| Input | Where it is | State |
| --- | --- | --- |
| The mock first call, 28 November | `docs/PILOT-FEEDBACK.md`, Round 2: twelve items, each checked against the code | Logged |
| Her workbook: intake form, first-call worksheet, physical assessment, Project You | `docs/COACHING-METHOD.md`: her structure, and a table of where the app differs | Logged |
| The survey of the women's groups | `docs/SURVEY.md`; the answers on the page named in section 2 | Reviewed, not sent |

The transcript and the workbook are personal and are not in the repository.
Eshan has them.

### How the conversation runs

The questions are drafted below so that most can be answered with a tick or a
line. Each says who it is for: **D** Deepika, **E** Eshan, **B** both. Each
answer becomes a build item in this file, smallest honest version first, and
the matching Round 2 item gets its status changed.

**If only six get answered, these six**, because the rest hang on them: A1,
B1, C1, D1, F1 and I1.

### A. The name, and who it is for

- **A1 (B)** "Project You" is: the app's name · the programme's name, inside an
  app called something else · not decided.
  *Decides the one-pass rename in `CLAUDE.md`. The Android package ID is
  permanent from the first install.*
- **A2 (D)** By age, it is for: 30 and over · 35 and over · 38 to 50, as the
  brief says · wait for the survey.
- **A3 (D)** Post-partum women: from the start · later · no.
  *Adds an answer to "Where you are right now", and probably question J2.*
- **A4 (D)** The mock client was a man. Coach men too? Yes, the same programme ·
  case by case · no. *The app already lets a man join (Round 1, item 1).*

### B. The shape of the programme

- **B1 (D)** Length: twelve weeks, then round again with new goals · one arc of
  four to six months · something else.
  *The whole journey is twelve weeks today (`lib/starterPlan.ts`). The first
  answer needs almost no change; the second is a different product.*
- **B2 (D)** One-to-one calls: weekly · fortnightly · monthly · it varies by
  client.
- **B3 (D)** The goals are looked at again: every month · at a month and a half
  and at three months, with the assessment · only at the end.
- **B4 (D)** Must the intake form be filled in before the first call can
  happen? Yes · preferred, not required.

### C. The intake form

- **C1 (D)** A client fills it in: in the app, before the first call · in a
  separate form, as now · either.
- **C2 (D)** For each of the twenty questions in `docs/COACHING-METHOD.md`:
  keep as typed · make it multiple choice (and list the choices) · ask it in
  the call instead · drop it.
- **C3 (D)** Values and strengths: three picked from a list she writes · typed
  freely · asked in the call, not the form.
- **C4 (D)** Afterwards the client can: see and change her answers · see them
  only · neither.
- **C5 (D)** Relationship status and children: what do they change in a plan?
  *Asked so the app only holds what is used.*

### D. Goals

- **D1 (D)** One primary and one secondary, three at most: is that the rule
  for everyone? Yes · it varies.
- **D2 (D)** A goal is written into the app by: Deepika, in or after the call ·
  the client, and Deepika confirms.
- **D3 (D)** A goal carries a number (a distance, a measurement): always ·
  when there is one · never in the app.
- **D4 (D)** And a time? In the call she said she would not put one on a goal;
  the worked example on her sheet has one. Never · when the client wants one.
- **D5 (D)** The five dimensions are fixed as physical activity, nutrition,
  sleep, stress and lifestyle: yes · change to: ___.
  *The app files modules under movement, nutrition, sleep, hormonal and
  behaviour, which is not the same five.*
- **D6 (D)** The row per dimension (goals, pain points, barriers) is: for the
  client to see · her working sheet only.

### E. Behaviours

- **E1 (D)** "Two behaviours a week" in the call, "up to three per column" on
  the sheet. The rule is: two or three in all at any time · up to three in
  each area.
- **E2 (D)** Behaviours come from: the module library · written fresh for each
  client · both.
- **E3 (D)** Her ten most common behaviour goals, in her words.
  *So they can be offered instead of typed each time.*
- **E4 (D)** Does every behaviour have a smallest version that still counts?
  Yes · only some. *The app's Minimum → Target → Stretch assumes yes.*
- **E5 (D)** A barrier and its way round are: shown to the client, for example
  when she taps "Not today" · for the coach only.

### F. The physical assessment

- **F1 (D)** Measured by: her, in person · her, on video · the client, at
  home · some of each (which?).
- **F2 (D)** Step test or brisk walk: which one?
- **F3 (D)** Fixed at today, a month and a half and three months? Yes · other.
- **F4 (D)** The client sees her own numbers over time: all of them · some
  (which?) · none.
- **F5 (D, with her certifying body)** May the app show a reference beside a
  member's own number, such as waist under 36 inches? Checked, and yes ·
  numbers only · not asked yet.
  *This is the scope-of-practice line in `CLAUDE.md`. Numbers only is the
  default until someone qualified says otherwise.*
- **F6 (D)** Sleep, energy, gut, periods, pain and mood are recorded as: 1 to
  5 · yes or no · a line of text.

### G. Being answerable (Round 2, item 8)

- **G1 (D)** A nudge tied to one behaviour, at a time the client picks: yes ·
  not yet · no.
- **G2 (D)** When she does not answer, or says "not tonight", Deepika sees it:
  each time · only as a pattern over a week · never.
- **G3 (D)** The wording for a client who says "push me": the same as for
  everyone, no guilt · firmer, for those who ask.
  *The brief's research is against the second. Her call.*

### H. The daily line, vision and values (Round 2, item 7)

- **H1 (D)** The client writes her daily line in the app and sees it on Today:
  yes · no.
- **H2 (D)** Her vision and values are: kept in the app, where she can see
  them · spoken in the call and not kept.
- **H3 (D)** A vision board, with pictures: later · no.

### I. Recordings and AI (Round 2, item 6)

- **I1 (B)** Will calls with real clients be recorded? Yes, with her
  agreement · no.
- **I2 (B)** If yes, turned into notes by an AI tool? Yes · no · undecided.
  *A client's voice and health details would go to an outside provider. That
  needs her consent and a line in the privacy notice naming the provider.*
- **I3 (D)** The "key themes" on the worksheet: written by her · drafted by a
  tool (which one?).
- **I4 (B)** Should the app ever draft for Deepika, never to a member? Worth
  scoping · no.

### J. What stays hers (Round 2, item 10)

- **J1 (D)** Has her certifying body said how far a coach may go with a blood
  report in conversation? Asked, and the answer was: ___ · not asked yet.
- **J2 (D)** When a client has a condition, is a doctor's go-ahead needed
  before exercise starts? Yes, and the app should hold "cleared on <date>" ·
  no.
- **J3 (D)** People she would refer to — dietitian, gynaecologist, counsellor:
  has names · not yet.
- **J4 (D)** After the food log she gives: general guidance · a protein
  target · something fuller. *A coach's certification stops short of a meal
  plan; question 9 of the survey measures how many will ask for one.*

### K. After the call

- **K1 (D)** The three or four days of food are logged: in the app · as photos
  on WhatsApp · on paper.
- **K2 (D)** Should the log count water and other drinks? Yes · no.
  *It leaves them out on purpose today.*
- **K3 (D)** Eating out and ordering in: asked once, at intake · counted from
  the log.

---

## 2. The survey

**Waiting on:** Deepika, to accept or change the revised text.

1. She reads the revised survey (`docs/SURVEY.md`) and says what to change.
2. The form is made: `docs/survey/make-google-form.gs`, then the three things
   to do by hand that `docs/SURVEY.md` lists.
3. She sends it.
4. The answers are pasted into the answers page.
5. They are read against the three answers that would change plans
   (`docs/SURVEY.md`), and go into the conversation in section 1.

The answers page: not published yet.

---

## 3. Small things waiting on the owner

Not in `docs/LAUNCH-CHECKLIST.md`, or easy to lose there.

- **Google sign-in, the untried half.** Create an account with Google, connect
  Google from Your account, and the round trip from the Android app and from
  an iPhone Home Screen. When those work, the website's "join with Google"
  line can be switched on (`WEBSITE_GOOGLE_SIGN_IN`). Checklist item 12.
- **Take the database off preview deployments.** Every preview still reads and
  writes the live database (`docs/DEPLOYMENT.md`, *Before real members*).
- **Six branches left over from closed sessions** can be deleted on GitHub's
  branches page: `claude/eloquent-lovelace-absrff`, `claude/friendly-pasteur-gijc03`,
  `claude/inspiring-hawking-a4a367`, `claude/brave-goodall-32ntya`,
  `claude/adoring-meitner-2n6w7i` and `claude/adoring-meitner-2n6w7i-next15`.
- **Thirteen exercise pictures**, which Deepika should check for form before
  they go in (`public/exercises/README.md`).

---

## 4. Offered, not started

Each needs a yes.

- **A guard on the demo sign-in.** A deployment that has the database but not
  `AUTH_SECRET` and `COACH_PASSWORD` serves real records on public demo
  credentials. Nothing in the code stops it today (`CLAUDE.md`, Stack).
- **The daily line** (Round 2, item 7), which is small and stands on its own
  whatever the answers in section 1 turn out to be.
