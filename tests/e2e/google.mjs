/**
 * "Continue with Google".
 *
 * It ships switched off, so the first thing checked is that the app with no
 * keys set says nothing about Google at all. Everything after that runs on a
 * second copy of the app with keys set and a stand-in for Google on this
 * machine (harness.mjs) — one the test can tell who is signing in, to press
 * Cancel, or to misbehave in a particular way.
 *
 * What matters here is who ends up signed in as whom, and what was stored:
 * so the checks read the account table as well as the screen.
 */
import crypto from "node:crypto";
import { check, onboard, openPage, seen, shot, signUpAndOnboard, startFakeGoogle, textOf, until } from "./harness.mjs";

const CLIENT = { clientId: "e2e-client.apps.example", clientSecret: `secret-${crypto.randomBytes(9).toString("hex")}` };
const JOIN_CODE = "monsoon-42";

// Google accounts. `sub` is Google's own id for each, which is what the app keys on.
const SUNITA = { sub: "g-1001", email: "sunita.verma@example.test", name: "Sunita Verma" };
const OTHER_SUNITA = { sub: "g-1002", email: "sunita.v@example.test", name: "Sunita Verma" };
const STRANGER = { sub: "g-2001", email: "nobody.yet@example.test", name: "Nobody Yet" };
const UNCONFIRMED = { sub: "g-3001", email: "unconfirmed@example.test", name: "Una Confirmed", verified: false };
const LATAS_GOOGLE = { sub: "g-4001", email: "lata.k@example.test", name: "Lata K" };
const DEEPIKAS_GOOGLE = { sub: "g-9001", email: "deepika.coach@example.test", name: "Deepika" };

// Members who signed up the ordinary way, with a password.
const LATA = { name: "Lata Krishnan", username: "lata-krishnan", password: "third-pass-789", code: JOIN_CODE };
const NANDINI = { name: "Nandini Rao", username: "nandini-rao", password: "fourth-pass-012", code: JOIN_CODE };

export default async function google({ base, browser, db, problems, alsoRunning, anotherApp }) {
  // ------------------------------------------------------------ off, as shipped
  const off = await openPage(browser, "phone", "sign-in with Google off", problems);
  await off.goto(`${base}/`, { waitUntil: "networkidle" });
  const offSignIn = await textOf(off.locator("main"));
  await off.getByRole("button", { name: "Create your account" }).click();
  const offCreate = await textOf(off.locator("main"));
  await off.goto(`${base}/privacy`, { waitUntil: "networkidle" });
  const offPrivacy = await textOf(off.locator("main"));
  const form = { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "intent=signin", redirect: "manual" };
  const offStart = await fetch(`${base}/api/auth/google`, form);
  const offReturn = await fetch(`${base}/api/auth/google/callback?state=x&code=y`, { redirect: "manual" });
  check(
    "G1  with no keys set, no screen mentions Google and both of its addresses answer 404",
    !/google/i.test(offSignIn + offCreate) && !/sign in with Google/i.test(offPrivacy) && offStart.status === 404 && offReturn.status === 404,
    `start ${offStart.status}, return ${offReturn.status}`
  );
  await off.context().close();

  // ------------------------------------------------- on: a second copy of the app
  const fake = await alsoRunning(startFakeGoogle(CLIENT));
  const app = await alsoRunning(
    anotherApp({
      GOOGLE_CLIENT_ID: CLIENT.clientId,
      GOOGLE_CLIENT_SECRET: CLIENT.clientSecret,
      GOOGLE_TEST_ISSUER: fake.origin,
      COACH_GOOGLE_EMAIL: "Deepika.Coach@Example.test", // matched whatever its capitals
      SIGNUP_CODE: JOIN_CODE,
    })
  );
  const there = app.url;
  // The app makes its tables the first time something needs them. Run on its
  // own, this suite reads the account table before anyone has signed up — so
  // ask for a sign-in that cannot succeed, which is enough to make them.
  await fetch(`${there}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "nobody-at-all", password: "not-a-real-password" }),
  });

  const withGoogle = (page) => page.getByRole("button", { name: "Continue with Google" });
  /** Waits for her to land somewhere. False rather than an exception if she does
   *  not, so that one broken rule fails its own check and the rest still run. */
  const lands = (page, where, ms = 20_000) => page.waitForURL(where, { timeout: ms }).then(() => true, () => false);
  const signInPage = (page) => page.goto(`${there}/`, { waitUntil: "networkidle" });
  const told = async (page) => ((await seen(page.locator('main [role="status"], main [role="alert"]').first())) ? textOf(page.locator('main [role="status"], main [role="alert"]').first()) : "");
  const signedInAs = async (page) => {
    const cookie = (await page.context().cookies(there)).find((c) => c.name === "dw_user");
    try {
      return cookie ? JSON.parse(decodeURIComponent(cookie.value)).sub : null;
    } catch {
      return null;
    }
  };
  const hasSession = async (page) => (await page.context().cookies(there)).some((c) => c.name === "dw_session");
  const signOut = async (page) => {
    await page.goto(`${there}/member`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Sign out/ }).click();
    await lands(page, `${there}/`);
  };

  const s = await openPage(browser, "phone", "Sunita", problems);
  await signInPage(s);
  const signInOffer = await seen(withGoogle(s));
  await shot(s, "google-sign-in", { fullPage: true });
  await s.getByRole("button", { name: "Create your account" }).click();
  const createOffer = (await seen(withGoogle(s))) && (await withGoogle(s).isDisabled()) && (await s.getByText("Enter the join code above first.").isVisible());
  await s.goto(`${there}/privacy`, { waitUntil: "networkidle" });
  const privacy = await textOf(s.locator("main"));
  check(
    "G2  with keys set it is offered for signing in and for creating an account — which still needs the join code — and the privacy page says what Google is told",
    signInOffer && createOffer && privacy.includes("Only if you choose to sign in with Google") && privacy.includes("the email address of that Google account"),
    `sign-in ${signInOffer}, create ${createOffer}`
  );

  // --------------------------------------- signing in never makes an account
  const before = await db.accounts();
  fake.signsInAs(STRANGER);
  await signInPage(s);
  await withGoogle(s).click();
  await lands(s, /google=no-account/);
  await shot(s, "google-no-account", { fullPage: true });
  const sent = fake.asked.at(-1) ?? {};
  check(
    "G3  she is sent to Google asking only who she is, with a challenge, and always to choose the account",
    sent.scope === "openid email profile" && sent.response_type === "code" && sent.code_challenge_method === "S256" && Boolean(sent.code_challenge) &&
      sent.prompt === "select_account" && sent.redirect_uri === `${there}/api/auth/google/callback` && sent.client_id === CLIENT.clientId && !JSON.stringify(sent).includes(CLIENT.clientSecret),
    JSON.stringify({ ...sent, state: "…", nonce: "…", code_challenge: "…" })
  );
  check("G4  the server's swap of the code proved itself to Google: the right secret, and a verifier matching the challenge (PKCE)", fake.swaps.at(-1)?.ok === true && fake.swaps.at(-1)?.pkce === true, JSON.stringify(fake.swaps.at(-1)));
  check(
    "G5  a Google account nobody has connected is told what to do — and signing in made no account (read from the database)",
    (await told(s)).includes("No account here is connected to that Google account yet") && (await db.accounts()).length === before.length && !(await hasSession(s)),
    await told(s)
  );

  // ------------------------------------------- creating one needs the join code
  await s.getByRole("button", { name: "Create your account" }).click();
  await s.fill('input[name="code"]', "not-the-code");
  const visits = fake.asked.length;
  await withGoogle(s).click();
  await lands(s, /google=code/);
  check(
    "G6  a wrong join code is refused before she is sent anywhere, and the form is still on Create your account",
    (await told(s)) === "That join code isn’t right." && fake.asked.length === visits && (await s.getByLabel("Your name").isVisible()),
    `${await told(s)} · visits to Google ${fake.asked.length - visits}`
  );

  // ------------------------------------------------------------- creating one
  fake.signsInAs(SUNITA);
  await s.fill('input[name="code"]', JOIN_CODE);
  const cleared = (await s.locator('main [role="alert"]').count()) === 0;
  await shot(s, "google-create", { fullPage: true });
  await withGoogle(s).click();
  await lands(s, /\/onboarding/);
  let account = await db.account("sunita-verma");
  const record = await db.memberDoc("sunita-verma");
  check(
    "G7  with the code, Continue with Google makes her account from her Google name: no password, Google's id and her address stored, and she is taken to the first-run questions",
    cleared && account?.has_password === false && account.google_sub === SUNITA.sub && account.email === SUNITA.email && account.name === "Sunita Verma" && record?.member?.name === "Sunita Verma" && (await signedInAs(s)) === "sunita-verma",
    `${cleared ? "" : "the old notice was still showing · "}${JSON.stringify(account)}`
  );

  await onboard(s);
  await s.goto(`${there}/member/account`, { waitUntil: "networkidle" });
  const card = s.locator("div.rounded-2xl", { hasText: "Sign in with Google" }).first();
  await seen(card.getByText("Connected to"));
  await card.scrollIntoViewIfNeeded();
  await shot(s, "google-account-only-google");
  const screen = await textOf(s.locator("main, body").first());
  const refusedOff = await s.evaluate(async () => (await fetch("/api/auth/google", { method: "DELETE" })).status);
  check(
    "G8  her account screen says which Google account opens it, offers no password to change, and will not disconnect her only way in",
    screen.includes(`Connected to ${SUNITA.email}`) && screen.includes("there is no password on this account") && !screen.includes("Change your password") &&
      (await s.getByRole("button", { name: "Disconnect Google" }).count()) === 0 && refusedOff === 409 && (await db.account("sunita-verma")).google_sub === SUNITA.sub,
    `DELETE answered ${refusedOff}`
  );

  // ------------------------------------------------- signing back in with Google
  await signOut(s);
  const count = (await db.accounts()).length;
  await withGoogle(s).click();
  await lands(s, `${there}/member`);
  check(
    "G9  signed out, Continue with Google brings her back to her own Today — the same account, not a new one",
    (await seen(s.getByText("Your focus today"), 15_000)) && (await signedInAs(s)) === "sunita-verma" && (await db.accounts()).length === count,
    `signed in as ${await signedInAs(s)}`
  );

  // -------------------------------------- someone else with the very same name
  const o = await openPage(browser, "phone", "the other Sunita", problems);
  fake.signsInAs(OTHER_SUNITA);
  await signInPage(o);
  await o.getByRole("button", { name: "Create your account" }).click();
  await o.fill('input[name="code"]', JOIN_CODE);
  await withGoogle(o).click();
  await lands(o, /\/onboarding/);
  const second = await db.account("sunita-verma-2");
  check(
    "G10 a different person with the same name gets her own account, numbered, and the first is untouched",
    second?.google_sub === OTHER_SUNITA.sub && (await signedInAs(o)) === "sunita-verma-2" && (await db.account("sunita-verma")).google_sub === SUNITA.sub,
    JSON.stringify(second)
  );
  await o.context().close();

  // --------------------------------------------------------- when it goes wrong
  const w = await openPage(browser, "phone", "a sign-in that goes wrong", problems);
  fake.cancels();
  await signInPage(w);
  await withGoogle(w).click();
  await lands(w, /google=cancelled/);
  check("G11 pressing Cancel on Google's page comes back saying so, signed in as nobody", (await told(w)) === "Google sign-in was cancelled. Nothing was changed." && !(await hasSession(w)), await told(w));

  // Each of these is a real attack or a real fault. All get the same sentence:
  // she does not need to know which, and neither does whoever is trying.
  const outcomes = [];
  for (const wrong of ["state", "nonce", "audience", "issuer", "expired"]) {
    fake.getsWrong(wrong, SUNITA);
    // Signed out to begin with, whatever the last one did: if one of these
    // ever does sign her in, the others must still be tried.
    await w.context().clearCookies();
    await signInPage(w);
    await withGoogle(w).click();
    await lands(w, /google=/);
    outcomes.push([wrong, new URL(w.url()).searchParams.get("google"), await hasSession(w)]);
  }
  await w.context().clearCookies();
  check(
    "G12 an answer meant for another attempt, another app, another issuer, or out of date signs nobody in — even as someone who has an account",
    outcomes.every(([, word, session]) => word === "failed" && !session) && (await told(w)).includes("didn’t go through"),
    outcomes.map(([wrong, word, session]) => `${wrong} → ${word}${session ? " AND SIGNED IN" : ""}`).join(", ")
  );

  fake.signsInAs(UNCONFIRMED);
  await signInPage(w);
  await w.getByRole("button", { name: "Create your account" }).click();
  await w.fill('input[name="code"]', JOIN_CODE);
  await withGoogle(w).click();
  await lands(w, /google=unverified/);
  check(
    "G13 an address Google has not confirmed cannot make an account",
    (await told(w)).includes("hasn’t confirmed that email address") && !(await hasSession(w)) && !(await db.accounts()).some((id) => id.startsWith("una")),
    await told(w)
  );

  const cold = await fetch(`${there}/api/auth/google/callback?state=anything&code=anything`, { redirect: "manual" });
  const crossSite = await fetch(`${there}/api/auth/google`, { ...form, headers: { ...form.headers, "Sec-Fetch-Site": "cross-site" } });
  check(
    "G14 the way back with no attempt behind it lets nobody in, and another site cannot start one",
    cold.status === 303 && (cold.headers.get("location") ?? "").endsWith("/?google=failed") && !(cold.headers.get("set-cookie") ?? "").includes("dw_session") && crossSite.status === 403,
    `return ${cold.status} → ${cold.headers.get("location")}, cross-site start ${crossSite.status}`
  );
  await w.context().close();

  // ------------------------------------ connecting Google to a password account
  const l = await openPage(browser, "phone", "Lata", problems);
  await signUpAndOnboard(l, there, LATA);
  await l.goto(`${there}/member/account`, { waitUntil: "networkidle" });
  const connect = l.locator("form", { hasText: "Your password, so we know" });
  await seen(connect);
  const visitsBefore = fake.asked.length;
  fake.signsInAs(LATAS_GOOGLE);
  await connect.locator('input[name="password"]').fill("not-her-password");
  await withGoogle(l).click();
  await seen(l.getByText("That isn’t your current password. Nothing was changed."));
  await l.locator("form", { hasText: "Your password, so we know" }).scrollIntoViewIfNeeded();
  await shot(l, "google-account-connect");
  check(
    "G15 connecting Google asks for her password first — a wrong one goes nowhere, so an unlocked phone is not enough",
    fake.asked.length === visitsBefore && (await db.account(LATA.username)).google_sub === null,
    `visits to Google ${fake.asked.length - visitsBefore}`
  );

  await l.locator("form", { hasText: "Your password, so we know" }).locator('input[name="password"]').fill(LATA.password);
  await withGoogle(l).click();
  await seen(l.getByText("Google is connected. You can sign in with it from now on."), 20_000);
  await l.getByText("Connected to").scrollIntoViewIfNeeded();
  await shot(l, "google-account-connected");
  account = await db.account(LATA.username);
  check(
    "G16 with her password it connects: the screen says which account, the address bar is clean, and her password still works (read from the database)",
    (await seen(l.getByText(`Connected to`))) && (await textOf(l.locator("body"))).includes(LATAS_GOOGLE.email) && !l.url().includes("google=") &&
      account.google_sub === LATAS_GOOGLE.sub && account.email === LATAS_GOOGLE.email && account.has_password === true,
    JSON.stringify(account)
  );

  await signOut(l);
  await withGoogle(l).click();
  await lands(l, `${there}/member`);
  check("G17 and from then on Continue with Google signs her in to that account", (await signedInAs(l)) === LATA.username && (await seen(l.getByText("Your focus today"), 15_000)), `signed in as ${await signedInAs(l)}`);

  // One Google account opens one account here.
  const n = await openPage(browser, "phone", "Nandini", problems);
  await signUpAndOnboard(n, there, NANDINI);
  await n.goto(`${there}/member/account`, { waitUntil: "networkidle" });
  const nConnect = () => n.locator("form", { hasText: "Your password, so we know" });
  await seen(nConnect());
  fake.signsInAs(LATAS_GOOGLE);
  await nConnect().locator('input[name="password"]').fill(NANDINI.password);
  await withGoogle(n).click();
  await seen(n.getByText(/already opens a different account here/), 20_000);
  check(
    "G18 a Google account that already opens someone's account cannot be connected to another",
    (await db.account(NANDINI.username)).google_sub === null && (await db.account(LATA.username)).google_sub === LATAS_GOOGLE.sub,
    JSON.stringify(await db.account(NANDINI.username))
  );

  // Nor can the address that opens Deepika's console.
  fake.signsInAs(DEEPIKAS_GOOGLE);
  await n.goto(`${there}/member/account`, { waitUntil: "networkidle" });
  await seen(nConnect());
  await nConnect().locator('input[name="password"]').fill(NANDINI.password);
  await withGoogle(n).click();
  await seen(n.getByText(/already opens a different account here/), 20_000);
  check("G19 nor can Deepika's own Google address be connected to a member's account", (await db.account(NANDINI.username)).google_sub === null && (await signedInAs(n)) === NANDINI.username);
  await n.context().close();

  // ------------------------------------------------------------- disconnecting
  await l.goto(`${there}/member/account`, { waitUntil: "networkidle" });
  await l.getByRole("button", { name: "Disconnect Google" }).click();
  await seen(l.locator("form", { hasText: "Your password, so we know" }));
  const unlinked = await until(async () => (await db.account(LATA.username)).google_sub === null);
  await signOut(l);
  fake.signsInAs(LATAS_GOOGLE);
  await withGoogle(l).click();
  await lands(l, /google=no-account/);
  check(
    "G20 she can disconnect it, because she has a password — and after that the Google account opens nothing",
    unlinked && (await db.account(LATA.username)).has_password === true && !(await hasSession(l)),
    JSON.stringify(await db.account(LATA.username))
  );
  await l.context().close();

  // ------------------------------------------------------------------ Deepika
  const c = await openPage(browser, "desktop", "Deepika, with Google", problems);
  fake.signsInAs(DEEPIKAS_GOOGLE);
  await signInPage(c);
  await withGoogle(c).click();
  await lands(c, /\/coach/);
  check(
    "G21 the Google address the deployment names as Deepika's opens her console, and nobody else's does",
    (await seen(c.getByRole("heading", { name: "Radar" }), 15_000)) && (await signedInAs(c)) === "deepika",
    `signed in as ${await signedInAs(c)}`
  );

  // If Sunita ever loses that Google account, Deepika can still get her in.
  await c.goto(`${there}/coach/members/sunita-verma`, { waitUntil: "networkidle" });
  await c.getByRole("button", { name: "Reset her password" }).click();
  await c.getByRole("button", { name: "Yes, reset it" }).click();
  const shown = c.locator("p.font-mono.tracking-wide");
  await seen(shown);
  const temporary = (await textOf(shown)).trim();
  const r = await openPage(browser, "phone", "Sunita, with the temporary password", problems);
  await signInPage(r);
  await r.fill('input[name="username"]', "sunita-verma");
  await r.fill('input[name="password"]', temporary);
  await r.getByRole("button", { name: "Sign in", exact: true }).click();
  await lands(r, `${there}/member`);
  account = await db.account("sunita-verma");
  check(
    "G22 a member who signs in with Google can still be given a temporary password by Deepika, and it lets her in — with Google still connected",
    /^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/.test(temporary) && (await signedInAs(r)) === "sunita-verma" && account.has_password === true && account.google_sub === SUNITA.sub,
    JSON.stringify(account)
  );
  await r.context().close();
  await c.context().close();
  await s.context().close();

  const logged = app.output().split("\n").filter((line) => /\[google\]/.test(line));
  const leaked = app.output().includes(CLIENT.clientSecret) || fake.asked.some((q) => app.output().includes(q.state));
  // The two that used to refuse without a word: an answer for another attempt
  // (G12, "state") and a return with no attempt behind it (G14). The first
  // real sign-in on the live site failed once on one of these, and nothing in
  // the log said which. Pressing Cancel (G11) is not a refusal and is not logged
  // as one.
  const says = (words) => logged.some((line) => line.includes(`sign-in refused: ${words}`));
  check(
    "G23 the server log names each refusal — the quiet ones too — and holds neither the client secret nor anything from an attempt",
    logged.length >= 7 && says("the state that came back is not this attempt's") && says("it came back with no attempt cookie") && !logged.some((line) => line.includes("access_denied")) && !leaked,
    `${logged.length} lines, e.g. ${logged.slice(0, 3).join(" | ")}`
  );
}
