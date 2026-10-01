/**
 * Minifies every image in both builds.
 *
 *   node tools/optimize-images.mjs [--dry]
 *
 * GitHub Pages has a 1 GB site limit and a 100 GB/month bandwidth limit, so a
 * 25 MB first visit is both slow to serve and expensive to repeat. The source
 * files were fetched from WordPress at w=1024 without re-encoding, so they carry
 * whatever quality WordPress chose and often an EXIF block.
 *
 * Two size classes, because the same photograph is displayed at two very
 * different widths:
 *
 *   assets/img/cards/   440px  the journal cards (the column is ~207px CSS px)
 *   assets/img/posts/   1024px the article bodies (.post-full-inner is 760px)
 *
 * Re-running is safe. A manifest records the SHA-256 of each file as it was
 * after optimizing, so a second pass recognises its own output and skips it.
 * Without that, every run would re-encode an already-compressed JPEG and
 * degrade it a little more each time.
 */
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync,
} from "node:fs";
import { join, extname, basename } from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";

const DRY = process.argv.includes("--dry");
const MANIFEST = "cms/Seeding/optimize-manifest.json";

sharp.cache(false);
sharp.concurrency(4);

/* ------------------------------------------------------------------ config */

/**
 * Displayed width in CSS px is noted per row; the source is set just above it.
 *
 * These numbers come from measuring real files (see tools/calibrate.mjs), not
 * from convention. WebP was tested at the same perceived quality and only saved
 * 16-22%, which does not justify renaming every reference across the JSON, the
 * Razor views and the static HTML.
 *
 * img/cards is deliberately absent: buildCards() owns that directory, because
 * the card copies are derived from the post images rather than being originals
 * in their own right. Listing it here would re-encode them on every run.
 */
const RULES = [
  {
    dir: "img/posts",
    width: 900,
    quality: 68,
    label: "article body (displayed up to 760px)",
  },
  {
    dir: "img/editorial",
    width: 900,
    quality: 72,
    label: "editorial photograph",
  },
  {
    dir: "img/thumbs",
    width: 560,
    quality: 72,
    label: "video thumbnail (displayed ~400px)",
  },
];

// The builds keep their own copies; the media is identical, so process once
// and mirror. Which directories exist depends on what has been fetched.
const ROOTS = ["cms/wwwroot", "assets"];

/* ---------------------------------------------------------------- manifest */

let manifest = {};
if (existsSync(MANIFEST)) {
  try {
    manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  } catch {
    manifest = {};
  }
}

const sha = (buf) => createHash("sha256").update(buf).digest("hex");

/* ------------------------------------------------------------------ helpers */

/**
 * Re-encode one buffer.
 *
 * JPEG and WebP photos go through mozjpeg at the configured quality. PNGs are
 * kept as PNG because the seals and logos rely on transparency, but are
 * quantised to a palette and maximally deflated, which is where most of their
 * size goes.
 */
async function encode(input, ext, width, quality) {
  const pipeline = sharp(input, { failOn: "none" }).rotate(); // honour EXIF, then drop it

  if (ext === ".png") {
    return pipeline
      .resize({ width, withoutEnlargement: true })
      .png({ compressionLevel: 9, effort: 10, palette: true, quality: 90 })
      .toBuffer();
  }

  if (ext === ".gif") {
    // Animated GIFs are not used here; keep them as-is rather than flattening.
    return null;
  }

  if (ext === ".webp") {
    return pipeline
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort: 6 })
      .toBuffer();
  }

  return pipeline
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality, progressive: true, mozjpeg: true, chromaSubsampling: "4:2:0" })
    .toBuffer();
}

/* --------------------------------------------------------------- card sizes */

/**
 * Sync the width/height attributes in the post bodies with the files as they
 * are now, and drop the editor metadata WordPress left behind.
 *
 * The bodies carry width="1024" height="477" from the original download. After
 * the resize the real file is 900px wide, so the declared intrinsic size no
 * longer describes it. The aspect ratio survives the resize, so the layout shift
 * is negligible -- but the numbers are simply wrong, and they are what a browser
 * uses to reserve space before the image arrives.
 *
 * The data-* attributes are different: data-image-meta carries a block of EXIF
 * (camera, aperture, ISO) that nothing reads. It is roughly a fifth of the
 * article markup and has no value on a published page.
 */
async function syncBodyDimensions() {
  const JSON_PATH = "cms/Seeding/wordpress-posts.json";
  if (!existsSync(JSON_PATH)) return 0;

  const posts = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  const dims = new Map(); // "/img/posts/<name>" -> [w, h]

  for (const dir of ["cms/wwwroot/img/posts", "cms/wwwroot/img/cards"]) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (!statSync(path).isFile()) continue;
      if (!/\.(jpe?g|png|webp)$/i.test(name)) continue;
      try {
        const m = await sharp(path, { failOn: "none" }).metadata();
        if (m.width && m.height) dims.set(`/img/${basename(dir)}/${name}`, [m.width, m.height]);
      } catch {
        /* leave the attribute as-is if the header cannot be read */
      }
    }
  }

  let fixed = 0;
  let stripped = 0;

  for (const p of posts) {
    let body = p.body || "";

    // Dead editor metadata. Note this is a *second* pass: export-wordpress.mjs
    // already drops the data-* attributes that carry a wordpress.com URL, but
    // these have no URL so they slipped through.
    const before = body;
    body = body
      .replace(/\s+data-image-meta="[^"]*"/g, "")
      .replace(/\s+data-orig-size="[^"]*"/g, "")
      .replace(/\s+data-comments-opened="[^"]*"/g, "")
      .replace(/\s+data-image-(?:title|description|caption)="[^"]*"/g, "")
      .replace(/\s+data-attachment-id="[^"]*"/g, "")
      .replace(/\s+data-id="[^"]*"/g, "");
    if (body !== before) stripped++;

    // Correct the declared intrinsic size from the real file.
    body = body.replace(
      /(<img\b[^>]*?\bsrc=")(\/img\/(?:posts|cards)\/[^"]+)("[^>]*?>)/g,
      (whole, pre, src, post) => {
        const d = dims.get(src);
        if (!d) return whole;
        let out = post;
        if (/\bwidth="\d+"/.test(out)) out = out.replace(/\bwidth="\d+"/, `width="${d[0]}"`);
        if (/\bheight="\d+"/.test(out)) out = out.replace(/\bheight="\d+"/, `height="${d[1]}"`);
        // sizes/srcset described the old 1024px rendition
        if (/\bsizes="[^"]*1024px[^"]*"/.test(out))
          out = out.replace(/\bsizes="[^"]*"/, `sizes="auto, (max-width: ${d[0]}px) 100vw, ${d[0]}px"`);
        if (out === post) return whole;
        fixed++;
        return pre + src + out;
      }
    );

    p.body = body;
  }

  if (!DRY) writeFileSync(JSON_PATH, JSON.stringify(posts, null, 2), "utf8");
  return { fixed, stripped, known: dims.size };
}

/**
 * Build the small thumbnail class from each post's featured image.
 *
 * The cards crop to a narrow column, so a downscaled copy is far sharper per
 * byte than letting the browser shrink a 900px file.
 *
 * Writes a separate `cardImage` field rather than rewriting `featuredImage`.
 * Overwriting it made this step non-reproducible: the source list is derived
 * from `featuredImage`, so a second run found nothing to work from and could not
 * rebuild the class. A post legitimately has two images -- the full-size one
 * for the article and the small one for its card.
 */
async function buildCards(outDirs, stats) {
  const JSON_PATH = "cms/Seeding/wordpress-posts.json";
  if (!existsSync(JSON_PATH)) return new Map();

  const postsData = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  const made = new Map();     // post id   -> card path (every post gets one)
  const encoded = new Map();  // src name  -> card path (dedupes the encode)

  for (const p of postsData) {
    const featured = p.featuredImage;
    if (!featured || !featured.startsWith("/img/posts/")) continue;
    const name = basename(featured);

    // Two posts can share a featured image (they get the same card file), but
    // both still need cardImage set -- so the encode is deduplicated while the
    // per-post mapping is not.
    let cardPath = encoded.get(name);

    if (!cardPath) {
      const src = join("cms/wwwroot/img/posts", name);
      if (!existsSync(src)) continue;

      // Guard on the source file's hash. Without this the card class is
      // re-encoded on every run, which is wasted work (the post images are
      // already at their final size, so the output is byte-identical anyway).
      const srcHash = sha(readFileSync(src));
      if (manifest["card:" + name] === srcHash) {
        cardPath = `/img/cards/${name}`;
        encoded.set(name, cardPath);
        made.set(p.id, cardPath);
        continue;
      }

      const out = await encode(src, extname(name).toLowerCase(), 440, 68);
      if (!out) continue;

      manifest["card:" + name] = srcHash;

      for (const d of outDirs) {
        if (!existsSync(d)) continue;
        mkdirSync(d, { recursive: true });
        writeFileSync(join(d, name), out);
      }

      cardPath = `/img/cards/${name}`;
      encoded.set(name, cardPath);
      stats.cards++;
      stats.cardsBytes += out.length;
    }

    made.set(p.id, cardPath);
  }

  // Attach rather than replace, so the post keeps its article image.
  for (const p of postsData) {
    if (made.has(p.id)) p.cardImage = made.get(p.id);
  }

  if (!DRY) writeFileSync(JSON_PATH, JSON.stringify(postsData, null, 2), "utf8");

  return made;
}

/* -------------------------------------------------------------------- main */

const stats = {
  files: 0,
  skipped: 0,
  cards: 0,
  cardsBytes: 0,
  bytesIn: 0,
  bytesOut: 0,
  failures: [],
};

const featureDirs = ["cms/wwwroot/img/cards", "assets/img/cards"];
for (const d of featureDirs) mkdirSync(d, { recursive: true });

console.log("Optimizing images\n");
console.log("  directory      files     before      after   saved");
console.log("  " + "-".repeat(58));

for (const rule of RULES) {
  let dirIn = 0;
  let dirOut = 0;
  let dirN = 0;
  let dirSkipped = 0;

  for (const root of ROOTS) {
    const dir = join(root, rule.dir);
    if (!existsSync(dir)) continue;

    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (!statSync(path).isFile()) continue;
      const ext = extname(name).toLowerCase();
      if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) continue;

      const raw = readFileSync(path);
      const key = path.replace(/\\/g, "/");

      if (manifest[key] === sha(raw)) {
        dirSkipped++;
        stats.skipped++;
        continue;
      }

      let out;
      try {
        out = await encode(raw, ext, rule.width, rule.quality);
      } catch (e) {
        stats.failures.push(`${key}: ${e.message}`);
        continue;
      }
      if (!out) {
        stats.skipped++;
        continue;
      }

      // Re-encoding should never make a file meaningfully bigger. A PNG that
      // gains bytes under quantisation is better off untouched.
      if (out.length >= raw.length && rule.dir !== "img/cards") {
        manifest[key] = sha(raw);
        stats.skipped++;
        dirSkipped++;
        continue;
      }

      if (!DRY) writeFileSync(path, out);
      manifest[key] = sha(out);

      dirN++;
      dirIn += raw.length;
      dirOut += out.length;
      stats.files++;
      stats.bytesIn += raw.length;
      stats.bytesOut += out.length;
    }
  }

  const pct = dirIn ? Math.round((1 - dirOut / dirIn) * 100) : 0;
  console.log(
    `  ${rule.dir.padEnd(14)} ${String(dirN + dirSkipped).padStart(5)} ` +
      `${fmt(dirIn).padStart(9)} ${fmt(dirOut).padStart(11)} ${String(pct).padStart(5)}%  ${rule.label}`
  );
}

/* --------------------------------------------------- card class + rewiring */

const built = DRY ? new Map() : await buildCards(["cms/wwwroot/img/cards", "assets/img/cards"], stats);

if (built.size) {
  const distinct = stats.cards;
  console.log(
    `  ${"(new)".padEnd(14)} ${String(distinct).padStart(5)} ` +
      `${fmt(0).padStart(9)} ${fmt(stats.cardsBytes).padStart(11)}         card thumbnails for ${built.size} posts ` +
      `(${distinct} distinct file${distinct === 1 ? "" : "s"})`
  );
  console.log(`  set cardImage on ${built.size} posts in cms/Seeding/wordpress-posts.json`);
}

const sync = await syncBodyDimensions();
if (sync.known) {
  console.log(
    `\n  synced ${sync.fixed} width/height pairs, stripped dead editor metadata from ${sync.stripped} posts`
  );
}

if (!DRY) {
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 0), "utf8");
}

/* ----------------------------------------------------------------- summary */

const saved = stats.bytesIn - stats.bytesOut;
console.log("\n" + "-".repeat(58));
console.log(`  re-encoded     ${stats.files}`);
console.log(`  already ok     ${stats.skipped}`);
console.log(`  card class     ${stats.cards} files for ${built.size} posts, ${fmt(stats.cardsBytes)}`);
console.log(`  total          ${fmt(stats.bytesIn)} -> ${fmt(stats.bytesOut)}  (saved ${fmt(saved)})`);
if (stats.failures.length) {
  console.log(`\n  FAILURES (${stats.failures.length}):`);
  for (const f of stats.failures.slice(0, 10)) console.log("    " + f);
}

function fmt(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + " MB";
  if (bytes >= 1024) return Math.round(bytes / 1024) + " KB";
  return bytes + " B";
}
