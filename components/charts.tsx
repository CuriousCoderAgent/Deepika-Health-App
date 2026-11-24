"use client";

import { useWidth } from "@/lib/useWidth";

/**
 * Charts for Insights.
 *
 * The page used to show two bare sparklines — a line with no scale, no days
 * and no numbers, which looks like data and tells her nothing. These are the
 * replacement, built to a few fixed rules:
 *
 *  - One measure per plot, each named by its title. Energy, sleep and calm are
 *    three small charts on a shared day axis rather than three lines on one:
 *    on a 1–5 scale they sit on top of each other, and the two colours the old
 *    page used for them fail a colour-distance check (too close to tell apart
 *    reliably, worse with colour-blindness). So there is one data colour, and
 *    identity is carried by words.
 *  - Every value is reachable without hovering: tap or drag across a chart, or
 *    use the arrow keys, and the day's numbers are printed beside it; the whole
 *    range is also offered as a table.
 *  - A day she did not rate is a gap, never a zero.
 *  - Drawn at the real pixel width, so circles are circles and text is not
 *    stretched (the sparkline scaled its viewBox and squashed its dots).
 *
 * Descriptive only: these plot what she logged and say nothing about what it
 * means.
 */

/** The one data colour (effort.stretch) and its quieter form for unselected bars. */
const DATA = "#3F6B57";
const DATA_SOFT = "#6E8F73";
const GRID = "#E2E0DA";
const AXIS_TEXT = "#6B7A8A";

export interface XPoint {
  /** Under the axis: a weekday letter, a date, or nothing. */
  short: string;
  /** In the readout: "Sat 21 Nov", "17–23 Nov". */
  long: string;
  /** Today's tick is set a little heavier. */
  now?: boolean;
}

/**
 * Tap, drag, hover or arrow-key across a plot to choose a point. The pointer
 * only has to be nearest a day, never on a 2px line.
 */
function scrubHandlers(
  count: number,
  indexAt: (clientX: number, el: Element) => number,
  selected: number,
  onSelect: (i: number) => void
) {
  const clamp = (i: number) => Math.max(0, Math.min(count - 1, i));
  return {
    onPointerDown: (e: React.PointerEvent) => onSelect(clamp(indexAt(e.clientX, e.currentTarget))),
    onPointerMove: (e: React.PointerEvent) => {
      // A mouse scrubs on hover; a finger scrubs while it is down.
      if (e.pointerType === "mouse" || e.buttons > 0) onSelect(clamp(indexAt(e.clientX, e.currentTarget)));
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      const next =
        e.key === "ArrowLeft" ? selected - 1
        : e.key === "ArrowRight" ? selected + 1
        : e.key === "Home" ? 0
        : e.key === "End" ? count - 1
        : null;
      if (next === null) return;
      e.preventDefault();
      onSelect(clamp(next));
    },
  };
}

function XAxis({
  x,
  at,
  y,
  selected,
}: {
  x: XPoint[];
  at: (i: number) => number;
  y: number;
  selected: number;
}) {
  return (
    <>
      {x.map((p, i) =>
        p.short ? (
          <text
            key={i}
            x={at(i)}
            y={y}
            textAnchor={i === 0 && p.short.length > 2 ? "start" : i === x.length - 1 && p.short.length > 2 ? "end" : "middle"}
            fontSize={10}
            fontWeight={i === selected || p.now ? 600 : 400}
            fill={i === selected ? "#15232F" : AXIS_TEXT}
            className="font-mono"
          >
            {p.short}
          </text>
        ) : null
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Trend rows — small multiples on one shared axis                      */
/* ------------------------------------------------------------------ */

export interface TrendRow {
  key: string;
  title: string;
  values: (number | null)[];
}

export function TrendRows({
  rows,
  x,
  selected,
  onSelect,
  label,
  min = 1,
  max = 5,
  format = (v) => String(v),
}: {
  rows: TrendRow[];
  x: XPoint[];
  selected: number;
  onSelect: (i: number) => void;
  /** What this is, for a screen reader. */
  label: string;
  min?: number;
  max?: number;
  format?: (v: number) => string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const LEFT = 62;
  const RIGHT = 38;
  const INSET = 7;
  const ROW_H = 56;
  const PAD = 9;
  const AXIS_H = 20;
  const n = x.length;
  const plotW = Math.max(0, width - LEFT - RIGHT);
  const step = n > 1 ? (plotW - 2 * INSET) / (n - 1) : 0;
  const at = (i: number) => LEFT + INSET + i * step;
  const height = rows.length * ROW_H + AXIS_H;
  const yOf = (row: number, v: number) =>
    row * ROW_H + PAD + (1 - (v - min) / (max - min)) * (ROW_H - 2 * PAD);

  const scrub = scrubHandlers(
    n,
    (clientX, el) => Math.round((clientX - el.getBoundingClientRect().left - LEFT - INSET) / (step || 1)),
    selected,
    onSelect
  );

  const readout = rows
    .map((r) => {
      const v = r.values[selected];
      return `${r.title} ${v === null || v === undefined ? "not rated" : format(v)}`;
    })
    .join(", ");

  return (
    <div
      ref={ref}
      role="group"
      tabIndex={0}
      aria-label={`${label}. Use the left and right arrow keys to move between ${n} points.`}
      className="relative select-none rounded-lg outline-offset-4"
      style={{ touchAction: "pan-y" }}
      {...scrub}
    >
      <span className="sr-only" aria-live="polite">
        {x[selected]?.long}: {readout}
      </span>
      {width > 0 && (
        <svg width={width} height={height} aria-hidden="true" className="block">
          {/* The chosen point, across every row at once. */}
          <line x1={at(selected)} x2={at(selected)} y1={2} y2={rows.length * ROW_H - 2} stroke="#B9B6AE" strokeWidth={1} />

          {rows.map((r, ri) => {
            const pts = r.values
              .map((v, i) => (v === null || v === undefined ? null : { i, x: at(i), y: yOf(ri, v) }))
              .filter((p): p is { i: number; x: number; y: number } => p !== null);
            const chosen = r.values[selected];
            return (
              <g key={r.key}>
                {[min, (min + max) / 2, max].map((g) => (
                  <line key={g} x1={LEFT} x2={LEFT + plotW} y1={yOf(ri, g)} y2={yOf(ri, g)} stroke={GRID} strokeWidth={1} />
                ))}
                <text x={0} y={ri * ROW_H + ROW_H / 2 + 4} fontSize={13} fontWeight={500} fill="#3D4F60">
                  {r.title}
                </text>
                <text x={LEFT - 5} y={yOf(ri, max) + 3} textAnchor="end" fontSize={9} fill={AXIS_TEXT} className="font-mono">
                  {max}
                </text>
                <text x={LEFT - 5} y={yOf(ri, min) + 3} textAnchor="end" fontSize={9} fill={AXIS_TEXT} className="font-mono">
                  {min}
                </text>

                {/* Next-day points are joined by the line proper; across a
                    gap, a faint thread keeps the eye moving without claiming
                    there was a reading there. */}
                {pts.slice(1).map((p, k) => {
                  const prev = pts[k];
                  const adjacent = p.i - prev.i === 1;
                  return (
                    <line
                      key={p.i}
                      x1={prev.x}
                      y1={prev.y}
                      x2={p.x}
                      y2={p.y}
                      stroke={DATA}
                      strokeWidth={adjacent ? 2 : 1}
                      strokeOpacity={adjacent ? 1 : 0.3}
                      strokeLinecap="round"
                    />
                  );
                })}
                {pts.map((p) => (
                  <circle
                    key={p.i}
                    cx={p.x}
                    cy={p.y}
                    r={p.i === selected ? 5.5 : 4}
                    fill={DATA}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                ))}

                {/* The value leads; the row title already says what it is. */}
                <text
                  x={width - 1}
                  y={ri * ROW_H + ROW_H / 2 + 5}
                  textAnchor="end"
                  fontSize={chosen === null || chosen === undefined ? 13 : 16}
                  fontWeight={600}
                  fill={chosen === null || chosen === undefined ? AXIS_TEXT : "#15232F"}
                >
                  {chosen === null || chosen === undefined ? "–" : format(chosen)}
                </text>
              </g>
            );
          })}

          <XAxis x={x} at={at} y={rows.length * ROW_H + 14} selected={selected} />
        </svg>
      )}
      {width === 0 && <div style={{ height }} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Columns — an amount per day or per week                              */
/* ------------------------------------------------------------------ */

function niceMax(v: number): number {
  if (v <= 7) return 7;
  const stepSize = v <= 40 ? 10 : v <= 100 ? 20 : 50;
  return Math.ceil(v / stepSize) * stepSize;
}

export function Columns({
  x,
  values,
  selected,
  onSelect,
  label,
  unit = "",
  target,
  fixedMax,
  height = 140,
}: {
  x: XPoint[];
  values: (number | null)[];
  selected: number;
  onSelect: (i: number) => void;
  label: string;
  unit?: string;
  /** A level someone set — drawn as a dashed line, which is what dashes are for. */
  target?: number;
  fixedMax?: number;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const LEFT = 26;
  const RIGHT = 4;
  const TOP = 18;
  const AXIS_H = 20;
  const n = x.length;
  const plotW = Math.max(0, width - LEFT - RIGHT);
  const plotH = height - TOP - AXIS_H;
  const slot = n ? plotW / n : 0;
  // Thin bars with air between them: never wider than 24px, never touching.
  const barW = Math.max(3, Math.min(24, slot - 4));
  const at = (i: number) => LEFT + slot * (i + 0.5);
  const top = fixedMax ?? niceMax(Math.max(target ?? 0, ...values.map((v) => v ?? 0), 1));
  const yOf = (v: number) => TOP + plotH * (1 - Math.min(v, top) / top);
  const base = TOP + plotH;

  const scrub = scrubHandlers(
    n,
    (clientX, el) => Math.floor((clientX - el.getBoundingClientRect().left - LEFT) / (slot || 1)),
    selected,
    onSelect
  );

  const chosen = values[selected];
  const ticks = [0, top];

  return (
    <div
      ref={ref}
      role="group"
      tabIndex={0}
      aria-label={`${label}. Use the left and right arrow keys to move between ${n} points.`}
      className="relative select-none rounded-lg outline-offset-4"
      style={{ touchAction: "pan-y" }}
      {...scrub}
    >
      <span className="sr-only" aria-live="polite">
        {x[selected]?.long}: {chosen === null || chosen === undefined ? "nothing logged" : `${chosen}${unit}`}
      </span>
      {width > 0 && (
        <svg width={width} height={height} aria-hidden="true" className="block">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={LEFT} x2={LEFT + plotW} y1={yOf(t)} y2={yOf(t)} stroke={GRID} strokeWidth={1} />
              <text x={LEFT - 5} y={yOf(t) + 3} textAnchor="end" fontSize={9} fill={AXIS_TEXT} className="font-mono">
                {t}
              </text>
            </g>
          ))}
          {target !== undefined && target > 0 && (
            <>
              <line
                x1={LEFT}
                x2={LEFT + plotW}
                y1={yOf(target)}
                y2={yOf(target)}
                stroke="#6B7A8A"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
              {target < top * 0.88 && (
                <text x={LEFT - 5} y={yOf(target) + 3} textAnchor="end" fontSize={9} fontWeight={600} fill="#3D4F60" className="font-mono">
                  {target}
                </text>
              )}
            </>
          )}

          {values.map((v, i) => {
            if (v === null || v === undefined) return null;
            const y = Math.min(yOf(v), base - 2); // a logged zero still shows as a sliver
            const h = base - y;
            const r = Math.min(4, barW / 2, h);
            const x0 = at(i) - barW / 2;
            const x1 = at(i) + barW / 2;
            return (
              <path
                key={i}
                d={`M${x0},${base} V${y + r} Q${x0},${y} ${x0 + r},${y} H${x1 - r} Q${x1},${y} ${x1},${y + r} V${base} Z`}
                fill={i === selected ? DATA : DATA_SOFT}
              />
            );
          })}

          {/* One label, on the chosen bar — not a number on every bar. */}
          {chosen !== null && chosen !== undefined && (
            <text
              x={Math.max(LEFT + 14, Math.min(LEFT + plotW - 14, at(selected)))}
              y={Math.min(yOf(chosen), base - 2) - 5}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              fill="#15232F"
            >
              {chosen}
              {unit}
            </text>
          )}

          <XAxis x={x} at={at} y={base + 14} selected={selected} />
        </svg>
      )}
      {width === 0 && <div style={{ height }} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Figures and the table twin                                           */
/* ------------------------------------------------------------------ */

/** A plain count. The number is the point, so it is all there is. */
export function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] leading-snug text-ink-faint">{label}</p>
      <p className="mt-0.5 text-[1.35rem] font-semibold leading-tight text-ink">{value}</p>
      {note && <p className="mt-0.5 text-[11px] leading-snug text-ink-faint">{note}</p>}
    </div>
  );
}

/** Every number a chart holds, as rows — the same data without the drawing. */
export function DataTable({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={h}
                scope="col"
                className={`border-b border-ink-line py-1.5 font-medium text-ink-soft ${i === 0 ? "text-left" : "text-right"}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((c, ci) =>
                ci === 0 ? (
                  <th key={ci} scope="row" className="whitespace-nowrap border-b border-ink-line/60 py-1.5 text-left font-normal text-ink">
                    {c}
                  </th>
                ) : (
                  <td key={ci} className="border-b border-ink-line/60 py-1.5 text-right tabular-nums text-ink-soft">
                    {c}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
