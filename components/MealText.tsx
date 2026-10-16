"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import type { FoodItem } from "@/lib/types";
import { hourOf } from "@/lib/calendar";
import {
  MEALS,
  formatQty,
  mealForHour,
  parseMeal,
  stepQty,
  type Meal,
} from "@/lib/foodParse";

export type CheckedFood = { item: FoodItem; qty: number; protein: number };

/**
 * Type a meal, check it, add it.
 *
 * Read as she types, so she sees straight away whether "phulka" was
 * understood, and nothing is saved until she says so. Every amount can be
 * nudged first. The words are matched against the food list
 * (lib/foodParse.ts) — no AI, and nothing here says or implies otherwise.
 */
export default function MealText({
  foods,
  handled,
  onAdd,
  onUndo,
  onAddYourself,
}: {
  foods: FoodItem[];
  /** Unrecognised phrases she has since added herself — no longer asked about. */
  handled: string[];
  /** Saves the checked entries and returns their ids, for undo. */
  onAdd: (rows: CheckedFood[], meal: Meal) => string[];
  onUndo: (ids: string[]) => void;
  onAddYourself: (name: string, qty: number, meal: Meal) => void;
}) {
  const [text, setText] = useState("");
  // Her corrections, by dish: a new amount, or 0 for "not this one".
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [mealChoice, setMealChoice] = useState<Meal | null>(null);
  const [added, setAdded] = useState<{ ids: string[]; meal: Meal; protein: number } | null>(null);

  const parsed = useMemo(() => parseMeal(text, foods), [text, foods]);
  const rows: (CheckedFood & { heard: string })[] = parsed.items
    .filter((p) => edits[p.item.id] !== 0)
    .map((p) => {
      const qty = edits[p.item.id] ?? p.qty;
      return { item: p.item, qty, protein: Math.round(p.item.proteinPerUnit * qty), heard: p.heard };
    });
  const unknown = parsed.unknown.filter((u) => !handled.includes(u.name));
  const meal = mealChoice ?? parsed.meal ?? mealForHour(hourOf());
  const total = rows.reduce((s, r) => s + r.protein, 0);
  const typed = text.trim().length > 0;

  const change = (value: string) => {
    setText(value);
    setAdded(null);
    if (!value.trim()) {
      setEdits({});
      setMealChoice(null);
    }
  };

  const add = () => {
    if (!rows.length) return;
    const ids = onAdd(rows, meal);
    setAdded({ ids, meal, protein: total });
    setText("");
    setEdits({});
    setMealChoice(null);
  };

  return (
    <section className="card mt-4 p-4" aria-labelledby="meal-text-label">
      <label id="meal-text-label" htmlFor="meal-text" className="label">
        Type what you ate
      </label>
      <textarea
        id="meal-text"
        rows={2}
        value={text}
        onChange={(e) => change(e.target.value)}
        placeholder="2 rotis, dal and a bowl of curd"
        autoComplete="off"
        className="mt-2 w-full resize-none rounded-xl border border-ink-line bg-paper px-3 py-2.5 text-[16px] leading-snug placeholder:text-ink-faint focus:border-effort-target focus:outline-none"
      />
      {!typed && !added && (
        <p className="mt-1 text-[12px] leading-relaxed text-ink-faint">
          The way you&rsquo;d say it — &ldquo;do roti aur dal&rdquo; works too,
          and so does the microphone on your keyboard.
        </p>
      )}

      {added && (
        <div role="status" className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-effort-tint px-3 py-1">
          <p className="text-[13px] text-effort-stretch">
            Added to {added.meal.toLowerCase()} — {added.protein}g of protein.
          </p>
          <button
            onClick={() => {
              onUndo(added.ids);
              setAdded(null);
            }}
            className="tap -mr-1 shrink-0 rounded-lg px-2 text-[13px] font-medium text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Undo
          </button>
        </div>
      )}

      {typed && (
        <div className="mt-3">
          {rows.length > 0 && (
            <>
              <p className="label">From the food list — check the amounts</p>
              <ul className="mt-1 divide-y divide-ink-line">
                {rows.map((r) => {
                  const plain = r.heard.replace(/e?s$/, "");
                  const showHeard = !r.item.name.toLowerCase().includes(plain);
                  return (
                    <li key={r.item.id} className="py-1.5">
                      <div className="flex items-center gap-2">
                        <p className="min-w-0 flex-1 text-[15px] font-medium leading-snug">{r.item.name}</p>
                        <span className="shrink-0 font-mono text-[13px] text-effort-stretch">{r.protein}g</span>
                        <button
                          onClick={() => setEdits({ ...edits, [r.item.id]: 0 })}
                          aria-label={`Leave out ${r.item.name}`}
                          className="tap -mr-2 flex shrink-0 items-center justify-center rounded-lg text-ink-faint hover:text-ink"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="min-w-0 flex-1 text-[12px] leading-snug text-ink-faint">
                          per {r.item.unitLabel}
                          {showHeard && <> · from &ldquo;{r.heard}&rdquo;</>}
                        </p>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => setEdits({ ...edits, [r.item.id]: stepQty(r.qty, -1) })}
                            aria-label={`Less ${r.item.name}`}
                            className="tap flex items-center justify-center rounded-xl bg-paper-sunk text-ink-soft hover:bg-ink-line"
                          >
                            <Minus size={15} />
                          </button>
                          <span className="w-9 text-center font-display text-[1.15rem]" aria-live="polite">
                            {formatQty(r.qty)}
                          </span>
                          <button
                            onClick={() => setEdits({ ...edits, [r.item.id]: stepQty(r.qty, 1) })}
                            aria-label={`More ${r.item.name}`}
                            className="tap flex items-center justify-center rounded-xl bg-paper-sunk text-ink-soft hover:bg-ink-line"
                          >
                            <Plus size={15} />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {unknown.length > 0 && (
            <div className="mt-3 rounded-xl bg-paper-sunk/60 p-3">
              <p className="text-[13px] leading-snug text-ink-soft">
                Not on the food list. If it had protein, add it with your own
                figure — a rough guess is fine.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {unknown.map((u) => (
                  <button
                    key={u.name}
                    onClick={() => onAddYourself(u.name, u.qty, meal)}
                    className="tap inline-flex items-center gap-1.5 rounded-full border border-ink-line bg-paper-card px-3.5 text-[14px] text-ink hover:border-effort-target"
                  >
                    <Plus size={14} className="shrink-0 text-ink-faint" />
                    {u.qty !== 1 && `${formatQty(u.qty)} × `}
                    {u.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {parsed.skipped.length > 0 && (
            <p className="mt-2 text-[12px] leading-relaxed text-ink-faint">
              Not counted — little or no protein: {parsed.skipped.join(", ")}.
            </p>
          )}

          {rows.length === 0 && unknown.length === 0 && parsed.skipped.length === 0 && (
            <p className="text-[13px] text-ink-faint">
              Nothing from the list yet — try a dish: dal, roti, paneer, eggs…
            </p>
          )}

          {rows.length > 0 && (
            <>
              <div
                role="group"
                aria-label="Which meal"
                className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-paper-sunk p-1"
              >
                {MEALS.map((m) => (
                  <button
                    key={m}
                    aria-pressed={meal === m}
                    onClick={() => setMealChoice(m)}
                    className={`tap rounded-lg px-1 text-[13px] transition-colors ${
                      meal === m ? "bg-paper-card font-medium text-ink shadow-card" : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <button
                onClick={add}
                className="tap mt-2 w-full rounded-xl bg-effort-stretch text-[15px] font-medium text-white"
              >
                Add to {meal.toLowerCase()} · {total}g
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
