// Checks docs/survey/make-google-form.gs without a Google account.
//
//   node docs/survey/check.mjs          run the checks
//   node docs/survey/check.mjs --text   also print the survey as plain text
//
// What it can tell you: the questions are well formed, and the script calls
// only the Google Forms methods listed below, in an order that builds the form
// described in docs/SURVEY.md. What it cannot tell you: that Google agrees
// those methods exist and behave as written. Only running the script does.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const source = readFileSync(fileURLToPath(new URL("./make-google-form.gs", import.meta.url)), "utf8");

let failed = 0;
function check(name, ok, detail = "") {
  if (!ok) failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
}

// ── The questions ───────────────────────────────────────────────────────────

const literal = source.match(/^var SURVEY = (\{[\s\S]*?^\});$/m);
check("SURVEY is one object written as JSON", Boolean(literal));
const survey = JSON.parse(literal[1]);
const everything = [...survey.questions, ...survey.contact.fields];

const ids = everything.map((q) => q.id);
check("every question has its own id", new Set(ids).size === ids.length, ids.join(" "));

const titles = everything.map((q) => q.title);
check("no two questions share a title", new Set(titles).size === titles.length);

for (const q of everything) {
  const choice = q.kind === "one" || q.kind === "many";
  if (!choice) {
    check(`${q.id}: a typed answer has no options`, q.options === undefined && (q.kind === "line" || q.kind === "long"));
    continue;
  }
  const options = q.options ?? [];
  check(`${q.id}: between 2 and 10 options`, options.length >= 2 && options.length <= 10, String(options.length));
  check(`${q.id}: no option twice`, new Set(options.map((o) => o.toLowerCase())).size === options.length);
  check(
    `${q.id}: no option starts or ends with a space, and none is called Other`,
    options.every((o) => o === o.trim() && o.toLowerCase() !== "other"),
  );
  if (q.kind === "many") {
    check(`${q.id}: says how many to pick, and the title says the same`, q.max > 0 && q.title.includes(`pick up to ${q.max}`));
  }
  if (q.kind === "one" && q.id !== survey.contact.after) {
    check(`${q.id}: the title says pick one`, q.title.includes("(pick one)"));
  }
  // An answer that looks like a date gets turned into one by a spreadsheet.
  check(
    `${q.id}: no option a spreadsheet would read as a date`,
    options.every((o) => !/^\d{1,2}\s*[-/]\s*\d{1,2}$/.test(o) || Number(o.split(/[-/]/)[0]) > 12),
    options.join(" | "),
  );
}

const leads = survey.questions.find((q) => q.id === survey.contact.after);
check("the question that leads to the contact page exists and is the last one", leads === survey.questions.at(-1));
check("every answer that skips the contact page is one of its options", survey.contact.skipOn.every((o) => leads.options.includes(o)));
check("the name and the number are both optional", survey.contact.fields.every((f) => f.required === false));

// ── The script, run against a stand-in for Google ───────────────────────────

const METHODS = {
  form: [
    "setDescription", "setConfirmationMessage", "setCollectEmail", "setShowLinkToRespondAgain", "setRequireLogin",
    "addMultipleChoiceItem", "addCheckboxItem", "addTextItem", "addParagraphTextItem", "addPageBreakItem",
    "setDestination", "setPublished", "getPublishedUrl", "shortenFormUrl", "getEditUrl",
  ],
  one: ["setChoiceValues", "showOtherOption", "setTitle", "setHelpText", "setRequired", "createChoice", "setChoices"],
  many: ["setChoiceValues", "showOtherOption", "setValidation", "setTitle", "setHelpText", "setRequired"],
  line: ["setTitle", "setHelpText", "setRequired"],
  long: ["setTitle", "setHelpText", "setRequired"],
  page: ["setTitle", "setHelpText"],
};

const built = { items: [], log: [] };
// The script is handed stand-ins; this finds the stand-in for a record.
const handles = new Map();

function standIn(kind, record) {
  return new Proxy(record, {
    get(target, name) {
      if (typeof name !== "string" || name === "then") return undefined;
      if (name in target) return target[name];
      if (!METHODS[kind].includes(name)) throw new Error(`${kind}.${name} is not a method this check knows`);
      return (...args) => {
        if (name === "createChoice") return { value: args[0], goesTo: args[1] };
        if (name === "setChoices") target.choices = args[0];
        else if (name === "setChoiceValues") target.options = args[0];
        else if (name === "showOtherOption") target.other = args[0];
        else if (name === "setValidation") target.validation = args[0];
        else if (name === "setTitle") target.title = args[0];
        else if (name === "setHelpText") target.help = args[0];
        else if (name === "setRequired") target.required = args[0];
        return undefined;
      };
    },
  });
}

function item(kind) {
  const record = { kind };
  built.items.push(record);
  handles.set(record, standIn(kind, record));
  return handles.get(record);
}

const form = standIn("form", {
  addMultipleChoiceItem: () => item("one"),
  addCheckboxItem: () => item("many"),
  addTextItem: () => item("line"),
  addParagraphTextItem: () => item("long"),
  addPageBreakItem: () => item("page"),
  setDescription: (text) => void (built.description = text),
  setConfirmationMessage: (text) => void (built.thanks = text),
  setDestination: (type, id) => void (built.destination = { type, id }),
  getPublishedUrl: () => "https://docs.google.com/forms/d/e/stand-in/viewform",
  shortenFormUrl: () => "https://forms.gle/stand-in",
  getEditUrl: () => "https://docs.google.com/forms/d/stand-in/edit",
});

const context = {
  FormApp: {
    create: (title) => {
      built.title = title;
      return form;
    },
    createCheckboxValidation: () => {
      const rule = {};
      const builder = {
        requireSelectAtMost: (n) => {
          rule.atMost = n;
          return builder;
        },
        build: () => rule,
      };
      return builder;
    },
    DestinationType: { SPREADSHEET: "SPREADSHEET" },
    PageNavigationType: { SUBMIT: "SUBMIT" },
  },
  SpreadsheetApp: {
    create: (name) => ({ getId: () => "sheet-stand-in", getUrl: () => "https://docs.google.com/spreadsheets/d/stand-in", name }),
  },
  Logger: { log: (line) => built.log.push(line) },
};

let threw = "";
try {
  vm.runInNewContext(`${source}\nmakeSurvey();`, context, { filename: "make-google-form.gs" });
} catch (error) {
  threw = String(error);
}
check("makeSurvey() runs to the end", threw === "", threw);

const pageAt = built.items.findIndex((i) => i.kind === "page");
const before = built.items.slice(0, pageAt);
const after = built.items.slice(pageAt + 1);

check("the form has the survey's title, opening and thank-you", built.title === survey.title && built.description === survey.intro && built.thanks === survey.thanks);
check(
  "the questions are made in order, each as the right kind",
  before.length === survey.questions.length && before.every((i, n) => i.kind === survey.questions[n].kind && i.title === survey.questions[n].title),
);
check(
  "each has its options, Other where asked, and is required or not as written",
  before.every((i, n) => {
    const q = survey.questions[n];
    const options = i.choices ? i.choices.map((c) => c.value) : i.options;
    return JSON.stringify(options) === JSON.stringify(q.options) && Boolean(i.other) === Boolean(q.other) && i.required === q.required;
  }),
);
check(
  "each pick-up-to question refuses one more than its limit",
  before.every((i, n) => survey.questions[n].kind !== "many" || i.validation?.atMost === survey.questions[n].max),
);

const leading = before.at(-1);
const page = built.items[pageAt];
check(
  "\"No, thanks\" sends the form; every other answer opens the contact page",
  Array.isArray(leading.choices) &&
    leading.choices.every((c) => c.goesTo === (survey.contact.skipOn.includes(c.value) ? "SUBMIT" : handles.get(page))),
);
check(
  "the contact page holds the name and the number, and nothing after it",
  after.length === 2 && after.every((i, n) => i.title === survey.contact.fields[n].title && i.required === false),
);
check("the answers go to a spreadsheet", built.destination?.type === "SPREADSHEET" && built.destination?.id === "sheet-stand-in");
check("the log gives three links", built.log.length === 3 && built.log.every((line) => line.includes("https://")));

// ── The survey as text, for docs/SURVEY.md and for a message ────────────────

if (process.argv.includes("--text")) {
  const lines = [survey.title, "", survey.intro, ""];
  survey.questions.forEach((q, n) => {
    lines.push(`${n + 1}. ${q.title}`);
    if (q.options) for (const option of q.options) lines.push(`   - ${option}`);
    if (q.other) lines.push("   - Other");
    lines.push("");
  });
  lines.push(`If the answer is not "${survey.contact.skipOn.join('" or "')}":`);
  for (const field of survey.contact.fields) lines.push(`   ${field.title}`);
  lines.push(`   (${survey.contact.help})`, "", `After sending: ${survey.thanks}`);
  console.log(`\n${lines.join("\n")}`);
}

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
