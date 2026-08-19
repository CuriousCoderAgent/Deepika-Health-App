import Link from "next/link";

export const metadata = {
  title: "Deleting your account — Deepika Wellness",
  description:
    "How to delete your Deepika Wellness account and everything stored in it.",
};

/**
 * The account-deletion instructions, public and unauthenticated.
 *
 * This exact page is what goes in the Play Store listing's "Account deletion
 * URL" field. Google requires it to be reachable without signing in, because
 * the person reading it may be someone who cannot sign in — which is also the
 * case it has to actually answer, not just link past.
 */

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "hello@deepikawellness.in";

export default function DeleteAccount() {
  return (
    <main className="min-h-dvh bg-paper">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link href="/" className="tap text-[13px] text-ink-soft hover:text-ink">
          ← Deepika Wellness
        </Link>

        <h1 className="mt-6 font-display text-[2rem] leading-tight">
          Deleting your account
        </h1>

        <p className="mt-5 text-[15px] leading-relaxed text-ink-soft">
          You can delete your account and everything in it yourself, from inside
          the app. It takes about ten seconds and nobody has to approve it.
        </p>

        <ol className="mt-6 space-y-3 text-[15px] leading-relaxed text-ink-soft">
          {[
            "Sign in and open the Today screen.",
            "Tap “Your account” at the bottom of the screen.",
            "Under “Delete your account”, type your username to confirm.",
            "Tap “Delete my account and all my data”.",
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper-sunk font-mono text-[12px] text-ink-soft">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <h2 className="mt-10 font-display text-[1.25rem] leading-tight">
          What gets deleted
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          All of it, straight away: your account and password, your profile and
          the answers you gave when you started, everything you logged —
          actions, check-ins, workouts, food — your messages with Deepika, and
          any blood report or body composition values you uploaded. It also
          clears the copy held in your phone&rsquo;s browser storage.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          There is no grace period and no archive. Deepika does not keep a
          separate copy, so once it is done nobody can bring it back.
        </p>

        <h2 className="mt-8 font-display text-[1.25rem] leading-tight">What is kept</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          Your username alone, recorded so that it is never handed to somebody
          else. Nothing about you stays attached to it.
        </p>

        <h2 className="mt-8 font-display text-[1.25rem] leading-tight">
          If you cannot sign in
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          Email{" "}
          <a
            className="font-medium text-effort-stretch underline"
            href={`mailto:${SUPPORT_EMAIL}?subject=Delete%20my%20account`}
          >
            {SUPPORT_EMAIL}
          </a>{" "}
          from the address Deepika knows you by, and say which username to
          delete. She will confirm with you and do it, normally within a few
          days.
        </p>

        <p className="mt-10 border-t border-ink-line pt-5 text-[13px] leading-relaxed text-ink-faint">
          What is stored in the first place, and why, is set out in the{" "}
          <Link href="/privacy" className="font-medium text-effort-stretch underline">
            privacy policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
