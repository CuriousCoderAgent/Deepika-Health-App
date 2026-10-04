/**
 * Renders src/og.png, the picture that shows when the link is pasted into
 * WhatsApp or anywhere else that unfurls it.
 *
 * It deliberately carries no brand name — just the sprout and the line — so a
 * rename never leaves an old name stuck inside an image. Only needs re-running
 * if the tagline or the look changes:
 *
 *   node scripts/make-og.mjs      (needs Playwright and Chromium available)
 */
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "src", "og.png");

const html = `<!doctype html><meta charset="utf-8"><style>
  html,body{margin:0}
  body{width:1200px;height:630px;background:#F7F4EE;display:flex;align-items:center;
       font-family:Georgia,"Times New Roman",serif;color:#15232F;position:relative;overflow:hidden}
  .a{position:absolute;width:520px;height:520px;border-radius:50%;background:rgba(217,154,43,.13);left:-170px;top:-190px;filter:blur(60px)}
  .b{position:absolute;width:560px;height:560px;border-radius:50%;background:rgba(168,194,180,.45);right:-150px;bottom:-200px;filter:blur(60px)}
  .in{position:relative;padding:0 96px}
  .mark{width:96px;height:96px;border-radius:50%;background:#E9F0EA;color:#3F6B57;display:grid;place-items:center}
  .mark svg{width:52px;height:52px}
  h1{font-weight:400;font-size:84px;line-height:1.05;letter-spacing:-.015em;margin:40px 0 0;max-width:900px}
  p{font:500 30px/1.4 system-ui,sans-serif;color:#3D4F60;margin:28px 0 0}
</style><div class="a"></div><div class="b"></div>
<div class="in"><div class="mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/></svg></div>
<h1>Strength, energy and steadiness.</h1>
<p>Health coaching built around your actual life.</p></div>`;

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.screenshot({ path: out });
await browser.close();
console.log("wrote", out);
