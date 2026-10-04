# Launch checklist

Written 4 October 2026. One page: what is live, what changed in the launch pass,
and the short list of things only the owner can do.

---

## What is live

| | State |
| --- | --- |
| **The app** (Vercel, `deepika-health-app`) | Running on its own Neon database with `AUTH_SECRET`, `COACH_PASSWORD` and `MEMBERS` set; no demo credentials shown. Sign-up is **open to anyone with the link**. |
| **The website** (`website/`) | Built and tested; deployed as its own Vercel project. It ships `noindex` until the name is final. |
| **The Android app** | The pipeline builds a real bundle (`.github/workflows/android.yml`), signed with a throwaway key until the owner adds the upload-key secrets. **Nothing is published.** |

## Fixed in the launch pass

These were found by checking what a *real* member and a *real* Deepika would see,
which the sample cohort had been hiding:

- **A real member's Today was empty for ever**, and "today" never advanced. New
  members now start on a starter plan (Deepika's own progression), the day rolls
  forward, the programme week advances, and each day builds at most three
  actions. Tested, including against a real Postgres.
- **Deepika's private notes were being sent to the members they were about**,
  inside each member's own document, hidden only by the screen. The server now
  strips them on read and refuses them on write.
- **Deepika's console briefly showed six fictional women on every load**, even
  after she had removed them. It now waits for the real data.
- The privacy and deletion pages **told people to email a made-up address**. With
  no address configured they now say to contact Deepika directly.
- A woman who joined that morning was flagged as "nothing recorded". She now gets
  a welcome prompt (Radar rule R11) instead.
- Stale text removed: "Fictional members, no real health data", a hardcoded
  "Sunday, 9 August", "six of twenty places filled", "in this prototype".

New for launch: an **invite panel** (the message to send, with the link and join
code, one tap to WhatsApp), **temporary-password reset** by Deepika, members
**changing their own password**, **download my data**, a **share** button,
**one-click removal of the sample members**, and demo seeding made opt-in.

---

## Only the owner can do these

In rough order. Items 1–3 are small and should be done before anyone is invited.

1. **Decide whether sign-up is open or invitation-only.** Right now anyone with
   the link can create an account and appear in Deepika's console. For a first
   cohort of twenty this is the one decision with real consequences. **Recommend:**
   set `SIGNUP_CODE` in Vercel (Production + Preview), redeploy, and the code is
   shown to Deepika on the Members page and written into the invite message
   automatically. The website's FAQ already says to enter an invitation code if
   you have one.
2. **Set `SUPPORT_EMAIL`** (app, in Vercel) **and `WEBSITE_SUPPORT_EMAIL`** (website)
   to an inbox someone reads. Play also requires a developer contact address.
3. **Sign in as Deepika → Members → *Remove sample members*** when you are ready
   for the console to show only real people.
4. **Choose the name.** Then change it in one pass: the app (page titles, manifest,
   launcher icon, privacy page), `lib/brand.ts`, `android/twa-manifest.json`
   (including the package ID — permanent from the first install), and
   `WEBSITE_BRAND` for the site. Do this *before* uploading anything to Play.
5. **Deepika: replace the "Meet Deepika" paragraph on the website** with her own
   words and a photo, and read the privacy page once — it speaks in her name.
6. **Android → Play** (needs your accounts; see `docs/ANDROID.md` for the full
   steps): generate the upload key on your own machine, add the three GitHub
   secrets, run the *Android build* workflow, create the app in Play Console,
   upload to **internal testing**, copy the **app signing** SHA-256 into Vercel as
   `ANDROID_CERT_SHA256`, redeploy, and check `/.well-known/assetlinks.json`.
   Then the forms: Data safety, content rating, App access, store listing
   (`docs/PLAY-LISTING.md`).
7. **Create a reviewer account** (sign up normally) and give it to Google under
   *App content → App access*.
8. **When the name is final**, set `WEBSITE_INDEXABLE=1`, `WEBSITE_PUBLIC_URL` and
   `WEBSITE_PLAY_URL` on the website project and redeploy.

---

## Known limits at launch

Honest, so nobody is surprised later:

- **No reminders or push notifications.** There is no push infrastructure; the
  check-in is something she opens the app to do.
- **Password recovery needs Deepika.** No email service. Fine for a coached
  cohort, not for people who find the app alone.
- **Sessions are not revoked** when a password changes (30-day cookie), and there
  is **no login rate limiting**.
- **Last write wins.** Two people editing the same member's document in the same
  second can drop one change. Theoretical at twenty members.
- **Documents grow.** Each member's record is one JSON document that grows daily
  and is rewritten whole on every save. Fine for months; worth splitting before
  it is large.
- **The coach console shows usernames, not names** ("MEERA-NAIR"). Real signups
  pick their own usernames, so Deepika may not recognise "mn1987". Showing names
  is a one-line decision — it is not made because the original design chose IDs
  for privacy.
- **Report files are not stored**, only the values typed in. The app says so.
- **Not tested here:** the Android build on a real phone, the website's web fonts
  (this environment cannot reach Google Fonts), and the live deployment's sign-up
  with real email-less devices.
