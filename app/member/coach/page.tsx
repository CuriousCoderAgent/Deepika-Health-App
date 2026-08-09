"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Mic, Send, CalendarClock, RefreshCw } from "lucide-react";
import { useStore } from "@/lib/store";

export default function CoachInbox() {
  const { activeMember: m, messages, sendMessage, markRead, sessions } = useStore();
  const [draft, setDraft] = useState("");

  useEffect(() => {
    markRead(m.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.id]);

  const thread = messages
    .filter((x) => x.memberId === m.id)
    .sort((a, b) => a.dayOffset - b.dayOffset);

  const upcoming = sessions
    .filter((s) => s.memberId === m.id && s.status === "scheduled")
    .sort((a, b) => a.dayOffset - b.dayOffset)[0];

  const past = sessions
    .filter((s) => s.memberId === m.id && s.status === "complete" && s.memberRecap)
    .sort((a, b) => b.dayOffset - a.dayOffset)[0];

  return (
    <div className="animate-rise px-5 pt-8">
      <h1 className="font-display text-[1.7rem] leading-tight">Deepika</h1>
      <p className="mt-1.5 text-[15px] text-ink-soft">Your coach, not a chatbot.</p>

      {upcoming && (
        <div className="mt-6 card p-4">
          <div className="flex items-center gap-2.5">
            <CalendarClock size={16} className="text-ink-soft" />
            <p className="text-[15px] font-medium">
              {upcoming.type},{" "}
              {upcoming.dayOffset === 0
                ? "today"
                : upcoming.dayOffset === 1
                ? "tomorrow"
                : `in ${upcoming.dayOffset} days`}
            </p>
          </div>
          <p className="mt-1 text-[13px] text-ink-soft">
            {upcoming.time} · {upcoming.mode}
          </p>
          {upcoming.memberQuestions.length > 0 && (
            <div className="mt-3 border-t border-ink-line pt-3">
              <p className="label">Your questions for this session</p>
              <ul className="mt-1.5 space-y-1">
                {upcoming.memberQuestions.map((q, i) => (
                  <li key={i} className="text-[14px] leading-snug text-ink-soft">
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Link
            href="/member/reflection"
            className="tap mt-3 inline-flex items-center rounded-lg text-[14px] text-effort-stretch underline underline-offset-2"
          >
            Fill in the two-minute reflection
          </Link>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {thread.map((msg) => {
          if (msg.kind === "plan_update") {
            return (
              <div key={msg.id} className="rounded-2xl bg-paper-sunk/80 p-4">
                <div className="flex items-center gap-2">
                  <RefreshCw size={13} className="text-ink-soft" />
                  <p className="label">Plan update · {msg.time}</p>
                </div>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">{msg.body}</p>
              </div>
            );
          }

          const mine = msg.from === "member";

          return (
            <div key={msg.id} className={mine ? "flex justify-end" : ""}>
              <div
                className={`max-w-[85%] rounded-2xl p-4 ${
                  mine
                    ? "bg-ink text-white"
                    : "border border-marigold/25 bg-marigold-tint/60"
                }`}
              >
                {msg.kind === "voice" && (
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-marigold text-white">
                      <Mic size={11} />
                    </span>
                    <span className="font-mono text-[10px] text-marigold-deep">
                      VOICE NOTE · {msg.seconds}s
                    </span>
                  </div>
                )}
                <p
                  className={`text-[14px] leading-relaxed ${
                    mine ? "text-white/95" : "text-ink"
                  }`}
                >
                  {msg.body}
                </p>
                <p
                  className={`mt-1.5 text-[11px] ${
                    mine ? "text-white/50" : "text-marigold-deep/60"
                  }`}
                >
                  {msg.time}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {past?.memberRecap && (
        <div className="mt-6 card p-4">
          <p className="label">From your last session</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">{past.memberRecap}</p>
          {past.commitments.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {past.commitments.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-[14px]">
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      c.done ? "bg-effort-target" : "bg-paper-sunk"
                    }`}
                  />
                  <span className={c.done ? "text-ink-faint line-through" : ""}>{c.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="sticky bottom-0 mt-6 flex gap-2 bg-paper pb-4 pt-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask Deepika something"
          className="tap flex-1 rounded-xl border border-ink-line bg-paper-card px-3.5 text-[14px] placeholder:text-ink-faint focus:border-effort-target focus:outline-none"
        />
        <button
          disabled={!draft.trim()}
          onClick={() => {
            sendMessage(m.id, {
              from: "member",
              kind: "text",
              body: draft.trim(),
              dayOffset: 0,
              time: "just now",
              read: false,
            });
            setDraft("");
          }}
          className="tap flex w-12 items-center justify-center rounded-xl bg-ink text-white disabled:opacity-30"
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </div>

      <p className="pb-4 text-[11px] leading-relaxed text-ink-faint">
        For anything urgent or medical, contact your doctor rather than waiting for
        a reply here.
      </p>
    </div>
  );
}
