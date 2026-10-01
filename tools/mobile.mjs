/**
 * Two follow-ups the section screenshots can't answer:
 *  1. what a mobile visitor actually sees, scrolling normally
 *  2. whether the page is readable if JavaScript fails (the .reveal
 *     animation starts at opacity:0 and is only undone by JS)
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] || "http://localhost:5001/";
const OUT = "tools/shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

/* ------------------------------- 1. mobile scroll-through (JS enabled) */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  for (let i = 0; i < 9; i++) {
    await page.evaluate((n) => window.scrollTo(0, n * 720), i);
    await page.waitForTimeout(700);
    await page.screenshot({ path: join(OUT, `mobile-scroll-${String(i).padStart(2, "0")}.png`) });
  }
  console.log("mobile scroll frames written");
  await ctx.close();
}

/* ------------------------------- 2. JavaScript disabled */
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    javaScriptEnabled: false,
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);

  const vis = await page.evaluate(() => {
    // count elements that are present but still transparent
    let hidden = 0;
    let total = 0;
    for (const el of document.querySelectorAll(".reveal")) {
      total++;
      const o = parseFloat(getComputedStyle(el).opacity);
      if (o < 0.05) hidden++;
    }
    return { total, hidden, bodyText: document.body.innerText.length };
  });

  await page.screenshot({ path: join(OUT, "nojs.png"), fullPage: false });
  console.log(`no-JS: ${vis.hidden}/${vis.total} .reveal elements invisible, ${vis.bodyText} chars of text`);
  await ctx.close();
}

await browser.close();
