import Link from "next/link";

export const metadata = {
  title: "Privacy — Deepika Wellness",
  description:
    "What Deepika Wellness stores about you, who can see it, and how to have it deleted.",
};

/**
 * The privacy policy, written from what the code actually does.
 *
 * Public and unauthenticated on purpose: the Play Store listing links to it,
 * and someone deciding whether to sign up has to be able to read it before
 * she has an account. Every claim here is checkable against the repository —
 * if the app changes, this changes with it.
 */

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "hello@deepikawellness.in";
const UPDATED = "19 August 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-[1.25rem] leading-tight">{title}</h2>
      <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

export default function Privacy() {
  return (
    <main className="min-h-dvh bg-paper">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link href="/" className="tap text-[13px] text-ink-soft hover:text-ink">
          ← Deepika Wellness
        </Link>

        <h1 className="mt-6 font-display text-[2rem] leading-tight">Privacy</h1>
        <p className="mt-2 text-[13px] text-ink-faint">Last updated {UPDATED}</p>

        <p className="mt-6 text-[15px] leading-relaxed text-ink-soft">
          This app is used by a small number of people coached by Deepika. It
          holds things you tell it about your health, so it is worth being
          precise about what happens to that. Everything below describes what
          the app actually does, not what it might do later.
        </p>

        <Section title="What we store">
          <p>Only what you enter, and only because the coaching needs it:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Your name, the username you chose, and your password.</li>
            <li>
              What you answered when you started: your age, how you describe
              yourself, where you are in your cycle or your training, your
              goals, and what you told us you will not do.
            </li>
            <li>
              What you log day to day: actions completed, how your energy,
              sleep and stress felt, symptoms you noted, workouts and how hard
              they were, and food you recorded.
            </li>
            <li>Messages between you and Deepika.</li>
            <li>
              Values from any blood report or body composition reading you chose
              to upload. Uploading these is optional and separate — you can use
              everything else without it.
            </li>
          </ul>
          <p>
            Your password is stored as a scrypt hash, not as text. Nobody can
            read it back — not Deepika, not us, and not anyone who obtained a
            copy of the database. That is also why nobody can tell you what it
            was if you forget it.
          </p>
        </Section>

        <Section title="Who can see it">
          <p>
            Deepika, because she is coaching you. No other member can see your
            data, and there is no public profile, feed or leaderboard anywhere
            in the app.
          </p>
          <p>
            We do not sell it, rent it, share it for advertising, or use it to
            train anything. There is no advertising in this app.
          </p>
        </Section>

        <Section title="What Deepika does and does not do with it">
          <p>
            Deepika is a health coach and personal trainer. She reads what you
            log and uses her judgement to adjust your plan and talk to you about
            it.
          </p>
          <p>
            The app does not interpret your blood work or diagnose anything. It
            records the numbers and shows you how they have moved. Deciding what
            a result means is a doctor&rsquo;s job, and if something you upload
            needs medical attention Deepika will tell you to see one.
          </p>
        </Section>

        <Section title="Where it lives">
          <p>
            In a Postgres database, on servers run by our hosting providers, and
            reached only over encrypted connections. Your session is held in a
            signed, HTTP-only cookie, which means the page&rsquo;s own
            JavaScript cannot read it.
          </p>
          <p>
            A copy is also kept in your phone&rsquo;s browser storage so the app
            works while your connection drops. Signing out or deleting your
            account clears it.
          </p>
          <p>
            The app has no analytics, no tracking pixels and no third-party
            software watching what you do. The single request that leaves for
            anyone else is to Google Fonts, which loads the typefaces and in
            doing so sees your IP address — the same as on most of the web, and
            the only outside party involved at all.
          </p>
        </Section>

        <Section title="Deleting everything">
          <p>
            Open <span className="font-medium text-ink">Your account</span> from
            the Today screen and choose delete. It removes your account and
            everything in it immediately — logs, check-ins, messages, uploads.
            There is no grace period, no archive, and no backup copy anyone can
            restore it from.
          </p>
          <p>
            If you cannot sign in, email{" "}
            <a className="font-medium text-effort-stretch underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>{" "}
            from the address Deepika knows you by and ask. See{" "}
            <Link href="/delete-account" className="font-medium text-effort-stretch underline">
              deleting your account
            </Link>
            .
          </p>
          <p>
            The one thing kept afterwards is the username itself, recorded so it
            is not reissued to someone else. Nothing about you is attached to
            it.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p>
            While you have an account. There is no automatic expiry, because a
            record of how your energy moved over a year is the point of keeping
            it at all. When you delete your account it goes immediately.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            Under India&rsquo;s Digital Personal Data Protection Act you can ask
            what is held about you, have it corrected, and have it erased. The
            first is visible in the app, the second you can edit yourself, and
            the third is the delete button. For anything that is not covered by
            those, email{" "}
            <a className="font-medium text-effort-stretch underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
          <p>
            You agreed to your data being stored when you started, and to
            uploading reports separately if you did. You can withdraw either by
            deleting your account.
          </p>
        </Section>

        <Section title="Children">
          <p>
            This is built for adults and accounts are not offered to anyone
            under 18.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            If what the app does with your data changes, this page changes with
            it and the date at the top moves. Anything material will also come
            to you from Deepika directly, rather than only appearing here.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            <a className="font-medium text-effort-stretch underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </p>
        </Section>

        <p className="mt-12 border-t border-ink-line pt-5 text-[12px] leading-relaxed text-ink-faint">
          Deepika Wellness is coaching, not medical care. Nothing in the app is
          a diagnosis or a treatment plan. If something about your health worries
          you, please see a doctor.
        </p>
      </div>
    </main>
  );
}
