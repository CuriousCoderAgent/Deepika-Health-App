"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CalendarHeart, Home, MessageCircle, TrendingUp, ChevronLeft } from "lucide-react";
import { useStore } from "@/lib/store";

const tabs = [
  { href: "/member", label: "Today", icon: Home },
  { href: "/member/journey", label: "Journey", icon: CalendarHeart },
  { href: "/member/movement", label: "Movement", icon: Activity },
  { href: "/member/progress", label: "Progress", icon: TrendingUp },
  { href: "/member/coach", label: "Coach", icon: MessageCircle },
];

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { members, activeMember, setActiveMember, messages } = useStore();

  const unread = messages.filter(
    (m) => m.memberId === activeMember.id && m.from !== "member" && !m.read
  ).length;

  return (
    <div className="min-h-dvh bg-paper-sunk/60">
      {/* Persona switcher — sits outside the phone. It is a demo control,
          not part of the product, so it must not look like part of the product. */}
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 pt-5 pb-3">
        <Link
          href="/"
          className="tap inline-flex items-center gap-1 rounded-lg px-2 text-xs text-ink-faint hover:text-ink"
        >
          <ChevronLeft size={14} /> Home
        </Link>
        <span className="label mr-1">Viewing as</span>
        {members.map((m) => (
          <button
            key={m.id}
            onClick={() => setActiveMember(m.id)}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              m.id === activeMember.id
                ? "bg-ink text-white"
                : "bg-paper-card text-ink-soft hover:bg-white"
            }`}
          >
            {m.name.split(" ")[0]}
          </button>
        ))}
      </div>

      {/* Phone shell so Deepika reads this as a phone, not a website. */}
      <div className="mx-auto w-full max-w-[430px] px-0 pb-6 sm:px-4">
        <div className="relative overflow-hidden bg-paper shadow-lift sm:rounded-[2.25rem] sm:border-[10px] sm:border-ink">
          <div className="scroll-hide h-[calc(100dvh-8.5rem)] overflow-y-auto pb-24 sm:h-[760px]">
            {children}
          </div>

          <nav className="absolute inset-x-0 bottom-0 border-t border-ink-line bg-paper-card/95 backdrop-blur">
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
