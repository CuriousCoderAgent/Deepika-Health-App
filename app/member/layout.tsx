"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Activity, CalendarHeart, Home, MessageCircle, TrendingUp } from "lucide-react";
import { useStore } from "@/lib/store";

const tabs = [
  { href: "/member", label: "Today", icon: Home },
  { href: "/member/journey", label: "Journey", icon: CalendarHeart },
  { href: "/member/movement", label: "Movement", icon: Activity },
  { href: "/member/progress", label: "Insights", icon: TrendingUp },
  { href: "/member/coach", label: "Coach", icon: MessageCircle },
];

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { activeMember, messages, hydrated } = useStore();

  // A member who has never been through the first-run flow gets sent to it.
  // Waits for hydration, or it would bounce someone already onboarded on the
  // first frame, before their stored record has been read.
  useEffect(() => {
    if (hydrated && !activeMember.onboardedAt) router.replace("/onboarding");
  }, [hydrated, activeMember.onboardedAt, router]);

  const unread = messages.filter(
    (m) => m.memberId === activeMember.id && m.from !== "member" && !m.read
  ).length;

  return (
    /* h-dvh + overflow-hidden means the page itself never scrolls or pans.
       All scrolling happens inside the phone's content area, which keeps the
       navigation anchored and stops the whole document drifting sideways.

       There is deliberately no preview/"viewing as" chrome here any more: a
       member's app is the member's app, and the people being shown this need
       to walk the same path she walks. Switching back out happens through the
       profile control in the Today header, the way it would in a real app. */
    <div className="flex h-dvh flex-col overflow-hidden bg-paper-sunk/60">
      {/* Phone shell so Deepika reads this as a phone, not a website.
          On a real phone it fills the screen; on a desktop it becomes a fixed
          760px frame. Width is capped at the design reference viewport and
          fluid below it — a 360px Android gets the same layout in less room,
          not a shrunken copy of a 412px canvas. */}
      <div className="flex min-h-0 flex-1 justify-center sm:items-center sm:p-4">
        <div
          className="relative flex w-full flex-col overflow-hidden bg-paper shadow-lift sm:h-[760px] sm:max-h-full sm:rounded-[2.25rem] sm:border-[10px] sm:border-ink"
          style={{ maxWidth: "var(--phone-reference)" }}
        >
          <div className="scroll-hide min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>

          {/* Bottom sheets portal in here, so they stay inside the phone frame
              on a desktop instead of covering the browser window. */}
          <div id="sheet-root" />


          <nav className="safe-bottom shrink-0 border-t border-ink-line bg-paper-card/95 backdrop-blur">
            <div className="flex">
              {tabs.map((t) => {
                const active = path === t.href;
                const Icon = t.icon;
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={`tap relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] transition-colors ${
                      active ? "text-effort-stretch" : "text-ink-faint"
                    }`}
                  >
                    <Icon size={19} strokeWidth={active ? 2.2 : 1.7} />
                    {t.label}
                    {t.label === "Coach" && unread > 0 && (
                      <span className="absolute right-[26%] top-1.5 h-1.5 w-1.5 rounded-full bg-marigold" />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
