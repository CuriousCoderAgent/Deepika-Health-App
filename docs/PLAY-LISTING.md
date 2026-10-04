# Google Play listing — copy and answers

Written 4 October 2026. Everything here describes what the app does today; if a
feature changes, change this with it. `{NAME}` is the product name, which is
**not final** — fill it in once it is, before pasting anything into Play Console.

Character counts are Google's limits, checked against the text below.

---

## Store listing

**App name** (30 max): `{NAME}`

**Short description** (80 max, 71 used):

> Strength, energy and steadiness, with a real coach who knows your week.

**Full description** (4000 max, about 1,900 used):

```
{NAME} is a health-coaching app built around a real coach. You get a simple daily plan, a quick check-in on how you are feeling, and Deepika, a health coach and personal trainer, who reads what you log and talks with you about it.

It is made for the middle decades of life, when your body, your sleep and your time all change at once. The coaching adapts to you, and anyone ready to start is welcome.

WHAT IT DOES
- A daily plan in three sizes. Every action has a Minimum, a Target and a Stretch. Doing the minimum is a full win, not a consolation prize.
- No streaks to lose. Progress is shown as how many of the last 14 days included at least one healthy action, so one bad week never erases the rest.
- A 12-week journey in three phases: Stabilise, Build, Consolidate.
- A quick daily check-in on energy, sleep, stress and how you feel.
- Movement sessions with a how-hard-was-it rating, and a way to flag pain so your coach sees it.
- Protein logging in bowls, rotis and glasses. No calorie counting, no scales.
- A weekly reflection that your coach reads before you talk.
- Short reading chosen to match your goals.
- Space to record blood-report and body-composition values and see how they change over time. They go to your coach; the app records and charts them and does not interpret them.
- Messages with your coach.

YOUR DATA
- Only what you enter is stored, and only because the coaching needs it.
- Your coach can see it. No other member can. There are no public profiles, feeds or leaderboards.
- No ads, no selling your data, and no analytics trackers.
- Download a copy, or delete your account and everything in it, at any time from inside the app.

COACHING, NOT MEDICAL CARE
{NAME} does not diagnose anything, does not interpret test results and does not replace your doctor. If something about your health worries you, please see one.

You do not need a smartwatch or any other device.
```

What the copy deliberately leaves out: any claim of AI (there is none), any
health outcome ("lose weight", "balance hormones"), any rating, download count or
testimonial (there is none yet), and any price (none decided). Play rejects
unsupported health claims, and a reviewer comparing the listing to the app should
find them agreeing.

**Category:** Health & Fitness. **Tags:** fitness, health coaching, wellness.

**Contact email:** an inbox someone reads (the same one as `SUPPORT_EMAIL`).
**Website:** the launch site (`website/`). **Privacy policy:** `/privacy` on the
app's domain.

---

## App content

**Target audience:** 18 and over only. The privacy policy states accounts are not
offered to anyone under 18, and the onboarding asks for an age of 18 or more.

**Ads:** none. **Content rating:** answer as a general-audience wellness app. No
violence, no user-generated content shared between users, no location sharing,
no purchases.

**App access:** the app is behind a sign-in, so reviewers need a login. Create an
ordinary member account for them and enter it under *App content → App access*
(see `docs/ANDROID.md`).

**Health apps declaration:** a coaching and fitness app, not a medical device; it
neither diagnoses nor interprets results. State that plainly.

**Data safety:** the answers are in `docs/ANDROID.md` → *The forms that will hold
you up*. In short: collects name, username and health information; encrypted in
transit; users can delete their data in the app and at the account-deletion URL;
nothing shared with third parties; not used for advertising.

**Account deletion URL:** `/delete-account` on the app's domain. Mandatory for any
app with account creation, and checked by reviewers.

---

## Graphics (make after the name is chosen)

| Asset | Size | Notes |
| --- | --- | --- |
| App icon | 512 × 512 PNG | The sprout on green, from `public/icons/`. |
| Feature graphic | 1024 × 500 | Carries the name and the tagline. |
| Phone screenshots | at least 2, 16:9 or 9:16 | Today, the three-size action, Journey, the coach thread. Use a sample member, never a real one. |

## Release notes (first release)

> First release. A simple daily plan, a quick check-in, and a coach who reads
> what you log.
