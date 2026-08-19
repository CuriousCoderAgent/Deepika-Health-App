import Link from "next/link";
import { Check } from "lucide-react";

export const metadata = { title: "Account deleted — Deepika Wellness" };

/** Where deletion lands. Public, because by the time she reads it she is
 *  signed out and has no account to authenticate against. */
export default function AccountDeleted() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-paper px-8 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-effort-tint text-effort-stretch">
        <Check size={22} strokeWidth={2} />
      </span>
      <h1 className="mt-5 font-display text-[1.6rem] leading-tight">Your account is gone</h1>
      <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-ink-soft">
        Everything you logged has been deleted. Nothing was kept, and there is
        no copy to restore, which is what deleted should mean.
      </p>
      <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-ink-faint">
        You are welcome back any time — you would be starting fresh, with a new
        username.
      </p>
      <Link
        href="/"
        className="tap mt-7 inline-flex items-center rounded-xl bg-paper-sunk px-5 text-sm text-ink-soft hover:bg-ink-line"
      >
        Back to the start
      </Link>
    </main>
  );
}
