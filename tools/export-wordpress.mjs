/**
 * Export the WordPress.com blog to JSON so it can be imported into Umbraco.
 *
 *   node tools/export-wordpress.mjs
 *
 * Writes cms/Seeding/wordpress-posts.json with, for every post:
 *   id, slug, title, date, url, excerpt, body (cleaned HTML), tags, category,
 *   and the first inline image (used as the card thumbnail).
 *
 * Re-runnable: it overwrites the file, so you can refresh the import whenever
 * the blog changes.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const SITE = "dinoacuna.wordpress.com";
const FIELDS = "ID,title,URL,date,modified,slug,excerpt,content,tags,categories,author";

async function fetchAll() {
  const out = [];
  for (let page = 1; ; page++) {
    const url =
      `https://public-api.wordpress.com/rest/v1.1/sites/${SITE}/posts/` +
      `?number=100&page=${page}&fields=${FIELDS}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${r.status} on page ${page}`);
    const j = await r.json();
    out.push(...(j.posts || []));
    if (!j.found || out.length >= j.found) break;
  }
  return out;
}

const decode = (s = "") =>
  s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

/** Strip WordPress editor metadata that points back at the CDN. */
function cleanWpMetadata(html) {
  let h = html;

  // share / like / comment blocks
  h = h.replace(/<div[^>]*class="[^"]*(sharedaddy|jp-relatedposts|wpcnt)[^"]*"[\s\S]*?<\/div>/gi, "");
  h = h.replace(/<div[^>]*id="?[a-z0-9_-]*comments?[\s\S]*$/i, "");
  h = h.replace(/<p[^>]*>\s*<!--[\s\S]*?-->\s*<\/p>/gi, "");

  // WordPress wraps bare URLs in paragraphs; tidy stray empties
  h = h.replace(/<p>\s*<\/p>/gi, "");
  h = h.replace(/^\s+|\s+$/g, "");

  // Every data-* attribute that carries a dinoacuna.wordpress.com URL. The
  // browser never reads them, but each one is still an absolute dependency on
  // the WordPress CDN, so they are removed outright.
  h = h.replace(/\s+data-[\w-]+="[^"]*dinoacuna\.wordpress\.com[^"]*"/gi, "");
  // srcset duplicates of the same image at different sizes
  h = h.replace(/\s+srcset="[^"]*"/gi, "");
  // leftover empty class attributes from stripped blocks
  h = h.replace(/\s+class=""/gi, "");

  return h.trim();
}

/** Strip the WordPress comment form, share buttons and other chrome. */
function cleanBody(html = "") {
  return cleanWpMetadata(html);
}

/** WordPress wraps text in <p>; return a short plain-text lead for the card. */
function plainExcerpt(html = "", max = 260) {
  const t = decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return (lastStop > 80 ? cut.slice(0, lastStop + 1) : cut + "…").trim();
}

/** First image in the post, used for the card. */
function firstImage(html = "") {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (!m) return "";
  // prefer a medium-ish size rather than the original
  return m[1]
    .replace(/\?w=\d+/, "?w=1024")
    .replace(/-scaled(\?|$)/, "$1");
}

/**
 * WordPress titles are kept verbatim.
 *
 * An earlier version tried to normalise casing, but the blog mixes shouted
 * titles ("MISS ROSALINA J. HAUTEA"), sentence case ("I Love My Generation")
 * and half-shouted ones ("Supporting OUR WOMEN SECTOR") — no rule fitted all
 * three without inventing words the author never wrote. The titles are the
 * author's voice, so only the HTML entities get decoded and a stray trailing
 * colon trimmed.
 */
function cleanTitle(t = "") {
  return decode(t)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s*[:—–]\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}



/**
 * Pick a short, human tag for the card. WordPress tags vary wildly — some are
 * a topic ("environment"), others a whole sentence ("33 miners rescued in
 * Chile") — so this maps to a small set of buckets, most-specific first.
 */
function pickTag(tags = [], title = "") {
  const has = (...res) => tags.some((t) => res.some((r) => r.test(t)));

  // The headline is the most reliable signal, so check it first.
  if (/\b(gratitude|in gratitude|thank you|sympath|rest well|sleep well|good night|farewell|remembering|condolen|tribute)\b/i.test(title))
    return "Tribute";
  if (/\b(rosa?lina|lola|al ing|al ing\b|hautea|bantug|patricia)\b/i.test(title)) return "Tribute";

  if (has(/environment|climate|sustainab|forest|renewab|reforest/i)) return "Environment";
  if (has(/women|gender|feminis/i)) return "Women";
  if (has(/heritage|history|cultur|kadalag|panaad|ancient|found|annivers|century|foran/i))
    return "Heritage";
  if (has(/mine|miners|chile|earthquake|disaster|tsunami|hostage|evacuat|quake/i)) return "World";
  if (has(/crime|criminal|police|AFP|BND|human rights|torture|kidnap|hostage/i)) return "Society";
  if (has(/education|school|teacher|tesda|skills|health|student/i)) return "Society";
  if (has(/OFW|remit|econom|sugar|business|pagcor|trade|industry|agricultur|rice|food|budget/i))
    return "Economy";
  if (has(/politic|senate|congress|election|comelec|president|p-noy|noynoy|cory|aquino|palace|legislat|ombudsman/i))
    return "Politics";

  // No topic tag — infer from the headline.
  if (/hostage|quake|earthquake|disaster|miners|chile/i.test(title)) return "World";
  if (/gratitude|thank|sympath|rest well|sleep well|good night|critic|mourn/i.test(title)) return "Tribute";
  if (/essay|generation|world!|hello world/i.test(title)) return "Essay";
  if (/president|senat|congress|elect|ombudsman|palace/i.test(title)) return "Politics";
  if (/police|crime|AFP|justice|court|massacre|killed/i.test(title)) return "Society";

  // No topic matched. Rather than surface an arbitrary WordPress tag (which is
  // often a person's name, "CDC", or a whole sentence), fall back to the shape
  // of the headline. This keeps the visible label set closed and predictable.
  if (/gratitude|thank|sympath|rest well|sleep well|good night|remember|critic|mourn|apolog/i.test(title)) return "Tribute";
  if (/essay|generation|world!|hello world|thinking|why i|what i/i.test(title)) return "Essay";
  if (/police|crime|AFP|justice|court|massacre|killed|shoot|hostage|robbery|detain/i.test(title)) return "Society";
  if (/president|senat|congress|elect|ombudsman|palace|republic/i.test(title)) return "Politics";
  if (/mine|earthquake|disaster|chile|international/i.test(title)) return "World";
  if (/econom|price|budget|salary|pay|remit|sugar|trade|business|industry|agricultur|rice|food/i.test(title)) return "Economy";
  if (/women|education|school|teacher|skills|health|family|community|environment|forest/i.test(title)) return "Society";
  if (/history|heritage|culture|found|annivers|century|tradition|memory/i.test(title)) return "Heritage";

  // Last resort. A raw WordPress tag is often a person's name ("Merly Fortu"),
  // an agency ("CDC", "Shootout"), or a whole sentence, none of which belong on
  // a card, so fall through to a neutral label instead.
  return "Journal";
}

const posts = await fetchAll();

const cleaned = posts
  .map((p) => {
    const body = cleanBody(p.content || "");
    const tags = Object.values(p.tags || {}).map((t) => t.name);
    const cats = Object.values(p.categories || {}).map((c) => c.name);
    const rawTitle = cleanTitle(p.title || "");
    return {
      id: p.ID,
      slug: p.slug,
      title: rawTitle,
      rawTitle,
      date: p.date,
      url: p.URL,
      excerpt: plainExcerpt(body),
      body,
      featuredImage: firstImage(body),
      tags,
      category: cats[0] || "Journal",
      cardTag: pickTag(tags, rawTitle),
    };
  })
  .sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first

const outPath = join(process.cwd(), "cms", "Seeding", "wordpress-posts.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(cleaned, null, 2), "utf8");

console.log(`exported ${cleaned.length} posts -> ${outPath}`);
console.log(`  with a featured image : ${cleaned.filter((p) => p.featuredImage).length}`);
console.log(`  total body characters : ${cleaned.reduce((n, p) => n + p.body.length, 0).toLocaleString()}`);
console.log(`  date range            : ${cleaned[cleaned.length - 1].date.slice(0, 10)} .. ${cleaned[0].date.slice(0, 10)}`);
console.log("\n  all titles:");
for (const p of cleaned) {
  console.log(`    ${p.date.slice(0, 10)}  [${p.cardTag.padEnd(12)}]  ${p.title}`);
}
