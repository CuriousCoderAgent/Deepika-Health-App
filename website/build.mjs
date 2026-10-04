/**
 * Builds the static site: fills the {{PLACEHOLDERS}} in src/ and writes dist/.
 *
 * No dependencies and no framework on purpose. The site is one page of HTML and
 * one stylesheet, and the only things that change between "preview" and
 * "launch" are a handful of values — the brand name, the app's URL, the Play
 * Store link — which live in site.config.json and can be overridden per
 * deployment with WEBSITE_<KEY> environment variables (WEBSITE_PLAY_URL, ...).
 *
 *   node build.mjs
 *
 * Template syntax, deliberately tiny:
 *   {{KEY}}              the value, HTML-escaped
 *   {{#KEY}}...{{/KEY}}  kept only when KEY is non-empty
 *   {{^KEY}}...{{/KEY}}  kept only when KEY is empty
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, copyFileSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, "src");
const out = join(root, "dist");

const file = JSON.parse(readFileSync(join(root, "site.config.json"), "utf8"));
const vars = {};
for (const key of Object.keys(file)) {
  vars[key] = String(process.env[`WEBSITE_${key}`] ?? file[key] ?? "").trim();
}
vars.YEAR = String(new Date().getFullYear());

// ---- fail the build, not the launch -------------------------------------
const problems = [];
const isHttps = (u) => {
  try { return new URL(u).protocol === "https:"; } catch { return false; }
};
if (!vars.BRAND) problems.push("BRAND is empty.");
if (!isHttps(vars.APP_URL)) problems.push("APP_URL must be an https:// URL.");
if (vars.PUBLIC_URL && !isHttps(vars.PUBLIC_URL)) problems.push("PUBLIC_URL, when set, must be an https:// URL.");
if (vars.PLAY_URL && !vars.PLAY_URL.startsWith("https://play.google.com/"))
  problems.push("PLAY_URL, when set, must be a https://play.google.com/ link.");
if (vars.SUPPORT_EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vars.SUPPORT_EMAIL))
  problems.push("SUPPORT_EMAIL is not a valid address.");
if (problems.length) {
  console.error("Build stopped:\n - " + problems.join("\n - "));
  process.exit(1);
}
vars.APP_URL = vars.APP_URL.replace(/\/+$/, "");
vars.PUBLIC_URL = vars.PUBLIC_URL.replace(/\/+$/, "");

const escape = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function render(tpl, name) {
  // Sections can nest (robots.txt does), so resolve until nothing changes.
  let t = tpl;
  for (let prev = ""; prev !== t; ) {
    prev = t;
    t = t
      .replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, k, body) => (vars[k] ? body : ""))
      .replace(/\{\{\^(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, k, body) => (vars[k] ? "" : body));
  }
  t = t.replace(/\{\{(\w+)\}\}/g, (m, k) => {
    if (!(k in vars)) throw new Error(`${name}: unknown placeholder ${m}`);
    return escape(vars[k]);
  });
  if (/\{\{|\}\}/.test(t)) throw new Error(`${name}: unresolved template syntax left in output`);
  return t;
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const TEXT = new Set([".html", ".txt", ".xml", ".webmanifest", ".svg"]);
for (const name of readdirSync(src)) {
  const from = join(src, name);
  if (!statSync(from).isFile()) continue;
  if (TEXT.has(extname(name))) {
    const body = render(readFileSync(from, "utf8"), name);
    // A file that renders to nothing (the sitemap, before there is a PUBLIC_URL
    // to put in it) is left out rather than published empty.
    if (body.trim()) writeFileSync(join(out, name), body);
  } else {
    copyFileSync(from, join(out, name));
  }
}

// Until she says otherwise the site asks search engines to stay away. The name
// is still a working one, and a page indexed under a name that is about to
// change is an old name that lingers in search results for months.
if (!vars.INDEXABLE) console.log("Note: INDEXABLE is off — the site is marked noindex.");
if (!vars.PLAY_URL) console.log("Note: PLAY_URL is empty — the page says the Android app is coming soon.");
if (!vars.SUPPORT_EMAIL) console.log("Note: SUPPORT_EMAIL is empty — no contact address is shown.");
console.log(`Built ${vars.BRAND} → ${out}`);
