/**
 * Download every image referenced by the imported blog and rewrite the post
 * bodies to point at the local copies.
 *
 *   node tools/fetch-images.mjs
 *
 * Writes:
 *   cms/wwwroot/img/posts/<name>   the image files
 *   cms/Seeding/wordpress-posts.json  re-written with local /img/posts/... src
 *
 * Why: the site must not depend on dinoacuna.wordpress.com at runtime. The
 * CDN there can block hot-linking, move files, or go offline.
 *
 * Re-runnable. Already-downloaded files are skipped.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, extname, basename } from "node:path";

const JSON_PATH = "cms/Seeding/wordpress-posts.json";
const OUT_DIR = "cms/wwwroot/img/posts";
const LOCAL_PREFIX = "/img/posts/";

mkdirSync(OUT_DIR, { recursive: true });

const posts = JSON.parse(readFileSync(JSON_PATH, "utf8"));

/* ----------------------------------------------------------- url helpers */

/** WordPress serves one file at many sizes (?w=150, ?w=300, ?w=1024…). */
function canonical(url) {
  try {
    const u = new URL(url);
    return basename(decodeURIComponent(u.pathname));
  } catch {
    return basename(url.split("?")[0]);
  }
}

/** Prefer a ~1024w rendition: big enough to look sharp, far smaller than the original. */
function localSize(url) {
  try {
    const u = new URL(url);
    u.searchParams.set("w", "1024");
    u.searchParams.delete("h");
    u.searchParams.delete("crop");
    return u.toString();
  } catch {
    return url;
  }
}

/** WordPress filenames can collide after sanitising; keep a short hash suffix. */
function safeName(name) {
  const ext = extname(name).toLowerCase();
  const stem = basename(name, ext)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return (stem || "image") + ext;
}

/* -------------------------------------------------------- collect the set */

const wanted = new Map(); // canonical filename -> preferred download url
const note = (url) => {
  if (!url || !/^https?:\/\//i.test(url)) return;
  const c = canonical(url);
  if (!/\.(jpe?g|png|gif|webp)$/i.test(c)) return;
  const cur = wanted.get(c);
  if (!cur) wanted.set(c, localSize(url));
  else {
    // keep the larger rendition if we see a bigger width later
    const w = (s) => Number(new URL(s).searchParams.get("w") || 0);
    if (w(url) > w(cur)) wanted.set(c, localSize(url));
  }
};

for (const p of posts) {
  for (const m of p.body.matchAll(/<(?:img|source)\b[^>]*?\bsrc(set)?="([^"]+)"/g)) {
    for (const cand of m[2].split(",")) note(cand.trim().split(/\s+/)[0]);
  }
  for (const m of p.body.matchAll(/\bhref="(https?:\/\/[^"]+\.(?:jpe?g|png|gif|webp))"/g)) note(m[1]);
  note(p.featuredImage);
}

/* ------------------------------------------------------------- download */

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
  Referer: "https://dinoacuna.wordpress.com/",
};

let downloaded = 0, reused = 0, failed = 0;
const failures = [];
let done = 0;

async function fetchOne(canonicalName, url) {
  const name = safeName(canonicalName);
  const dest = join(OUT_DIR, name);

  if (existsSync(dest) && statSync(dest).size > 512) {
    reused++;
    return name;
  }

  // try the requested size, then fall back to the original and other widths
  const attempts = [
    url,
    canonical ? `https://dinoacuna.wordpress.com/wp-content/uploads/${canonicalName}` : null,
    url.replace(/([?&])w=\d+/, "$1w=800"),
    url.replace(/([?&])w=\d+/, ""),
  ].filter(Boolean);

  for (const attempt of attempts) {
    try {
      const r = await fetch(attempt, { headers });
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 512) continue; // error page or stub
      writeFileSync(dest, buf);
      downloaded++;
      return name;
    } catch {
      /* try the next candidate */
    }
  }

  failed++;
  failures.push(canonicalName);
  return null;
}

// modest concurrency so we don't hammer the CDN
const queue = [...wanted.entries()];
const CONCURRENCY = 6;

async function worker() {
  while (queue.length) {
    const [name, url] = queue.shift();
    await fetchOne(name, url);
    done++;
    if (done % 25 === 0 || !queue.length) {
      process.stdout.write(`\r  ${done}/${wanted.size}  ok=${downloaded} cached=${reused} failed=${failed}   `);
    }
  }
}

console.log(`images referenced : ${wanted.size}`);
console.log(`output directory  : ${OUT_DIR}\n`);

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log("\n");

if (failures.length) {
  console.log(`FAILED (${failures.length}):`);
  for (const f of failures.slice(0, 20)) console.log("  " + f);
}

/* ------------------------------------------------------ rewrite the bodies */

// canonical filename -> local name (only for files that actually exist)
const map = new Map();
for (const [c] of wanted) {
  const n = safeName(c);
  if (existsSync(join(OUT_DIR, n))) map.set(c, n);
}

function rewrite(html) {
  let out = html;
  // src / srcset
  out = out.replace(/\b(src|srcset)="([^"]+)"/g, (full, attr, value) => {
    if (!/^https?:\/\/dinoacuna\.wordpress\.com\//i.test(value.trim().split(/\s+/)[0])) return full;
    const parts = value.split(",").map((cand) => {
      const t = cand.trim();
      const [url, ...rest] = t.split(/\s+/);
      if (!/^https?:\/\/dinoacuna\.wordpress\.com\//i.test(url)) return t;
      const c = canonical(url);
      const local = map.get(c);
      return local ? [LOCAL_PREFIX + local, ...rest].join(" ") : t;
    });
    return `${attr}="${parts.join(", ")}"`;
  });
  // bare links to the image
  out = out.replace(/\bhref="(https?:\/\/dinoacuna\.wordpress\.com\/[^"]+\.(?:jpe?g|png|gif|webp))"/gi, (full, url) => {
    const local = map.get(canonical(url));
    return local ? `href="${LOCAL_PREFIX}${local}"` : full;
  });

  // WordPress editor metadata pointing back at the CDN. The browser never reads
  // these, but leaving 500+ absolute URLs in the HTML keeps the site dependent
  // on dinoacuna.wordpress.com and leaks referrers if anything ever looks at
  // them.
  out = out.replace(
    /\s+data-(?:orig-file|permalink|attachment-id|id)="https?:\/\/dinoacuna\.wordpress\.com\/[^"]*"/gi,
    ""
  );

  return out;
}

let rewritten = 0;
let remaining = 0;
for (const p of posts) {
  const before = p.body;
  p.body = rewrite(p.body);
  if (p.body !== before) rewritten++;
  remaining += (p.body.match(/dinoacuna\.wordpress\.com\/[^"']*\.(?:jpe?g|png|gif|webp)/gi) || []).length;
  p.featuredImage = p.featuredImage
    ? LOCAL_PREFIX + (map.get(canonical(p.featuredImage)) ?? "")
    : "";
}

writeFileSync(JSON_PATH, JSON.stringify(posts, null, 2), "utf8");

console.log(`bodies rewritten  : ${rewritten}/${posts.length}`);
console.log(`local image refs  : ${map.size} files`);
console.log(`external img refs left in bodies: ${remaining}`);
if (failures.length) console.log(`unresolved images : ${failures.length} (left pointing at WordPress)`);