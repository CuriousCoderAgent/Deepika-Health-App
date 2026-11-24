"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Radar,
  Users,
  CalendarDays,
  Library,
  MessagesSquare,
  Bell,
  MessageSquareWarning,
  LogOut,
  Search,
  Ellipsis,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { isSampleMember } from "@/lib/dailyPlan";
import { PrivacyScreenSwitch } from "@/components/MemberName";
import QuickFind, { openQuickFind } from "@/components/QuickFind";
import Toaster from "@/components/Toast";

const nav = [
  { href: "/coach", label: "Radar", icon: Radar, hint: "Who needs me today" },
  { href: "/coach/members", label: "Members", icon: Users, hint: "The cohort" },
  { href: "/coach/sessions", label: "Sessions", icon: CalendarDays, hint: "Today's 1:1s" },
  { href: "/coach/library", label: "Library", icon: Library, hint: "Reusable modules" },
  { href: "/coach/messages", label: "Messages", icon: MessagesSquare, hint: "Conversations" },
  { href: "/coach/notifications", label: "Notifications", icon: Bell, hint: "Trigger → copy" },
  { href: "/coach/feedback", label: "Pilot feedback", icon: MessageSquareWarning, hint: "Bugs and ideas" },
];

/* On a phone: the four she lives in, and the rest one tap behind "More".
   Seven tabs in a bar that scrolled sideways left three of them off the edge
   of the screen, where nothing said they existed. */
const PRIMARY = ["/coach", "/coach/members", "/coach/messages", "/coach/sessions"];
const primary = PRIMARY.map((href) => nav.find((n) => n.href === href)!);
const more = nav.filter((n) => !PRIMARY.includes(n.href));

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { radar, messages, members, hydrated } = useStore();
  const hasSample = members.some((m) => isSampleMember(m.id));

  const attention = radar.filter((r) => r.bucket === "attention" && !r.resolved).length;
  const unread = messages.filter((m) => m.from === "member" && !m.read).length;
  const [moreOpen, setMoreOpen] = useState(false);
  const isActive = (href: string) => path === href || (href !== "/coach" && path.startsWith(href));
  const badgeFor = (label: string) => (label === "Radar" ? attention : label === "Messages" ? unread : 0);

  // Going anywhere closes the menu that took her there.
  useEffect(() => setMoreOpen(false), [path]);

  return (
    /* Column on a phone, row on a desktop. The sidebar is the only child that
       belongs beside the content, and it only exists at lg — so stacking below
       that keeps the mobile header full-width above the page instead of
       becoming a second column next to it. */
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-ink-line bg-paper-card lg:flex">
        <div className="px-5 pt-6">
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink"
            >
              <LogOut size={13} /> Sign out
            </button>
          </form>
          <p className="label mt-4">Coach console</p>
          <p className="mt-1 font-display text-xl leading-tight">Deepika</p>
          <div className="mt-2">
            <PrivacyScreenSwitch />
          </div>
        </div>

        <div className="mt-5 px-3">
          <button
            onClick={openQuickFind}
            className="flex w-full items-center gap-2 rounded-xl border border-ink-line bg-paper px-3 py-2 text-left text-[13px] text-ink-faint transition-colors hover:border-effort-target hover:text-ink-soft"
          >
            <Search size={14} className="shrink-0" />
            <span className="flex-1">Find a member</span>
            <kbd className="rounded border border-ink-line px-1 font-mono text-[10px]">/</kbd>
          </button>
        </div>

        <nav className="mt-3 flex-1 px-3">
          {nav.map((n) => {
            const active = isActive(n.href);
            const Icon = n.icon;
            const badge = badgeFor(n.label);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`mb-0.5 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-ink text-white"
                    : "text-ink-soft hover:bg-paper-sunk hover:text-ink"
                }`}
              >
                <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                <span className="flex-1">{n.label}</span>
                {badge > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] ${
                      active ? "bg-white/20 text-white" : "bg-attention-tint text-attention"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Only true while sample members are present. It used to say, for
            everyone and always, "Fictional members, no real health data" —
            which stopped being so the day real women signed up. */}
        {hasSample && (
          <div className="border-t border-ink-line p-4">
            <p className="text-[11px] leading-relaxed text-ink-faint">
              Some members here are fictional samples. You can remove them from Members.
            </p>
          </div>
        )}
      </aside>

      {/* Mobile header. The sidebar holds the only way to sign out, and it is
          hidden below lg — which left Deepika signed in on her phone with no
          way out short of clearing cookies. */}
      <div
        className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b border-ink-line bg-paper-card/95 px-4 py-2.5 backdrop-blur lg:hidden"
        style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top))" }}
      >
        <div>
          <p className="label">Coach console</p>
          <p className="font-display text-lg leading-tight">Deepika</p>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={openQuickFind}
            aria-label="Find a member"
            className="tap inline-flex items-center justify-center rounded-xl px-2.5 text-ink-soft hover:bg-paper-sunk hover:text-ink"
          >
            <Search size={17} />
          </button>
          <PrivacyScreenSwitch compact />
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="tap inline-flex items-center gap-1.5 rounded-xl px-3 text-[13px] text-ink-soft hover:bg-paper-sunk hover:text-ink"
            >
              <LogOut size={15} /> Sign out
            </button>
          </form>
        </div>
      </div>

      {/* Mobile nav */}
      <nav
        aria-label="Console"
        className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-ink-line bg-paper-card/95 backdrop-blur lg:hidden"
      >
        <div className="flex">
          {primary.map((n) => {
            const active = isActive(n.href);
            const Icon = n.icon;
            const badge = badgeFor(n.label);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`tap relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] ${
                  active ? "font-medium text-ink" : "text-ink-faint"
                }`}
              >
                <span className={`flex h-7 w-12 items-center justify-center rounded-full ${active ? "bg-paper-sunk" : ""}`}>
                  <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                </span>
                {n.label}
                {badge > 0 && (
                  <span className="absolute left-1/2 top-1 ml-2 min-w-[16px] rounded-full bg-attention px-1 text-center font-mono text-[10px] leading-4 text-white">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={`tap flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] ${
              more.some((n) => isActive(n.href)) ? "font-medium text-ink" : "text-ink-faint"
            }`}
          >
            <span
              className={`flex h-7 w-12 items-center justify-center rounded-full ${
                more.some((n) => isActive(n.href)) ? "bg-paper-sunk" : ""
              }`}
            >
              <Ellipsis size={18} />
            </span>
            More
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end lg:hidden">
          <button aria-label="Close" onClick={() => setMoreOpen(false)} className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More"
            className="safe-bottom relative animate-rise rounded-t-[1.5rem] bg-paper-card px-3 pb-3 pt-2 shadow-lift"
          >
            <div className="flex items-center justify-between px-2 pb-1">
              <p className="label">More</p>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className="tap flex items-center justify-center rounded-lg text-ink-faint hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
            {more.map((n) => {
              const Icon = n.icon;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`tap flex items-center gap-3 rounded-xl px-3 text-[15px] ${
                    isActive(n.href) ? "bg-paper-sunk font-medium text-ink" : "text-ink-soft hover:bg-paper-sunk"
                  }`}
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="flex-1">{n.label}</span>
                  <span className="text-[12px] text-ink-faint">{n.hint}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <QuickFind />
      <Toaster console />

      {/* Held back until the store has loaded. Before that it holds the seeded
          sample cohort, so every page load showed Deepika six fictional women
          for a moment — including on a deployment where she had already
          removed them. */}
      <main className="min-w-0 flex-1 pb-20 lg:pb-0">
        {hydrated ? (
          children
        ) : (
          <p className="px-6 py-10 text-sm text-ink-faint" role="status">
            Loading your members…
          </p>
        )}
      </main>
    </div>
  );
}
