/**
 * Checks the record timeline for label/rail collisions.
 *
 *   node tools/check-timeline.mjs [url]
 */
import { chromium } from "playwright";

const SITE = (process.argv[2] || "https://hinlocaesar.github.io/councilor-dino-acuna").replace(/\/$/, "");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(SITE + "/", { waitUntil: "load", timeout: 60000 });
await page.evaluate(() => document.querySelectorAll(".reveal").forEach((e) => e.classList.add("is-in")));
await page.waitForTimeout(600);

const rows = await page.evaluate(() => {
  const years = [...document.querySelectorAll("#record .tl-year")];

  // The rail is .timeline::before at left: 4.6rem; recompute it from the
  // timeline box so this measures the real design, not a hard-coded guess.
  const tl = document.querySelector("#record .timeline");
  const tlBox = tl.getBoundingClientRect();
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const railX = tlBox.left + 4.6 * rem;

  const measured = years.map((y) => {
    // Measure where the glyphs actually end, not the element box.
    // .tl-year fills its whole grid column, and padding-right sits inside it,
    // so getBoundingClientRect().right is unchanged by the padding that gives
    // the digits their clearance. A Range over the text node gives the ink.
    const range = document.createRange();
    range.selectNodeContents(y);
    const ink = range.getBoundingClientRect();

    // The marker is 9px across centred on the rail, plus a 5px ring once the
    // row reveals, so it reaches this far to the left of centre:
    const markerLeft = railX - 4.5 - 5;

    // The label sits to the LEFT of the marker, so it overlaps when its ink
    // extends past the marker's left edge. Clearance is markerLeft - inkRight:
    // positive means clear, negative means the digits run underneath it.
    return {
      text: y.textContent.trim(),
      inkRight: +ink.right.toFixed(1),
      markerLeft: +markerLeft.toFixed(1),
      gap: +(markerLeft - ink.right).toFixed(1),
    };
  });
  return { measured, railX: +railX.toFixed(1) };
});

console.log(`\n  rail sits at x=${rows.railX}; marker's left edge at x=${(rows.railX - 9.5).toFixed(1)}\n`);
let worst = Infinity;
for (const m of rows.measured) {
  const flag = m.gap < 0 ? "OVERLAP" : m.gap < 3 ? "tight " : "ok    ";
  worst = Math.min(worst, m.gap);
  console.log(`  ${flag}  "${m.text}"  glyphs end x=${m.inkRight}  clearance=${m.gap}px`);
}
console.log(`\n  worst clearance: ${worst}px`);
console.log(worst >= 3 ? "  PASS — every year label clears the marker\n" : "  FAIL — year labels are not clear of the marker\n");

await browser.close();
process.exit(worst >= 3 ? 0 : 1);
