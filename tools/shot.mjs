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
// Walk the page so lazy images start loading, then wait them out. The bound on
// the loop matters: images without reserved space grow scrollHeight as they
// load, so an unbounded "while y < scrollHeight" never terminates.
await p.evaluate(async () => {
  const limit = 200;
  for (let i = 0, y = 0; i < limit; i++, y += window.innerHeight) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 50));
  }
  const pending = [...document.images].filter((i) => !i.complete);
  await Promise.race([
    Promise.all(pending.map((i) => i.decode().catch(() => {}))),
    new Promise((r) => setTimeout(r, 8000)),
  ]);
});
await p.waitForTimeout(500);

for (const [id, name] of [
  ["journal", "journal2"],
  ["videos", "videos2"],
]) {
  const el = await p.$("#" + id);
  await el.scrollIntoViewIfNeeded();
  await p.waitForTimeout(600);
  // A viewport screenshot, not fullPage: fullPage resizes the viewport to the
  // whole document, which re-triggers lazy loading and can capture before the
  // images decode, showing them as empty boxes.
  await p.screenshot({ path: `tools/shots/${name}.png`, animations: "disabled", timeout: 60000 });
  console.log(`  ${name}: ${await p.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")];
    return `${imgs.filter((i) => i.naturalWidth > 0).length}/${imgs.length} images decoded`;
  })}`);
}
console.log("captured");
await b.close();