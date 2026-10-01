/**
 * The About / Heritage / Programs sections have a handful of editorial
 * photographs hard-coded in the Razor views and the static HTML, pointing at
 * dinoacuna.wordpress.com. This downloads them and rewrites those references to
 * the local copies.
 *
 *   node tools/fetch-editorial-images.mjs
 *
 * Writes cms/wwwroot/img/editorial/ and updates:
 *   cms/Views/Home.cshtml
 *   cms/Views/Post.cshtml
 *   index.html
 *   assets/ (the static build mirrors cms/wwwroot, so it is synced after)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, copyFileSync } from "node:fs";
import { join, basename } from "node:path";

const OUT = "cms/wwwroot/img/editorial";
mkdirSync(OUT, { recursive: true });

const TARGETS = [
  "cms/Views/Home.cshtml",
  "cms/Views/Post.cshtml",
  "index.html",
  "assets/css/styles.css",
  "cms/wwwroot/css/styles.css",
];

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
  Referer: "https://dinoacuna.wordpress.com/",
};

// Collect every dinoacuna.wordpress.com image reference in the target files.
const refs = new Map(); // absolute source url -> local name
for (const f of TARGETS) {
  if (!existsSync(f)) continue;
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/https:\/\/dinoacuna\.wordpress\.com\/[^\s"')]+\.(?:jpe?g|png|gif|webp)(\?w=\d+)?/gi)) {
    const raw = m[0];
    const name = basename(new URL(raw).pathname);
    refs.set(raw, name);
  }
}

console.log(`editorial image references found: ${refs.size}`);

let ok = 0, failed = 0;
const failedNames = [];

for (const [url, name] of refs) {
  const dest = join(OUT, name);
  if (existsSync(dest) && statSync(dest).size > 512) { ok++; continue; }
  // request the width the site actually asks for
  const want = url.match(/\?w=(\d+)/)?.[1] ?? "1024";
  const u = url.replace(/\?w=\d+/, "") + "?w=" + want;
  try {
    const r = await fetch(u, { headers });
    if (!r.ok) throw new Error(r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 512) throw new Error("too small");
    writeFileSync(dest, buf);
    ok++;
    console.log(`  ok   ${String(Math.round(buf.length / 1024)).padStart(5)} KB  ${name}`);
  } catch (e) {
    failed++;
    failedNames.push(name);
    console.log(`  FAIL ${name}  (${e.message})`);
  }
}

/* ------------------------------------------------------------- rewrite */

function localFor(url) {
  const name = basename(new URL(url).pathname);
  return existsSync(join(OUT, name)) ? `/img/editorial/${name}` : null;
}

let changed = 0;
for (const f of TARGETS) {
  if (!existsSync(f)) continue;
  let src = readFileSync(f, "utf8");
  const before = src;

  src = src.replace(
    /https:\/\/dinoacuna\.wordpress\.com\/[^\s"')]+\.(?:jpe?g|png|gif|webp)(?:\?w=\d+)?/gi,
    (m) => localFor(m) ?? m
  );

  // Razor helper urls need the ~ prefix to resolve from any route depth.
  src = src.replace(/(["'(])~\/img\/editorial\//g, "$1~/img/editorial/");

  if (src !== before) {
    writeFileSync(f, src, "utf8");
    changed++;
    console.log(`  updated ${f}`);
  }
}

console.log(`\ndownloaded ${ok}, failed ${failed}`);
console.log(`files updated: ${changed}`);
if (failedNames.length) console.log("unresolved: " + failedNames.join(", "));

/* ------------------------- keep the two builds' CSS in sync -------------- */
const a = "assets/css/styles.css";
const b = "cms/wwwroot/css/styles.css";
if (existsSync(a) && existsSync(b)) {
  copyFileSync(a, b);
  console.log("synced cms/wwwroot/css/styles.css from assets/css/styles.css");
}