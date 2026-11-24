"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { ENGAGEMENT, matchesMember } from "@/lib/display";
import { lastSeen, lastSeenLabel } from "@/lib/dayView";
import MemberName from "./MemberName";
import type { Member } from "@/lib/types";

const OPEN = "quick-find-open";

/** Opens quick find from anywhere in the console. */
export function openQuickFind() {
  window.dispatchEvent(new Event(OPEN));
}

const PAGES = [
  { href: "/coach", label: "Radar", words: "radar today attention home" },
  { href: "/coach/members", label: "Members", words: "members cohort list invite" },
  { href: "/coach/messages", label: "Messages", words: "messages conversations replies inbox" },
  { href: "/coach/sessions", label: "Sessions", words: "sessions calls 1:1 schedule" },
  { href: "/coach/library", label: "Library", words: "library modules workouts" },
  { href: "/coach/notifications", label: "Notifications", words: "notifications reminders rules" },
  { href: "/coach/feedback", label: "Pilot feedback", words: "feedback bugs ideas" },
];

type Row =
  | { kind: "member"; member: Member; href: string }
  | { kind: "page"; label: string; href: string };

/**
 * Quick find: type a few letters of a name and go straight to her page.
 *
 * With twenty members the list is scannable; the point of this is the third
 * time in an hour that Deepika needs "Meera's page" while she is somewhere
 * else in the console. One shortcut (Ctrl or ⌘ K, or "/"), a few letters,
 * Enter. With nothing typed it leads with whoever has the most open on the
 * Radar, which is usually who she was about to look for.
 */
export default function QuickFind() {
  const router = useRouter();
  const { members, radar, actions, pulses, messages, foodEntries, workoutLogs } = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const show = () => {
      returnTo.current = document.activeElement as HTMLElement;
      setQ("");
      setActive(0);
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName ?? "");
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        show();
      } else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener(OPEN, show);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN, show);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Closing hands focus back to wherever she was. Opening is `autoFocus` on the
  // input below, so the box has focus the moment it exists: it used to be
  // focused on a 20ms timer, and a name typed straight after "/" lost its
  // first letter to the page behind.
  useEffect(() => {
    if (!open) returnTo.current?.focus?.();
  }, [open]);

  const rows: Row[] = useMemo(() => {
    const flags = (id: string) => radar.filter((r) => r.memberId === id && !r.resolved).length;
    const found = members
      .filter((m) => matchesMember(m, q))
      .sort((a, b) => flags(b.id) - flags(a.id) || a.name.localeCompare(b.name))
      .slice(0, 8)
      .map((member): Row => ({ kind: "member", member, href: `/coach/members/${member.id}` }));
    const term = q.trim().toLowerCase();
    const pages = PAGES.filter((p) => !term || p.label.toLowerCase().includes(term) || p.words.includes(term)).map(
      (p): Row => ({ kind: "page", label: p.label, href: p.href })
    );
    return [...found, ...pages];
  }, [members, radar, q]);

  const go = (row: Row | undefined) => {
    if (!row) return;
    setOpen(false);
    router.push(row.href);
  };

  if (!open) return null;

  const data = { actions, pulses, messages, foodEntries, workoutLogs };
  const firstPage = rows.findIndex((r) => r.kind === "page");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[8vh] sm:pt-[14vh]">
      <button aria-label="Close" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Find a member or a page"
        className="relative flex max-h-[76vh] w-full max-w-lg animate-rise flex-col overflow-hidden rounded-2xl bg-paper-card shadow-lift"
      >
        <div className="flex items-center gap-2.5 border-b border-ink-line px-4">
          <Search size={17} className="shrink-0 text-ink-faint" />
          <input
            ref={input}
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(rows.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(rows[active]);
              } else if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
              }
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls="quick-find-list"
            aria-activedescendant={rows[active] ? `quick-find-${active}` : undefined}
            aria-autocomplete="list"
            placeholder="A name, or a page"
            autoComplete="off"
            className="min-h-[52px] w-full bg-transparent text-[16px] placeholder:text-ink-faint focus:outline-none"
          />
          <kbd className="hidden shrink-0 rounded-md border border-ink-line px-1.5 py-0.5 font-mono text-[10px] text-ink-faint sm:block">
            esc
          </kbd>
        </div>

        <ul id="quick-find-list" role="listbox" aria-label="Results" className="overflow-y-auto p-1.5">
          {rows.length === 0 && (
            <li className="px-3 py-6 text-center text-[14px] text-ink-soft">Nobody and nothing by that name.</li>
          )}
          {rows.map((row, i) => (
            <li key={row.href} role="presentation">
              {i === firstPage && <p className="label px-3 pb-1 pt-2.5">Pages</p>}
              {i === 0 && row.kind === "member" && (
                <p className="label px-3 pb-1 pt-1.5">{q.trim() ? "Members" : "Members — most on your Radar first"}</p>
              )}
              <button
                id={`quick-find-${i}`}
                role="option"
                aria-selected={i === active}
                onClick={() => go(row)}
                onMouseMove={() => setActive(i)}
                className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 py-1.5 text-left ${
                  i === active ? "bg-paper-sunk" : ""
                }`}
              >
                {row.kind === "member" ? (
                  <>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper-sunk text-[12px] font-medium text-ink-soft ring-1 ring-ink-line">
                      {row.member.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium leading-snug">
                        <MemberName member={row.member} full />
                      </span>
                      <span className="block truncate text-[12px] leading-snug text-ink-faint">
                        {lastSeenLabel(lastSeen(row.member.id, data))} · Week {row.member.week}
                      </span>
                    </span>
                    <span className={`chip shrink-0 ${ENGAGEMENT[row.member.engagement].cls}`}>
                      {ENGAGEMENT[row.member.engagement].label}
                    </span>
                  </>
                ) : (
                  <span className="flex-1 pl-11 text-[15px]">{row.label}</span>
                )}
                {i === active && <CornerDownLeft size={14} className="hidden shrink-0 text-ink-faint sm:block" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
