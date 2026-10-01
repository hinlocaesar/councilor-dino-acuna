/**
 * Loads the published GitHub Pages site in a real browser and checks it.
 *
 *   node tools/verify-live.mjs [url]
 *
 * The CI checks run against the local export. This runs against whatever is
 * actually deployed, which is the only way to be sure the published site works
 * and not merely the one on disk.
 */
import { chromium } from "playwright";

const SITE = (process.argv[2] || "https://hinlocaesar.github.io/councilor-dino-acuna").replace(/\/$/, "");
console.log(`\nchecking the live site: ${SITE}\n`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

const bad = [];
const external = new Set();
ctx.on("response", (r) => {
  if (r.status() >= 400) bad.push(`${r.status()}  ${r.url()}`);
});
ctx.on("requestfailed", (r) => bad.push(`FAIL ${r.url()}`));
ctx.on("request", (r) => {
  const u = r.url();
  if (/^https?:\/\//i.test(u) && !u.startsWith(SITE) && !u.startsWith("https://hinlocaesar.github.io")) {
    external.add(u);
  }
});

const page = await ctx.newPage();
const res = await page.goto(SITE + "/", { waitUntil: "load", timeout: 60000 });
console.log(`home: HTTP ${res.status()}`);

await page.evaluate(async () => {
  for (let i = 0, y = 0; i < 80; i++, y += window.innerHeight) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 60));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(2000);

const home = await page.evaluate(() => ({
  cards: document.querySelectorAll(".post").length,
  cardsLoaded: [...document.querySelectorAll(".post-thumb img")].filter((i) => i.naturalWidth > 0).length,
  heading: (document.querySelector(".section-head h2") || document.querySelector("h1"))?.textContent.trim(),
  font: getComputedStyle(document.body).fontFamily.split(",")[0],
  bg: getComputedStyle(document.body).backgroundColor,
  sections: [...document.querySelectorAll("main section[id]")].map((s) => s.id),
}));
console.log(`journal cards: ${home.cards} (${home.cardsLoaded} thumbnails decoded)`);
console.log(`sections     : ${home.sections.join(", ")}`);
console.log(`body font    : ${home.font}`);
console.log(`body bg      : ${home.bg}`);

// Visit every article linked from the journal.
const links = await page.$$eval(".post a[href^='post/']", (as) =>
  [...new Set(as.map((a) => a.getAttribute("href")))]
);
console.log(`\nvisiting all ${links.length} articles...`);

const broken = [];
const thin = [];
for (const href of links) {
  const before = bad.length;
  const r = await page.goto(`${SITE}/${href}`, { waitUntil: "load", timeout: 60000 });
  const info = await page.evaluate(() => {
    const h1 = document.querySelector(".post-full h1");
    const prose = document.querySelector(".prose");
    return {
      title: h1 ? h1.textContent.trim() : null,
      chars: prose ? prose.textContent.trim().length : 0,
    };
  });
  if (r.status() !== 200) broken.push(`${href} -> HTTP ${r.status()}`);
  else if (!info.title || info.chars < 100) thin.push(`${href} "${info.title}" ${info.chars} chars`);
  if (bad.length > before && r.status() < 400) { /* recorded in bad[] below */ }
}

// Back to the home page for a final visual state.
await page.goto(SITE + "/", { waitUntil: "load" });
await page.evaluate(() => document.querySelectorAll(".reveal").forEach((e) => e.classList.add("is-in")));
await page.evaluate(() => document.querySelector("#journal")?.scrollIntoViewIfNeeded());
await page.waitForTimeout(1200);
await page.screenshot({ path: "tools/shots/live-journal.png", animations: "disabled" });
console.log("  screenshot -> tools/shots/live-journal.png");

await browser.close();

/* ------------------------------------------------------------- verdict */

console.log(`\nfailed requests      : ${bad.length}`);
for (const b of [...new Set(bad)].slice(0, 10)) console.log("  " + b);
console.log(`broken articles      : ${broken.length}`);
for (const b of broken.slice(0, 10)) console.log("  " + b);
console.log(`articles with no text: ${thin.length}`);
for (const t of thin.slice(0, 10)) console.log("  " + t);
console.log(`requests off-site    : ${external.size}`);
for (const u of [...external].slice(0, 6)) console.log("  " + u);

const ok =
  res.status() === 200 &&
  bad.length === 0 &&
  broken.length === 0 &&
  thin.length === 0 &&
  external.size === 0 &&
  home.cardsLoaded === home.cards;

console.log(`\n${ok ? "PASS" : "FAIL"} — ${SITE}\n`);
process.exit(ok ? 0 : 1);
