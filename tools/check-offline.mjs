/**
 * Loads every page in a real browser and records any request that goes to an
 * external host. This is the check that matters: the JSON being clean is not
 * enough, the rendered page must not touch the network either.
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:5001/";
const EXTERNAL = /^https?:\/\/(?!localhost|127\.0\.0\.1)/i;

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });

const external = new Set();
ctx.on("request", (r) => {
  if (EXTERNAL.test(r.url())) external.add(r.url());
});

const page = await ctx.newPage();

// home, then every imported article
const home = await page.goto(BASE, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(1500);

const links = await page.$$eval(".post a[href^='/post/']", (as) =>
  [...new Set(as.map((a) => a.getAttribute("href")))]
);
console.log(`home: HTTP ${home.status()}, ${links.length} article links`);

// scroll the whole page so lazy images actually request
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight * 0.8) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 100));
  }
});
await page.waitForTimeout(1500);

console.log(`\nafter home + full scroll:`);
console.log(`  external requests: ${external.size}`);

// visit every article (sample if there are many)
const sample = links.slice(0, 12);
console.log(`\nvisiting ${sample.length} articles...`);
for (const l of sample) {
  await page.goto(BASE.replace(/\/$/, "") + l, { waitUntil: "load", timeout: 60000 });
  await page.evaluate(async () => {
    for (let y = 0; y < Math.min(document.body.scrollHeight, 6000); y += window.innerHeight) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
  });
  await page.waitForTimeout(600);
}

console.log(`\n=== external requests across home + ${sample.length} articles ===`);
if (external.size === 0) {
  console.log("  NONE — the site is fully self-hosted");
} else {
  const byHost = {};
  for (const u of external) {
    const h = new URL(u).host;
    byHost[h] = (byHost[h] || 0) + 1;
  }
  for (const [h, n] of Object.entries(byHost).sort((a, b) => b[1] - a[1]))
    console.log(`  ${String(n).padStart(4)}  ${h}`);
  console.log("\n  samples:");
  for (const u of [...external].slice(0, 8)) console.log("    " + u.slice(0, 110));
}

await b.close();
process.exit(external.size ? 1 : 0);