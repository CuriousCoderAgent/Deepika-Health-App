# The survey

Deepika's three-minute survey for the women's groups she is in on WhatsApp. It
is research for the programme she plans to open next year, not a feature of
this app. It is written down here because what comes back is one of the three
inputs to what the app becomes next (`docs/NEXT-STEPS.md`).

**State on 28 November 2026:** her draft has been reviewed and revised, and the
form has been made from the revised text, in the practice's own Google account.
It has not been sent to anyone. Nothing in the app was built for it.

---

## What each question decides

A question earns its place by changing a decision. These are the decisions.

| Question | What it decides |
| --- | --- |
| 1 Age · 2 Work · 3 Youngest child | Who the programme is really for. The brief says 38 to 50; she says 30 plus, post-partum included (`docs/PILOT-FEEDBACK.md`, Round 2, item 11). |
| 4 Biggest struggle | What the programme leads with. |
| 5 What gets in the way | What a day's plan has to survive: no time, tiredness, family first. |
| 6 What worked · 7 Why | What she is being compared with, and who has already paid for help. |
| 8 What was missing | Whether the gap people feel is the one she fills (one person, following up, joined up), or cost, strictness and fit. |
| 9 What a coach must give | Which of her six Project You promises to lead with (`docs/COACHING-METHOD.md`). |
| 10 Worth it in six months | What "it worked" means to them, and how far that is from her own definition, which is not weight. |
| 11 How to exercise · 12 Time on a weekday | Format and length: live or recorded, alone or in a group, and how small a day's minimum has to be. |
| 13 Anything else | What nobody thought to ask. |
| 14 Hear more | The list for the launch. |

### Three answers that would change plans

Worth writing down before the answers arrive, so they are read against
something.

- **"Being told exactly what to eat" in the top three of question 9.** A meal
  plan is the one thing on that list a health coach's certification does not
  allow her to give (`CLAUDE.md`, Scope of practice). If it is what people want
  most, she needs a registered dietitian beside her before launch, and the
  referral network on the Pilot MVP gate stops being a later item.
- **Weight far ahead of everything else on question 10.** Her measure of
  success is staying with it past three months, and the app leads with
  consistency, not the scale. Both would need a way to meet people where they
  start.
- **Half or more answering under 30 minutes on question 12.** Then the day's
  minimum is the programme, and the Minimum → Target → Stretch design is
  carrying more than it was built to.

---

## The survey

Generated from the script: `node docs/survey/check.mjs --text`. If the two
differ, the script is right.

```
Your health, and what gets in the way

Hi, I'm Deepika. I'm designing a health programme for busy women juggling
work, home and family, and I'd love your input on your health goals, struggles
and what gets in the way. It takes about 3 minutes and is mostly taps. No name
needed: your answers are anonymous unless you choose to leave your number at
the end. Thank you!

1. What is your age? (pick one)
   Under 30 / 30-34 / 35-39 / 40-44 / 45-49 / 50 or above

2. What does your work look like right now? (pick one)
   Working full-time / Working part-time or freelance / Running my own
   business / Homemaker / On a career break / Other

3. How old is your youngest child? (pick one)
   Under 1 year / 1 to 5 years / 6 to 12 years / 13 to 18 years / Over 18 /
   I don't have children

4. What is your biggest health struggle right now? (pick one)
   Losing weight / Gaining weight / Low energy - tired most of the day /
   Poor sleep / Poor overall fitness impacting daily activities /
   Building strength / Eating well /
   Hormonal changes (periods / PCOS / thyroid / perimenopause) /
   Aches and pains / Stress / Other

5. What gets in the way of working on your health? (pick up to 3)
   No time / Too much conflicting advice adding to confusion /
   Don't have anyone to guide me / Hard to stay consistent /
   Family or work comes first / Too tired by the end of the day /
   A health issue or pain holds me back / It costs too much / Other

6. What has worked best for you in the past? (pick one)
   Gym / Personal trainer / Yoga or group classes /
   Dietitian or nutritionist / App or online programme /
   Self-guided (YouTube / Instagram / walking) /
   Nothing has worked for long / I haven't tried anything yet / Other

7. Why did it work - or why not? (optional)

8. Looking back, what was missing from the help you've had so far?
   (pick up to 3)
   It wasn't personalised to me / No one followed up to keep me on track /
   Food, exercise and sleep were handled separately /
   It was too strict to keep up / It didn't fit into my day /
   The results didn't last once I stopped / It cost too much /
   I haven't had any help so far / Other

9. Top 3 things a health coach must give you for you to succeed
   (pick up to 3)
   Regular check-ins and accountability / Seeing results I can measure /
   A plan built around my schedule /
   One person looking at food, exercise and sleep together /
   Someone who understands women's health at my stage /
   No judgement when I slip / Small changes I can keep up /
   Knowing why - not just being told what to do /
   Being told exactly what to eat / Other

10. Six months from now, what would make you say "this was worth it"?
    (pick up to 3)
    Weight or inches down / Clothes fitting better /
    Feeling stronger (lifting more, climbing stairs easily) /
    More energy through the day / Sleeping better /
    Healthy habits that have stuck /
    Better health reports (sugar / thyroid / cholesterol) / Less pain /
    Feeling calmer and less stressed / Other

11. How would you prefer to exercise? (pick one)
    Group class, online live / Group class, in person /
    1:1 with a trainer, online / 1:1 with a trainer, in person /
    On my own with a recording / Other

12. On a normal weekday, how much time can you give to your health?
    (pick one)
    Less than 15 minutes / 15 to 30 minutes / 30 to 45 minutes /
    45 to 60 minutes / More than an hour

13. Anything else you'd like me to know? (optional)

14. Would you like to hear more about the programme when I launch it next
    year?
    Yes, please share details / Maybe, keep me posted / No, thanks

    Your name (only if you said Yes or Maybe)
    Your WhatsApp number (only if you said Yes or Maybe)
    (I'll use it only to tell you about the programme, and I won't share it
    with anyone.)

After sending: Thank you. This really helps. Deepika
```

---

## What changed from her draft, and why

Her draft had ten questions, a name and a phone number, and two additions she
made the same afternoon: a "why" after what worked, and how she would prefer to
exercise. Her wording is kept wherever it could be.

### Fixed: these would have given wrong or unusable answers

| In her draft | The problem | Now |
| --- | --- | --- |
| Age: 30-35, 35-40, 40-45, 45-50, 50+ | 35, 40, 45 and 50 each sit in two bands, and there is nothing for anyone under 30. | Bands that do not overlap, with Under 30. |
| "Which of these describe you? (pick all that apply)" | Two questions in one, work and children, and a homemaker has nothing to tick. "Child above 5" puts a six-year-old and a twenty-year-old together. | Two questions: work, with Homemaker and own business added; and the age of her youngest child. |
| Barriers: "pick all that apply" | Most people tick most of the list and nothing ranks. | "Pick up to 3". The same on what was missing and on what would make it worth it, which did not say how many. |
| "What has worked best for you in the past and why? (pick one)" | No answer for someone for whom nothing worked, or who has never tried. Those are the two most useful answers she can get. And "why" cannot be answered with a tick. | Both answers added. The why is its own optional line, as she planned. |
| "What was missing from the help you've had so far?" | Assumes she has had help. | "I haven't had any help so far" added. "Noone followed up diligently" is now "No one followed up to keep me on track". |
| Choice questions | No way to say something else. | "Other" on every list where something else is possible. |
| Name and phone number | Asked of everyone, with nothing to say they could be left blank or what the number was for. | Both optional, straight after the question, each marked "only if you said Yes or Maybe", with a line saying what the number is for. The opening says the answers are otherwise anonymous. |
| How to exercise: three options | All three are online. | The two in-person options added. If in person is not on offer, take them out and put "online" in the question. |

### Added: hers to take or leave

- **Biggest struggle:** Low energy, Poor sleep, Aches and pains, Stress. The
  brief names low energy, poor sleep and no strength as the three commonest
  complaints.
- **Barriers and what was missing:** answers that could show the programme is
  wrong, not only right — too tired, cost, too strict to keep up, did not fit
  my day, results did not last. As drafted, every option under "what was
  missing" was something her programme fixes, so the answers could only agree
  with her.
- **What a coach must give:** four of her own Project You promises as options —
  understands women's health at my stage, no judgement when I slip, small
  changes I can keep up, knowing why. And "Being told exactly what to eat",
  for the reason given above.
- **Time on a weekday:** new.
- **The opening:** "work, home and family", so that a homemaker does not read it
  as not for her; and "about 3 minutes", because it is fourteen questions.

### Left out on purpose

**Price.** In a group survey people understate what they would pay, and asking
turns "help me design this" into "I am selling". Question 6 already shows who
has paid for a trainer, a dietitian or a programme, which is the better signal.

### Not checked

The draft arrived as a screenshot that cuts off the options on six questions
after the first few. Some of the additions above may already be in her sheet,
and one of her options is a guess from its first three words ("Family or work
comes first"). Where her sheet says something different, hers wins.

---

## Making the form

**As a Google Form.** `docs/survey/make-google-form.gs` builds the whole thing,
with a spreadsheet for the answers. The steps are at the top of that file: sign
in to the Google account that should own the answers, open script.new, paste,
Run. That account is the practice's own Google account and no personal one
(decided 28 November). If the browser is signed in to more than one Google
account, a private window signed in to that one alone is the safe way.

**It was run once, on 28 November 2026**, from a desktop browser, and made the
form and its spreadsheet without an error. The form was then checked by hand
there: the four long lists shuffle, no email address is collected, nobody has
to sign in to Google, and two test answers reached the spreadsheet and were
deleted. That is the report of the session that ran it. Nothing in this
repository's build can reach Google to check it again.

**That run found one thing wrong, and the script has changed since.** The
version that ran put the name and the number on a second page, opened only by
"Yes" or "Maybe". Google's way of doing that leaves the button as *Next* for
everyone, and whoever answers "No, thanks" lands on a page with nothing on it
but *Submit*. Anyone who closes the tab there has sent nothing, and the women
least interested are the ones whose answers would go missing. So the script now
builds one page, with the name and the number as its last two questions,
optional and marked "only if you said Yes or Maybe".

The form that exists was made by the earlier version, so it needs the same
change by hand, in the form's editor:

1. On question 14, open the three-dot menu and untick *Go to section based on
   answer*.
2. On the second section's heading ("Stay in touch"), open its three-dot menu
   and choose *Merge with above*.
3. Rename the last two questions to "Your name (only if you said Yes or Maybe)"
   and "Your WhatsApp number (only if you said Yes or Maybe)", and give the
   second this description, from its three-dot menu: "I'll use it only to tell
   you about the programme, and I won't share it with anyone."

The changed script has not itself been run against Google. `node
docs/survey/check.mjs` runs it against a stand-in, which catches a mistake in
the questions or a mistyped call and nothing more. It makes fewer calls than
the version that ran, and no new ones.

After making a form, or changing one, by hand:

1. Open the link on a phone and answer it twice, once ending in "Yes" and once
   in "No, thanks". Both should end on the same single *Submit*. Delete both
   answers afterwards, in the form's Responses tab **and** in the spreadsheet:
   deleting an answer in the form leaves its row in the sheet.
2. On questions 4, 5, 9 and 10, open the three-dot menu and turn on *Shuffle
   option order*. On a long list the first few options are picked more often,
   and shuffling evens that out. "Other" stays last.
3. In Settings, check that email addresses are not collected and that "Limit
   to 1 response" is off. That setting makes everyone sign in to Google first.

**In anything else.** The text above is all it needs. Keep the questions and
options as written, or say what changed: the page that reads the answers
matches on them (*Where the answers go*, below).

---

## Sending it

- **Her opening line**, with two changes to match the form: "…for busy women
  juggling work, home and family…" and "It takes about 3 minutes".
- If a group has rules about surveys or promotions, ask its admin first.
- Say when it closes. A date gets answers sooner.
- One reminder, two or three days in. Not a second.
- If she is willing to share what she learns with the group, say so in the
  message. It is a fair trade for their time.

---

## Where the answers go

**The form's spreadsheet** holds everything, names and numbers included. It is
the only place those are kept.

**The answers page** is a dashboard on Eshan's Claude account, private until he
shares it. It is listed there, under Artifacts, as "Deepika's health survey".
Its address is deliberately not written here: this repository is public, and
the page will hold what real women typed. It shows who answered, then each
question as bars ranked by how often an answer was picked, with what was typed
beside them, and everything can be narrowed by age, work and youngest child.

Until the survey has gone out it runs on 48 made-up answers, and says so at the
top. Its source is named "Sample answers (made up)".

When the form has answers, the made-up ones and the note about them come off,
and the page is given the real ones. There are two ways, and the choice follows
from where the form lives. The form and its sheet are in the practice's Google
account. The Google Drive connection on Eshan's Claude account belongs to a
different, personal Google account, so it cannot see that sheet as things
stand.

- **Share the sheet, view only, with the account the connection uses.** The
  page then reads the sheet afresh each time it is opened, and nothing is
  pasted or copied. The sheet stays owned by the practice's account.
- **Share nothing.** The page is given an export of the sheet instead, one
  upload at a time, with the name and number columns deleted first: a file
  attached to the page can be read whole by anyone the page is shared with.

Which of the two is Eshan's to say.

Three things about how it reads:

- It keeps the survey's fourteen columns and drops every other one before
  anything is counted or shown, so a name or a number never appears on it.
- It finds each column by a few words of its question, and counts an answer as
  an option only when it matches the option's text. An answer that matches
  nothing is listed as typed, not lost. So a reworded question or option has to
  be changed in the page too: its copy of the options is at the top of its
  script.
- Shares are out of those who answered the question, and add up to more than
  100% where up to three could be picked.

**Why the survey itself is not a Claude page.** A Claude page can only save
something for a person who is signed in to Claude and has been given access.
Women opening a link from a WhatsApp group are neither.

**Why it is not a page in this app.** It could be: a public page here that
saves to the app's database. That would put strangers' phone numbers beside
members' health records, and open a door anyone can write through, for
something a form does in ten minutes. Worth doing only if the survey becomes a
standing part of how people join.

---

## Privacy

Names and phone numbers of women who are not members, given for one purpose.

- Whoever owns the Google account that runs the script can read all of them.
  It is to be the practice's own account, not a personal one.
- The survey says what the number is for and that it will not be shared. That
  is now a promise.
- If someone asks to be taken off: delete her row in the spreadsheet and her
  answer in the form's Responses tab. The answers page follows the sheet.
- Typed answers can identify someone even without a name, so the answers page
  is shared only with people who may read the sheet.
- Nothing from the survey goes into this repository or the app's database.
