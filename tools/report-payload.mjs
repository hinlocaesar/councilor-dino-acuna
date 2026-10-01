/** Reports the payload a visitor downloads on first view, vs everything in the repo. */
import { readdirSync, statSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const mb = (b) => (b / 1024 / 1024).toFixed(2) + " MB";
const kb = (b) => Math.round(b / 1024) + " KB";

// What GitHub Pages actually publishes: the static build only.
const published = [
  ...walk("assets/img/cards"),
  ...walk("assets/img/posts"),
  ...walk("assets/img/editorial"),
  ...walk("assets/img/thumbs"),
  ...walk("assets/fonts"),
  ...walk("assets/css"),
  ...walk("assets/js"),
  "index.html",
].filter((f) => existsSync(f));

const pubBytes = published.reduce((a, f) => a + statSync(f).size, 0);

// What a first-time visitor actually downloads: the home page pulls in the
// markup, both stylesheets, the two scripts, the fonts the browser needs for
// Latin text only, and the 40 card thumbnails. The 261 article images are on
// /post/{slug} pages and load only when one is opened.
//
// The card paths come from data.js, not index.html -- main.js builds the cards
// in the browser from that array.
const dataJs = readFileSync("assets/js/data.js", "utf8");
const cardRefs = [...new Set([...dataJs.matchAll(/featuredImage: "([^"]+)"/g)].map((m) => m[1]))];
const firstView = [
  "index.html",
  "assets/css/styles.css",
  "assets/css/fonts.css",
  "assets/js/data.js",
  "assets/js/main.js",
].filter((f) => existsSync(f));

// The fonts carry unicode-range, so only the Latin subsets are fetched. Pick
// the ones whose range covers basic Latin.
const fontFaces = readFileSync("assets/css/fonts.css", "utf8");
const latinFonts = [
  ...new Set(
    [...fontFaces.matchAll(/@font-face \{[\s\S]*?unicode-range: ([^;]+);[\s\S]*?\}/g)]
      .filter((m) => m[1].includes("U+0000-00FF"))
      .map((m) => (m[0].match(/url\('([^']+)'\)/) || [])[1])
      .filter(Boolean)
      .map((u) => u.replace("../fonts/", "assets/fonts/"))
  ),
];

let firstBytes = 0;
for (const f of firstView) firstBytes += statSync(f).size;
const fontBytes = latinFonts.reduce((a, f) => a + (existsSync(f) ? statSync(f).size : 0), 0);

console.log("  GitHub Pages payload (static build)");
console.log("    " + "-".repeat(52));
for (const [label, dir] of [
  ["article images", "assets/img/posts"],
  ["card thumbnails", "assets/img/cards"],
  ["editorial", "assets/img/editorial"],
  ["video thumbnails", "assets/img/thumbs"],
  ["fonts (41 subsets)", "assets/fonts"],
  ["css + js", null],
]) {
  const files = dir ? walk(dir) : [...walk("assets/css"), ...walk("assets/js")];
  const bytes = files.reduce((a, f) => a + statSync(f).size, 0);
  console.log(`    ${label.padEnd(20)} ${String(files.length).padStart(4)} files  ${mb(bytes).padStart(9)}`);
}
console.log(`    ${"TOTAL PUBLISHED".padEnd(20)} ${String(published.length).padStart(4)} files  ${mb(pubBytes).padStart(9)}`);

console.log("\n  First visit (home page only)");
console.log(`    markup + css + js        ${kb(firstView.reduce((a, f) => a + statSync(f).size, 0))}`);
console.log(`    ${cardRefs.length} card thumbnails     ${kb(cardRefs.reduce((a, f) => a + (existsSync(f) ? statSync(f).size : 0), 0))}`);
console.log(`    Latin font subsets only  ${kb(fontBytes)}  (of ${kb(walk("assets/fonts").reduce((a, f) => a + statSync(f).size, 0))} stored)`);
const total = firstView.reduce((a, f) => a + statSync(f).size, 0)
  + cardRefs.reduce((a, f) => a + (existsSync(f) ? statSync(f).size : 0), 0)
  + fontBytes;
console.log(`    ${"DOWNLOADED".padEnd(24)}       ${kb(total)}`);
