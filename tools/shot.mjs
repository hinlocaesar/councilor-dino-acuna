import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
mkdirSync("tools/shots", { recursive: true });

const base = process.argv[2] || "http://localhost:5001/";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await p.goto(base, { waitUntil: "load" });
await p.evaluate(() => document.fonts.ready);
// force every scroll-reveal on so screenshots are not caught mid-animation
await p.evaluate(() => document.querySelectorAll(".reveal").forEach((e) => e.classList.add("is-in")));
await p.waitForTimeout(900);

for (const [id, name] of [["journal", "journal2"], ["videos", "videos2"]]) {
  const el = await p.$("#" + id);
  await el.scrollIntoViewIfNeeded();
  await p.waitForTimeout(400);
  await el.screenshot({ path: `tools/shots/${name}.png`, animations: "disabled", timeout: 60000 });
}
console.log("captured");
await b.close();