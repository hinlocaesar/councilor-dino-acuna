/**
 * Serves the site the way GitHub Pages will and checks that nothing 404s.
 *
 *   node tools/verify-subpath.mjs
 *
 * This repo is a project page, so Pages publishes it at
 * https://<user>.github.io/councilor-dino-acuna/ -- not at the domain root.
 * Any root-absolute reference ("/assets/css/styles.css") resolves correctly when
 * the site is opened as file:// or from http://localhost:4321/ but 404s under a
 * subpath. Grepping the source cannot catch that reliably, so this mounts the
 * real build under a prefix and loads it in a browser.
 *
 * Exits non-zero on any failed request, which is what makes it usable in CI.
 */
import { mkdirSync, cpSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join, extname } from "node:path";
import { chromium } from "playwright";

const PREFIX = "/councilor-dino-acuna";
const ROOT = join(process.cwd(), ".subpath-check");
const PORT = 4399;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
};

// Rebuild the tree each run so a stale copy cannot mask a problem.
rmSync(ROOT, { recursive: true, force: true });
mkdirSync(join(ROOT, PREFIX), { recursive: true });
cpSync("index.html", join(ROOT, PREFIX, "index.html"));
cpSync("assets", join(ROOT, PREFIX, "assets"), { recursive: true });
writeFileSync(join(ROOT, PREFIX, ".nojekyll"), "");

const requested = new Set();
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  let path = decodeURIComponent(url.pathname);

  // Anything outside the prefix is a 404, exactly as Pages would behave.
  if (!path.startsWith(PREFIX)) {
    res.writeHead(404).end("outside the Pages prefix");
    return;
  }

  let rel = path.slice(PREFIX.length) || "/";
  if (rel.endsWith("/")) rel += "index.html";
  const file = join(ROOT, PREFIX, rel);

  if (!existsSync(file) || !file.startsWith(join(ROOT, PREFIX))) {
    res.writeHead(404).end("not found");
    return;
  }
  requested.add(rel);
  res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
});

await new Promise((r) => server.listen(PORT, r));
console.log(`serving the build at http://localhost:${PORT}${PREFIX}/\n`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

const bad = [];
ctx.on("response", (r) => {
  if (r.status() >= 400) bad.push(`${r.status()}  ${r.url().replace(`http://localhost:${PORT}`, "")}`);
});
ctx.on("requestfailed", (r) => {
  bad.push(`FAIL ${r.url().replace(`http://localhost:${PORT}`, "")}`);
});

const page = await ctx.newPage();
const res = await page.goto(`http://localhost:${PORT}${PREFIX}/`, { waitUntil: "load", timeout: 60000 });
console.log(`home: HTTP ${res.status()}`);

// Scroll the whole page so every lazy image and stylesheet actually requests.
await page.evaluate(async () => {
  for (let i = 0, y = 0; i < 60; i++, y += window.innerHeight) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 60));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(1500);

// Every card must show a real photograph, which is the thing a root-absolute
// image path would silently break.
const cards = await page.evaluate(() =>
  [...document.querySelectorAll(".post-thumb img")].map((i) => ({
    src: i.getAttribute("src"),
    loaded: i.naturalWidth > 0,
  }))
);

const fontsApplied = await page.evaluate(() => {
  const h1 = document.querySelector("h1") || document.body;
  return getComputedStyle(h1).fontFamily;
});

await browser.close();
server.close();
rmSync(ROOT, { recursive: true, force: true });

console.log(`requests served     : ${requested.size}`);
console.log(`journal cards       : ${cards.length}`);
console.log(`  loaded            : ${cards.filter((c) => c.loaded).length}`);
console.log(`  all document-relative: ${cards.every((c) => !c.src.startsWith("/") || c.src.startsWith(PREFIX))}`);
console.log(`heading font-family : ${fontsApplied.slice(0, 60)}`);

if (bad.length) {
  console.log(`\nFAILED REQUESTS (${bad.length}):`);
  for (const b of [...new Set(bad)].slice(0, 15)) console.log("  " + b);
}

const notLoaded = cards.filter((c) => !c.loaded);
if (notLoaded.length) {
  console.log(`\ncards with no image (${notLoaded.length}):`);
  for (const c of notLoaded.slice(0, 5)) console.log("  " + c.src);
}

const ok = bad.length === 0 && notLoaded.length === 0 && cards.length > 0 && res.status() === 200;
console.log(`\n${ok ? "PASS" : "FAIL"} — the build works from a /repo-name/ subpath`);
process.exit(ok ? 0 : 1);
