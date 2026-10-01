/**
 * Screenshots the published GitHub Pages site.
 *
 *   node tools/shoot-live.mjs [url]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const SITE = (process.argv[2] || "https://hinlocaesar.github.io/councilor-dino-acuna").replace(/\/$/, "");
mkdirSync("tools/shots", { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(SITE + "/", { waitUntil: "load", timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
// Scroll-reveal hides content until JS runs; force it on so the shot is not
// caught mid-animation.
await page.evaluate(() => document.querySelectorAll(".reveal").forEach((e) => e.classList.add("is-in")));
await page.waitForTimeout(900);
await page.screenshot({ path: "tools/shots/live-hero.png", animations: "disabled" });
console.log("  live-hero.png");

for (const [id, name] of [["about", "live-about"], ["record", "live-record"], ["videos", "live-videos"]]) {
  const el = await page.$("#" + id);
  if (!el) continue;
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `tools/shots/${name}.png`, animations: "disabled" });
  console.log(`  ${name}.png`);
}

await page.goto(SITE + "/post/supporting-our-women-sector/", { waitUntil: "load", timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => document.querySelectorAll(".reveal").forEach((e) => e.classList.add("is-in")));
await page.waitForTimeout(900);
await page.screenshot({ path: "tools/shots/live-article.png", animations: "disabled" });
console.log("  live-article.png");

await browser.close();
