import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { demoCredentials, sessionsAreSecure } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { as?: string; next?: string };
}) {
  const asCoach = searchParams.as === "coach";
  const role = asCoach ? "coach" : "member";
  const name = asCoach ? "Deepika" : "Radhika";
  const initial = asCoach ? "D" : "R";
  const subtitle = asCoach ? "Coach · your practice" : "Member · your plan for today";
  const next = searchParams.next || (asCoach ? "/coach" : "/member");

  const insecure = !sessionsAreSecure();
  const hint = asCoach ? demoCredentials.coach : demoCredentials.member;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-paper">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-40 h-96 w-96 rounded-full bg-marigold/[0.10] blur-3xl" />
        <div className="absolute -right-28 top-24 h-[26rem] w-[26rem] rounded-full bg-effort-min/25 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-14">
        <Link
          href="/"
          className="tap -ml-2 mb-6 inline-flex w-fit items-center gap-1 rounded-lg px-2 text-[13px] text-ink-faint hover:text-ink"
        >
          <ChevronLeft size={14} /> Back
        </Link>

        <div className="animate-rise flex items-center gap-3.5">
          <span
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-display text-xl text-white ${
              asCoach ? "bg-marigold" : "bg-effort-stretch"
            }`}
          >
            {initial}
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-[1.6rem] leading-tight">{name}</h1>
            <p className="text-[13px] text-ink-soft">{subtitle}</p>
          </div>
        </div>

        <LoginForm role={role} next={next} defaultUsername={hint.username} />

        {insecure && (
          <div className="mt-6 rounded-xl border border-dashed border-ink-line bg-paper-sunk/50 p-3.5">
            <p className="label mb-1.5">Preview access</p>
            <p className="text-[13px] leading-relaxed text-ink-soft">
              Sign in with{" "}
              <span className="font-mono text-ink">{hint.username}</span> /{" "}
              <span className="font-mono text-ink">{hint.password}</span>.
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
              These are shared preview credentials, fine while the app holds only
              sample data. Set AUTH_SECRET, COACH_PASSWORD and MEMBER_PASSWORD in
              the deployment environment before anyone real signs in.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
