# Bharosa on Google Play

The Android app is a **Trusted Web Activity**: a thin native shell around the
same site that runs on the web. The consequence worth understanding before
anything else is that **a Vercel deploy updates the Android app too**. Copy
fixes, bug fixes and new screens reach people without a store review. Only
things baked into the shell — the app name, the icon, the package, the host it
points at — need a new bundle uploaded.

---

## The one-time decisions

Two values are effectively permanent. Get them right before the first upload.

**Package name — `in.bharosa.app`.** Cannot be changed after publishing, ever.
A different package is a different app, with its own listing, its own reviews
and its own install base.

**Host — `deepika-health-app.vercel.app`.** This is the domain the app opens
and the domain that has to vouch for it. It *can* change later, but doing so
needs a new bundle, a new upload and a review, so it is worth deciding now
whether the app should live on a real domain (`bharosa.app`, say) instead of a
Vercel subdomain. Moving is much cheaper before launch than after.

Both live in `android/twa-manifest.json`.

---

## Building a bundle

GitHub → **Actions** → **Android build** → **Run workflow**.

Optionally set a version name (`1.0.1`) and version code (a whole number,
higher than the last upload — Play rejects a bundle whose code is not greater
than the previous one). Leave them blank to use what is in the manifest.

The job produces `app-release-bundle.aab` as a downloadable artifact.

It runs in CI rather than on a laptop because GitHub's runners already carry
the Android SDK, and because a release build should be reproducible from a
commit rather than from whatever happens to be installed on one machine.

### Signing

Before the first real upload, generate an upload key **on your own machine**
and keep it somewhere safe:

```bash
keytool -genkeypair -v \
  -keystore bharosa-upload.keystore \
  -alias bharosa \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Bharosa, O=Bharosa, C=IN"
```

Then add three repository secrets (**Settings → Secrets and variables →
Actions**):

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 bharosa-upload.keystore` |
| `ANDROID_KEYSTORE_PASSWORD` | the store password you chose |
| `ANDROID_KEY_PASSWORD` | the key password you chose |

Without those secrets the workflow still runs and still produces a bundle,
signed with a throwaway key generated inside the job. That is deliberate: it
proves the pipeline works before anyone has to hand it a real key. The
artifact is named `UNSIGNED-PIPELINE-TEST` so it cannot be mistaken for
something uploadable.

**Turn on Play App Signing** in the Play Console (it is the default). Google
then holds the real signing key and yours is only an *upload* key — which
means losing it is a support ticket rather than the end of the app.

---

## Play Console setup

### 1. Create the app

Name **Bharosa**, category **Health & Fitness**, free.

### 2. Upload the bundle

Internal testing is the sensible first track: it reaches testers in minutes
rather than days, and it produces the signing fingerprint you need for the
next step.

### 3. Wire up Digital Asset Links

Without this the app runs but keeps a URL bar pinned across the top — the
giveaway that a "Play Store app" is a wrapped website.

Play Console → **Test and release** → **Setup** → **App signing** → copy the
**SHA-256 certificate fingerprint** under *App signing key certificate*.

> Not the upload key certificate. Confusing those two is the usual reason the
> URL bar never disappears.

Add it in Vercel as `ANDROID_CERT_SHA256` (Production, Preview, Development)
and redeploy. Confirm at
`https://deepika-health-app.vercel.app/.well-known/assetlinks.json` — it should
list the fingerprint rather than returning `[]`.

Also set `ANDROID_PACKAGE_NAME` if the package ever differs from the default
in `app/.well-known/assetlinks.json/route.ts`.

### 4. The forms that will hold you up

**Privacy policy URL** — `https://deepika-health-app.vercel.app/privacy`.
Mandatory.

**Account deletion URL** — `https://deepika-health-app.vercel.app/delete-account`.
Mandatory for any app offering account creation, and checked by reviewers.

**Data safety.** Declare honestly, because it is compared against what the app
does:

| Question | Answer |
| --- | --- |
| Collects personal info | Yes — name, username, and answers given at sign-up |
| Collects health info | **Yes** — check-ins, symptoms, workouts, food, uploaded report values |
| Data encrypted in transit | Yes |
| Users can request deletion | Yes, in-app and at the URL above |
| Shared with third parties | No |
| Used for advertising | No |
| Collects location, contacts, photos | No |

**Health apps declaration.** Bharosa is a coaching and fitness app, not a
medical device, and it neither diagnoses nor interprets results. Say so
plainly — the app's own copy says the same thing, and a reviewer comparing the
two should find them agreeing.

**Content rating questionnaire.** Answer it as the general-audience wellness
app it is.

---

## Releasing an update

Only needed when the shell changes — name, icon, package, host, or the
Android-side settings. Everything else ships with a Vercel deploy.

1. Edit `android/twa-manifest.json` if the shell itself changed.
2. Run the workflow with a **higher version code**.
3. Upload the new bundle to a track.

---

## Known gaps

**No password reset.** Someone who mistypes her password at sign-up has an
account nobody can recover. The form warns about it and asks for the password
twice. Worth building before the cohort grows past people Deepika can sort out
by hand — it needs email addresses and a mail service, neither of which exist
yet.

**Support address is a placeholder.** `SUPPORT_EMAIL` overrides it; until it is
set, the privacy policy and deletion page point at `hello@bharosa.app`, which
nobody is reading.
