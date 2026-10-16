/**
 * "Two rotis, dal and a bowl of curd" → entries she can check and save.
 *
 * Logging is the single biggest reason health apps get abandoned (see
 * docs/PRODUCT-DIRECTION.md §3.1), and tapping through a picker one dish at a
 * time is exactly the cost that makes a food diary die in week two. This lets
 * her type a meal the way she would say it — or say it, with the microphone on
 * her phone's keyboard.
 *
 * It is a word matcher, not AI, and the interface says so: it knows the
 * dishes on the food list (lib/seed.ts) and the ways people actually name
 * them — chapati and phulka are a roti, dahi is curd, "do roti" is two — and
 * nothing else.
 * Anything it does not recognise is handed back to her as such, never guessed
 * at. Every figure is the list's average for a home portion, shown for her to
 * correct before anything is saved.
 *
 * Pure and dependency-free so it can be tested on its own.
 */

import type { FoodItem } from "./types";

export const MEALS = ["Breakfast", "Lunch", "Snack", "Dinner"] as const;
export type Meal = (typeof MEALS)[number];

export interface ParsedFood {
  item: FoodItem;
  /** In the item's own unit (rotis, bowls, glasses), in steps of a half. */
  qty: number;
  /** Grams of protein for this quantity, from the list's average. */
  protein: number;
  /** The words it came from, so she can see why it matched. */
  heard: string;
}

export interface UnknownFood {
  /** What she wrote, less the amount: "samosas". */
  name: string;
  /** The amount she gave it, or 1. */
  qty: number;
}

export interface MealParse {
  items: ParsedFood[];
  /** Phrases that matched nothing — returned, never guessed. */
  unknown: UnknownFood[];
  /** Recognised and left out on purpose: ghee, pickle, black coffee. */
  skipped: string[];
  /** The meal, if the text named exactly one ("for lunch"). */
  meal: Meal | null;
}

/**
 * The ways people name each dish. Longest phrases win, so "palak paneer" is
 * paneer (the protein in it) rather than spinach plus paneer, and "aloo
 * paratha" is a paratha rather than a paratha and a bowl of potato.
 */
export const SYNONYMS: Record<string, string[]> = {
  "f-dal": ["dal", "daal", "dhal", "dal tadka", "dal fry", "lentils", "lentil", "moong dal", "toor dal", "arhar dal", "masoor dal", "chana dal", "urad dal", "dal makhani"],
  "f-rajma": ["rajma", "kidney beans"],
  "f-chole": ["chole", "chhole", "chana", "channa", "chickpeas", "chickpea", "kabuli chana", "kala chana", "chana masala"],
  "f-sambar": ["sambar", "sambhar"],
  "f-sprouts": ["sprouts", "moong sprouts", "sprouted moong"],
  "f-soya": ["soya", "soya chunks", "soy chunks", "nutrela", "meal maker"],
  "f-roti": ["roti", "chapati", "chapathi", "chappati", "phulka", "fulka", "rotli", "puri", "poori", "bhatura", "bhature"],
  "f-paratha": ["paratha", "parantha", "aloo paratha", "gobi paratha", "methi paratha", "thepla", "methi thepla"],
  "f-rice": ["rice", "chawal", "jeera rice", "pulao", "veg pulao", "steamed rice", "brown rice"],
  "f-idli": ["idli", "idly"],
  "f-dosa": ["dosa", "dosai", "masala dosa", "uttapam", "uthappam"],
  "f-poha": ["poha", "aval"],
  "f-upma": ["upma", "rava upma"],
  "f-oats": ["oats", "oatmeal", "porridge", "dalia", "daliya"],
  "f-besan-chilla": ["besan chilla", "chilla", "cheela", "chila", "moong chilla", "moong dal chilla", "pesarattu"],
  "f-bread": ["bread", "toast", "brown bread", "pav", "bun"],
  "f-sabzi": ["sabzi", "sabji", "subzi", "mixed veg", "vegetables", "vegetable", "veggies", "bhindi", "gobi", "cabbage", "beans", "lauki", "tinda", "karela", "baingan", "capsicum", "poriyal", "thoran", "bhaji"],
  "f-palak": ["palak", "spinach", "methi", "saag", "sarson ka saag"],
  "f-aloo": ["aloo", "potato", "aloo sabzi", "aloo gobi", "aloo matar"],
  "f-salad": ["salad", "cucumber", "kachumber"],
  "f-fruit": ["fruit", "banana", "kela", "apple", "seb", "orange", "santra", "papaya", "guava", "amrood", "pear", "chikoo", "chiku", "mango", "aam", "pomegranate", "anar", "watermelon", "melon", "grapes"],
  "f-curd": ["curd", "dahi", "yogurt", "yoghurt", "raita", "greek yogurt", "kadhi", "kadi"],
  "f-milk": ["milk", "doodh", "haldi doodh", "turmeric milk", "badam milk", "milkshake", "milk shake", "banana shake", "mango shake", "cold coffee"],
  "f-paneer": ["paneer", "cottage cheese", "palak paneer", "matar paneer", "paneer tikka", "paneer bhurji", "shahi paneer"],
  "f-chaas": ["chaas", "chhaas", "buttermilk", "mattha"],
  "f-lassi": ["lassi", "mango lassi", "sweet lassi"],
  "f-tofu": ["tofu"],
  "f-egg": ["egg", "anda", "ande", "omelette", "omelet", "egg omelette", "boiled egg", "egg bhurji", "fried egg"],
  "f-chicken": ["chicken", "murg", "chicken curry", "chicken breast", "tandoori chicken", "butter chicken", "chicken tikka", "grilled chicken"],
  "f-fish": ["fish", "machli", "machhi", "fish curry", "fish fry", "salmon", "rohu", "pomfret", "surmai"],
  "f-whey": ["protein powder", "protein shake", "whey", "whey protein"],
  "f-peanuts": ["peanuts", "peanut", "moongphali", "mungfali", "groundnuts", "groundnut", "peanut chikki"],
  "f-almonds": ["almonds", "almond", "badam"],
  "f-makhana": ["makhana", "fox nuts", "lotus seeds"],
  "f-chai": ["chai", "tea", "coffee", "masala chai", "filter coffee"],
  "f-khichdi": ["khichdi", "khichri", "khichuri", "dal khichdi", "moong dal khichdi", "pongal"],
};

/**
 * Things people mention that carry next to no protein. Recognised, so they are
 * not reported back as "didn't understand", and left out, so the log stays
 * about the one thing it measures.
 */
export const NO_PROTEIN = [
  "ghee", "butter", "oil", "pickle", "achaar", "achar", "chutney", "papad",
  "salt", "sugar", "jaggery", "gur", "honey", "jam", "sauce", "ketchup",
  "water", "nimbu pani", "lemon water", "coconut water", "juice",
  "green tea", "black tea", "lemon tea", "black coffee",
];

const NUMBER_WORDS = new Map<string, number>([
  ["a", 1], ["an", 1], ["one", 1], ["two", 2], ["three", 3], ["four", 4],
  ["five", 5], ["six", 6], ["seven", 7], ["eight", 8], ["nine", 9], ["ten", 10],
  ["eleven", 11], ["twelve", 12], ["couple", 2], ["pair", 2],
  ["half", 0.5], ["quarter", 0.25],
  // Hinglish: "do roti", "aadha katori dal", "dedh glass doodh"
  ["ek", 1], ["do", 2], ["teen", 3], ["char", 4], ["chaar", 4], ["paanch", 5],
  ["panch", 5], ["aadha", 0.5], ["adha", 0.5], ["aadhi", 0.5], ["dedh", 1.5],
  ["dhai", 2.5],
]);

/** Containers and portions — the amount, not the food. Remembered, because
 *  "4 cubes of paneer" and "4 paneer" are not the same amount. */
const UNIT_WORDS = new Set([
  "bowl", "bowls", "katori", "katoris", "cup", "cups", "glass", "glasses",
  "plate", "plates", "piece", "pieces", "pc", "pcs", "scoop", "scoops",
  "handful", "handfuls", "serving", "servings", "slice", "slices", "spoon",
  "spoons", "tbsp", "tablespoon", "tablespoons", "mug", "mugs", "portion",
  "portions", "cube", "cubes",
]);

/** Size words, skipped without changing what is being counted. */
const SIZE_WORDS = new Set(["small", "big", "large", "medium", "full", "of"]);

const GRAM_WORDS = new Set(["g", "gm", "gms", "gram", "grams", "gr"]);
const ML_WORDS = new Set(["ml", "mls", "millilitre", "millilitres", "milliliter", "milliliters"]);
const LITRE_WORDS = new Set(["l", "ltr", "litre", "litres", "liter", "liters"]);
/** Roughly, for amounts given in millilitres. */
const ML_PER_UNIT: Record<string, number> = { glass: 200, cup: 150, bowl: 150 };

/** Words that carry no food — how people describe a meal, and how it was
 *  cooked. Dropped from "didn't recognise" so she is only shown the parts
 *  that genuinely need her. */
const FILLER = new Set([
  "i", "had", "have", "ate", "eaten", "eat", "my", "me", "for", "at", "in",
  "on", "the", "some", "bit", "little", "just", "also", "today", "morning",
  "afternoon", "evening", "night", "then", "around", "about", "approx",
  "approximately", "like", "and", "with", "plus", "aur", "or", "was", "it",
  "its", "a", "an", "of", "few", "lot", "lots", "more", "extra", "homemade",
  "home", "made", "fresh", "hot", "cold", "khaya", "khayi", "piya", "liya",
  "breakfast", "lunch", "dinner", "supper", "snack", "snacks", "nashta",
  "brunch", "tiffin", "meal", "after", "before", "gym", "walk", "workout",
  "pre", "post",
  // how it was made, not what it was
  "curry", "masala", "fry", "fried", "gravy", "tikka", "roast", "roasted",
  "boiled", "grilled", "steamed", "plain", "tadka", "dry", "thick", "thin",
  "sweet", "salted", "spicy", "light", "cooked", "mixed", "tandoori",
  "multigrain", "wheat", "atta", "whole", "ragi", "bajra", "jowar", "makki",
  "missi", "green", "red", "yellow", "black", "white",
]);

const MEAL_WORDS: [RegExp, Meal][] = [
  [/\b(breakfast|nashta)\b/, "Breakfast"],
  [/\b(lunch|tiffin)\b/, "Lunch"],
  [/\b(dinner|supper)\b/, "Dinner"],
  [/\b(snack|snacks|tea ?time)\b/, "Snack"],
];

/** A phrase and what it means; a null id is a no-protein mention. */
type Phrase = { id: string | null; words: string[] };

const phraseCache = new WeakMap<FoodItem[], Phrase[]>();

/** Every name as a word list, longest first, so the most specific wins. */
function phrasesFor(foods: FoodItem[]): Phrase[] {
  const cached = phraseCache.get(foods);
  if (cached) return cached;
  const known = new Set(foods.map((f) => f.id));
  const out: Phrase[] = [];
  for (const [id, names] of Object.entries(SYNONYMS)) {
    if (!known.has(id)) continue;
    for (const n of names) out.push({ id, words: n.split(" ") });
  }
  // The list's own names too, so an item added to the list is findable even
  // before anyone writes synonyms for it.
  for (const f of foods) {
    const own = f.name.toLowerCase().replace(/[()]/g, "").split(/\s*\/\s*/);
    for (const n of own) {
      const words = n.trim().split(/\s+/).filter(Boolean);
      if (words.length) out.push({ id: f.id, words });
    }
  }
  for (const n of NO_PROTEIN) out.push({ id: null, words: n.split(" ") });
  out.sort((a, b) => b.words.length - a.words.length);
  phraseCache.set(foods, out);
  return out;
}

/** "rotis" matches "roti", "potatoes" matches "potato". */
const sameWord = (token: string, word: string) =>
  token === word || token === `${word}s` || token === `${word}es`;

const singular = (w: string) => (w.endsWith("s") ? w.slice(0, -1) : w);

const roundHalf = (n: number) => Math.round(n * 2) / 2;
const clampQty = (n: number) => Math.min(20, Math.max(0.5, roundHalf(n)));

/** The grams in one of the item's units, when the unit says: "100g",
 *  "50g (≈4 cubes)", "bowl (≈100g)". */
function gramsPerUnit(unitLabel: string): number | null {
  const m = unitLabel.match(/(\d+)\s*g\b/);
  return m ? Number(m[1]) : null;
}

type Amount = {
  count: number | null;
  grams: number | null;
  ml: number | null;
  /** The container or portion word she used, if any. */
  unit: string | null;
};

const noAmount = (): Amount => ({ count: null, grams: null, ml: null, unit: null });
const hasAmount = (a: Amount) => a.count !== null || a.grams !== null || a.ml !== null;

function quantityFor(item: FoodItem, a: Amount): number {
  const label = item.unitLabel.toLowerCase();
  const g = gramsPerUnit(label);
  if (a.grams !== null && g) return clampQty(a.grams / g);
  if (a.ml !== null) {
    const per = ML_PER_UNIT[label.split(/\s/)[0]];
    return clampQty(per ? a.ml / per : 1);
  }
  if (a.count === null) return 1;
  const said = a.unit ? singular(a.unit) : null;
  // The list counts almonds in tens: "20 badam" is two of its units.
  const lead = label.match(/^(\d+)\s+([a-z]+)/);
  if (lead && (said === null || said === singular(lead[2]))) return clampQty(a.count / Number(lead[1]));
  // Paneer is 50g, about four cubes: "4 cubes of paneer" is one.
  const approx = label.match(/≈\s*(\d+)\s+([a-z]+)/);
  if (approx && said === singular(approx[2])) return clampQty(a.count / Number(approx[1]));
  return clampQty(a.count);
}

/** A number, a range ("2-3" is 2½), or a number word. */
function amountOf(token: string, hasNext: boolean): number | null {
  if (/^\d+(\.\d+)?$/.test(token)) return Number(token);
  const range = token.match(/^(\d+)-(\d+)$/);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  // "do roti" is two rotis, "a bowl" is one — but only with something after.
  if ((token === "do" || token === "a" || token === "an") && !hasNext) return null;
  return NUMBER_WORDS.get(token) ?? null;
}

export function mealFromText(text: string): Meal | null {
  const t = text.toLowerCase();
  const found = MEAL_WORDS.filter(([re]) => re.test(t)).map(([, m]) => m);
  return found.length === 1 ? found[0] : null;
}

/** The meal to file under when the text did not say, by the hour in India. */
export function mealForHour(hour: number): Meal {
  if (hour < 11) return "Breakfast";
  if (hour < 16) return "Lunch";
  if (hour < 19) return "Snack";
  return "Dinner";
}

/** "½", "1½", "2" — how a quantity reads at the table. */
export function formatQty(q: number): string {
  const whole = Math.floor(q);
  const half = q - whole >= 0.5;
  if (whole === 0) return half ? "½" : "0";
  return `${whole}${half ? "½" : ""}`;
}

/** One tap up or down: whole portions, with a half below one. */
export function stepQty(q: number, dir: 1 | -1): number {
  if (dir > 0) return q < 1 ? 1 : Math.min(20, Math.floor(q) + 1);
  return q > 1 ? Math.max(1, Math.ceil(q) - 1) : 0.5;
}

const NUMBER_FOR_HALF = "(\\d+(?:\\.\\d+)?|one|two|three|four|five|ek|do|teen)";

/** Fractions, multipliers and run-together amounts, into plain tokens. */
function normalise(text: string): string {
  const asNumber = (w: string) => (/^\d/.test(w) ? Number(w) : NUMBER_WORDS.get(w) ?? 1);
  return (
    text
      .toLowerCase()
      .replace(/(\d)\s*½/g, "$1.5")
      .replace(/(\d)\s*¼/g, "$1.25")
      .replace(/(\d)\s*¾/g, "$1.75")
      .replace(/½/g, " 0.5 ")
      .replace(/¼/g, " 0.25 ")
      .replace(/¾/g, " 0.75 ")
      // "1 1/2", then "1/2" — before "/" is read as "or"
      .replace(/(\d+)\s+(\d+)\/(\d+)/g, (s, w, n, d) => (+d ? ` ${+w + +n / +d} ` : s))
      .replace(/(\d+)\/(\d+)/g, (s, n, d) => (+d ? ` ${+n / +d} ` : s))
      // "one and a half", "2 and half" — before "and" splits them
      .replace(new RegExp(`\\b${NUMBER_FOR_HALF}\\s+and\\s+(?:a\\s+)?half\\b`, "g"), (_, n) => ` ${asNumber(n) + 0.5} `)
      // "roti x2", "2x roti"
      .replace(/\bx\s*(\d)/g, " $1")
      .replace(/(\d)\s*x\b/g, "$1 ")
      // "Tea time" is a meal, not a cup of tea.
      .replace(/\btea ?time\b/g, " snack ")
      // Tea with milk is tea, not tea and a glass of milk.
      .replace(/\b(chai|tea|coffee)\s+with\s+milk\b/g, "$1")
      // "2rotis" → "2 rotis", "100g" → "100 g"
      .replace(/(\d)([a-z])/g, "$1 $2")
      // "aloo-paratha" → "aloo paratha"; "2-3" stays a range
      .replace(/([a-z])-(?=[a-z])/g, "$1 ")
      .replace(/[^a-z0-9.\s,;&+\n/-]/g, " ")
  );
}

/** Leftover words, less the filler at either end: "i had samosas" → "samosas". */
function trimFiller(words: string[]): string {
  let a = 0;
  let b = words.length;
  while (a < b && (FILLER.has(words[a]) || /^[\d.-]+$/.test(words[a]))) a++;
  while (b > a && (FILLER.has(words[b - 1]) || /^[\d.-]+$/.test(words[b - 1]))) b--;
  return words.slice(a, b).join(" ");
}

export function parseMeal(text: string, foods: FoodItem[]): MealParse {
  const phrases = phrasesFor(foods);
  const byId = new Map(foods.map((f) => [f.id, f]));

  const chunks = normalise(text)
    .split(/[,;&+\n/]|\.(?!\d)|\b(?:and|with|plus|aur|then|n)\b/)
    .map((c) => c.trim())
    .filter(Boolean);

  const items: ParsedFood[] = [];
  const unknown: UnknownFood[] = [];
  const skipped: string[] = [];

  for (const chunk of chunks) {
    const tokens = chunk.split(/\s+/).filter(Boolean);
    let amount = noAmount();
    let leftovers: string[] = [];
    let last: { index: number; explicit: boolean; added: number } | null = null;
    let matched = 0;

    const flush = (qty = 1) => {
      const name = trimFiller(leftovers);
      if (name && !unknown.some((u) => u.name === name)) unknown.push({ name, qty });
      leftovers = [];
    };

    for (let i = 0; i < tokens.length; ) {
      const t = tokens[i];
      const next = tokens[i + 1];

      // An amount — of whatever comes next.
      const n = amountOf(t, next !== undefined);
      if (n !== null) {
        if (next && GRAM_WORDS.has(next)) {
          amount.grams = n;
          i += 2;
        } else if (next && ML_WORDS.has(next)) {
          amount.ml = n;
          i += 2;
        } else if (next && LITRE_WORDS.has(next)) {
          amount.ml = n * 1000;
          i += 2;
        } else {
          amount.count = amount.count === null ? n : amount.count * n; // "half a bowl"
          i += 1;
        }
        continue;
      }
      if (UNIT_WORDS.has(t)) {
        amount.unit = t;
        i += 1;
        continue;
      }
      if (SIZE_WORDS.has(t)) {
        i += 1;
        continue;
      }

      // The longest name that starts here.
      const hit = phrases.find(
        (p) =>
          i + p.words.length <= tokens.length &&
          p.words.every((w, k) =>
            k === p.words.length - 1 ? sameWord(tokens[i + k], w) : tokens[i + k] === w
          )
      );
      if (hit) {
        flush();
        const heard = tokens.slice(i, i + hit.words.length).join(" ");
        i += hit.words.length;
        matched += 1;
        if (hit.id === null) {
          if (!skipped.includes(heard)) skipped.push(heard);
          amount = noAmount();
          last = null;
          continue;
        }
        const item = byId.get(hit.id)!;
        const qty = quantityFor(item, amount);
        const explicit = hasAmount(amount);
        const already = items.findIndex((f) => f.item.id === item.id);
        if (already >= 0) {
          const entry = items[already];
          entry.qty = Math.min(20, entry.qty + qty);
          entry.protein = Math.round(item.proteinPerUnit * entry.qty);
          last = { index: already, explicit, added: qty };
        } else {
          items.push({ item, qty, protein: Math.round(item.proteinPerUnit * qty), heard });
          last = { index: items.length - 1, explicit, added: qty };
        }
        amount = noAmount();
        continue;
      }

      leftovers.push(t);
      i += 1;
    }

    // Words left after the last dish are something else she ate.
    const tail = trimFiller(leftovers) !== "";
    if (hasAmount(amount) && last && !last.explicit && !tail) {
      // An amount after the dish — "paneer 100g", "rotis 2" — is its amount.
      const entry = items[last.index];
      entry.qty = clampQty(entry.qty - last.added + quantityFor(entry.item, amount));
      entry.protein = Math.round(entry.item.proteinPerUnit * entry.qty);
    } else if (matched === 0 || tail) {
      // The unrecognised phrase is hers to name, with its amount: "2 samosas".
      flush(amount.count !== null ? clampQty(amount.count) : 1);
    }
    leftovers = [];
  }

  return { items, unknown, skipped, meal: mealFromText(text) };
}
