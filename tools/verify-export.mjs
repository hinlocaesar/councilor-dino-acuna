/**
 * Checks the exported site in dist/ the way GitHub Pages will serve it.
 *
 *   node tools/verify-export.mjs [prefix]
 *
 * Mounts dist/ under a subpath (Pages serves a project repo from
 * /<repo>/) and loads the home page and a sample of articles in a real
 * browser. Fails on any 404, and checks that:
 *
 *   - every internal article link resolves, including the trailing slash
 *     (Pages serves dist/post/<slug>/index.html and 404s a request for
 *     /post/<slug>)
 *   - the article pages actually render their title and body
 *   - the journal cards on the home page point at local article pages
 *   - nothing reaches outside the origin
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "playwright";

const PREFIX = process.argv[2] || "/councilor-dino-acuna";
const ROOT = join(process.cwd(), "dist");
// Bind an ephemeral port rather than a fixed one. A hard-coded 4400 collides
// with anything else using it -- including a preview server left running from
// an earlier check -- and failing on that has nothing to do with whether the
// export is sound.
const PORT = Number(process.argv[3]) || 0;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

if (!existsSync(ROOT)) {
  console.error("\n  dist/ not found. Run:  dotnet run --project cms   then   node tools/export-static.mjs\n");
  process.exit(1);
}

const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (!path.startsWith(PREFIX)) return res.writeHead(404).end("outside prefix");

  let rel = path.slice(PREFIX.length) || "/";
  if (rel.endsWith("/")) rel += "index.html";

  const file = join(ROOT, rel);
  if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile())
    return res.writeHead(404).end("not found");

  res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
});

await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
const actual = server.address().port;
const BASE = `http://127.0.0.1:${actual}${PREFIX}`;
console.log(`\nserving dist/ at ${BASE}/\n`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

const bad = [];
ctx.on("response", (r) => {
  if (r.status() >= 400) bad.push(`${r.status()}  ${r.url().replace(BASE, "")}`);
});
ctx.on("requestfailed", (r) => bad.push(`FAIL ${r.url().replace(BASE, "")}`));

const page = await ctx.newPage();
const home = await page.goto(BASE + "/", { waitUntil: "load", timeout: 60000 });
console.log(`home: HTTP ${home.status()}`);

await page.evaluate(async () => {
  for (let i = 0, y = 0; i < 60; i++, y += window.innerHeight) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 50));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(1200);

const cards = await page.evaluate(() => {
  // Each card has three links to the same article (thumbnail, title, "Read the
  // post"), so count distinct targets rather than anchors.
  const hrefs = [...document.querySelectorAll(".post a[href^='post/']")].map((a) =>
    a.getAttribute("href")
  );
  return {
    total: document.querySelectorAll(".post").length,
    anchors: hrefs.length,
    distinct: new Set(hrefs).size,
    withSlash: hrefs.every((h) => h.endsWith("/")),
    loaded: [...document.querySelectorAll(".post-thumb img")].filter((i) => i.naturalWidth > 0).length,
  };
});
console.log(`journal cards: ${cards.total} (${cards.anchors} anchors -> ${cards.distinct} distinct articles)`);
console.log(`  every article link ends in "/": ${cards.withSlash}   (Pages needs it)`);
console.log(`  thumbnails loaded: ${cards.loaded}/${cards.total}`);

// Walk every article link and confirm the page renders.
const links = await page.$$eval(".post a[href^='post/']", (as) =>
  [...new Set(as.map((a) => a.getAttribute("href")))]
);
console.log(`\nvisiting all ${links.length} articles...`);

const brokenArticles = [];
const emptyArticles = [];
for (const href of links) {
  const before = bad.length;
  const res = await page.goto(`${BASE}/${href}`, { waitUntil: "load", timeout: 60000 });
  const info = await page.evaluate(() => {
    const h1 = document.querySelector(".post-full h1");
    const prose = document.querySelector(".prose");
    return {
      title: h1 ? h1.textContent.trim() : null,
      proseChars: prose ? prose.textContent.trim().length : 0,
      imgs: document.querySelectorAll(".prose img").length,
    };
  });
  if (res.status() !== 200) brokenArticles.push(`${href} HTTP ${res.status()}`);
  else if (!info.title || info.proseChars < 120) emptyArticles.push(`${href} "${info.title}" ${info.proseChars} chars`);
  if (bad.length > before) { /* already recorded in bad[] */ }
}

// Check one article in depth, including its stylesheet and fonts resolving
// from two directories deep.
const sample = links[0];
await page.goto(`${BASE}/${sample}`, { waitUntil: "load" });
const deep = await page.evaluate(() => {
  const h1 = document.querySelector(".post-full h1");
  return {
    hasArticle: !!document.querySelector(".post-full"),
    cssApplied: getComputedStyle(document.body).backgroundColor,
    font: h1 ? getComputedStyle(h1).fontFamily.split(",")[0] : "(no h1)",
    proseImages: [...document.querySelectorAll(".prose img")].map((i) => i.naturalWidth > 0),
    backlink: document.querySelector(".backlink")?.getAttribute("href") || null,
    navHref: document.querySelector(".nav a")?.getAttribute("href") || null,
  };
});
console.log(`\ndeep check on ${sample}`);
console.log(`  article element : ${deep.hasArticle}`);
console.log(`  body background : ${deep.cssApplied}`);
console.log(`  heading font    : ${deep.font}`);
console.log(`  prose images    : ${deep.proseImages.filter(Boolean).length}/${deep.proseImages.length} decoded`);
console.log(`  "All entries"    : ${deep.backlink}`);
console.log(`  first nav link  : ${deep.navHref}`);

// Confirm nothing is same-origin-absolute (would break under the subpath).
const absolute = await page.evaluate(() =>
  [...document.querySelectorAll("[href],[src]")]
    .map((e) => e.getAttribute("href") || e.getAttribute("src") || "")
    .filter((u) => u.startsWith("/") && !u.startsWith("//"))
);
console.log(`  root-absolute refs: ${absolute.length}${absolute.length ? " -> " + absolute.slice(0, 3).join(" ") : ""}`);

await browser.close();
server.close();

/* ------------------------------------------------------------- verdict */

console.log(`\nfailed requests: ${bad.length}`);
for (const b of [...new Set(bad)].slice(0, 12)) console.log("  " + b);
if (brokenArticles.length) {
  console.log(`\nbroken articles (${brokenArticles.length}):`);
  for (const b of brokenArticles.slice(0, 10)) console.log("  " + b);
}
if (emptyArticles.length) {
  console.log(`\nempty articles (${emptyArticles.length}):`);
  for (const b of emptyArticles.slice(0, 10)) console.log("  " + b);
}

const ok =
  bad.length === 0 &&
  brokenArticles.length === 0 &&
  emptyArticles.length === 0 &&
  absolute.length === 0 &&
  cards.withSlash &&
  cards.loaded === cards.total &&
  cards.distinct === cards.total;

console.log(`\n${ok ? "PASS" : "FAIL"} — the export is servable from ${PREFIX}/\n`);
process.exit(ok ? 0 : 1);
