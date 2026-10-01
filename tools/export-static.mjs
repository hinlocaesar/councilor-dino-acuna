/**
 * Exports the running Umbraco site to plain static files for GitHub Pages.
 *
 *   dotnet run --project cms          # in one terminal
 *   node tools/export-static.mjs      # in another
 *
 * Why export from the CMS rather than write a second copy of the markup: the
 * Razor views are the single source of truth. Hand-maintaining a parallel set
 * of article pages would drift from them the moment either side was edited.
 *
 * Produces dist/:
 *
 *   dist/index.html                     home
 *   dist/post/<slug>/index.html         all 40 articles
 *   dist/.nojekyll  dist/robots.txt  dist/sitemap.xml
 *
 * Markup only. The images, fonts and scripts are copied in afterwards by
 * tools/assemble-pages.mjs, from the same cms/wwwroot the CMS serves.
 *
 * URL rewriting
 * -------------
 * The CMS emits root-absolute URLs ("/css/styles.css", "/post/<slug>") because
 * it always runs at the domain root. GitHub Pages serves a project repository
 * from a subpath -- https://<user>.github.io/<repo>/ -- where a root-absolute
 * URL resolves to the wrong place and 404s.
 *
 * So every same-origin absolute URL is rewritten to be document-relative:
 *
 *   dist/index.html                  ""          ->  /css/styles.css  -> css/styles.css
 *   dist/post/<slug>/index.html      "../../"   ->  /css/styles.css  -> ../../css/styles.css
 *
 * Document-relative also means the export works when opened straight off disk,
 * which root-absolute URLs never do.
 *
 * External URLs (the original WordPress links, Facebook) are left untouched.
 */
import {
  mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync, statSync,
} from "node:fs";
import { join } from "node:path";

const SOURCE = process.argv[2] || "http://localhost:5001";
const OUT = "dist";
const WWWROOT = "cms/wwwroot";

const posts = JSON.parse(readFileSync("cms/Seeding/wordpress-posts.json", "utf8"));

/* ------------------------------------------------------------- preflight */

let home;
try {
  const res = await fetch(SOURCE + "/", { redirect: "manual" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  home = await res.text();
} catch (e) {
  console.error(`\n  Cannot reach the CMS at ${SOURCE}  (${e.message})\n`);
  console.error("  Start it first:   dotnet run --project cms");
  console.error("  Or point elsewhere: node tools/export-static.mjs http://localhost:5001\n");
  process.exit(1);
}

if (!home.includes("post-full") && !home.includes("hero")) {
  console.error("\n  The CMS responded but the page does not look like the site.");
  console.error("  Refusing to export — check that you are pointing at the right port.\n");
  process.exit(1);
}

console.log(`\nExporting ${SOURCE} -> ${OUT}/\n`);

/* --------------------------------------------------------- url rewriting */

/**
 * Rewrite same-origin root-absolute URLs to be document-relative.
 *
 * `prefix` is "" for the home page and "../../" for an article page.
 * Internal article links also gain a trailing slash, because Pages serves
 * dist/post/<slug>/index.html and will 404 a request for /post/<slug>.
 */
function rewrite(html, prefix) {
  let out = html;

  // href="/..." and src="/..." -> prefix + path
  //
  // Note the captured group excludes the leading slash (the pattern consumes
  // it), so the article test below matches on "post/...", not "/post/...".
  out = out.replace(/\b(href|src)="\/(?!\/)([^"]*)"/g, (whole, attr, path) => {
    if (!path) return `${attr}="${prefix || "./"}"`;

    // An internal article link needs the trailing slash for directory indexes.
    const withSlash = /^post\/[^/?#]+(\?[^"#]*)?(#.*)?$/.test(path)
      ? path.replace(/^(post\/[^/?#]+)(\?[^"#]*)?(#.*)?$/, "$1/$2$3")
      : path;

    return `${attr}="${prefix}${withSlash}"`;
  });

  // srcset="a.jpg 1x, b.jpg 2x" — same rule, per candidate.
  out = out.replace(/\bsrcset="([^"]*)"/g, (whole, value) => {
    const rewritten = value
      .split(",")
      .map((cand) => {
        const t = cand.trim();
        if (!t.startsWith("/")) return t;
        return prefix + t;
      })
      .join(", ");
    return `srcset="${rewritten}"`;
  });

  // url(...) inside any inline <style> the views may emit
  out = out.replace(/url\(\s*['"]?\/(?!\/)([^'")]+)['"]?\s*\)/g, (whole, path) => `url(${prefix}${path})`);

  return out;
}

/* ------------------------------------------------------------- the pages */

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

writeFileSync(join(OUT, "index.html"), rewrite(home, ""), "utf8");
console.log(`  index.html                    1 page`);

let written = 0;
const failures = [];

for (const p of posts) {
  const slug = p.slug;
  if (!slug) continue;

  let html;
  try {
    const res = await fetch(`${SOURCE}/post/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error("HTTP " + res.status);
    html = await res.text();
  } catch (e) {
    failures.push(`${slug}: ${e.message}`);
    continue;
  }

  // Article pages sit two directories deep: dist/post/<slug>/index.html
  const dir = join(OUT, "post", slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), rewrite(html, "../../"), "utf8");
  written++;
}

console.log(`  post/<slug>/index.html        ${written} pages`);

if (failures.length) {
  console.log(`\n  FAILED (${failures.length}):`);
  for (const f of failures.slice(0, 10)) console.log("    " + f);
  process.exit(1);
}

/* ---------------------------------------------------------------- assets */

/**
 * Only the HTML is written here.
 *
 * The images, fonts and scripts are not copied: they already live in
 * cms/wwwroot and are committed there. tools/assemble-pages.mjs copies them in
 * at deploy time (and in CI, which has no CMS to export from).
 *
 * That split keeps dist/ small enough to commit — about 1 MB of markup rather
 * than 12 MB of duplicated binaries — and it is what makes the backoffice the
 * source of truth. If CI could render the pages itself it would re-seed a fresh
 * database from cms/Seeding/wordpress-posts.json and publish content that
 * predates any edit made in the local backoffice.
 */
function countAndSize(dir) {
  let n = 0;
  let bytes = 0;
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else {
        n++;
        bytes += statSync(p).size;
      }
    }
  };
  if (existsSync(dir)) walk(dir);
  return { n, bytes };
}

// Pages still runs Jekyll on some repositories; this keeps files and
// directories beginning with an underscore from being dropped.
writeFileSync(join(OUT, ".nojekyll"), "");
writeFileSync(join(OUT, "robots.txt"), "User-agent: *\nAllow: /\n", "utf8");

/* --------------------------------------------------------------- sitemap */

const site = process.argv[3] || "https://hinlocaesar.github.io/councilor-dino-acuna";
const today = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: `${site}/`, priority: "1.0", lastmod: today },
  ...posts
    .filter((p) => p.slug)
    .map((p) => ({
      loc: `${site}/post/${p.slug}/`,
      priority: "0.7",
      lastmod: (p.date || today).slice(0, 10),
    })),
];

writeFileSync(
  join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n` +
          `    <priority>${u.priority}</priority>\n  </url>`
      )
      .join("\n") +
    `\n</urlset>\n`,
  "utf8"
);
console.log(`  sitemap.xml                   ${urls.length} urls`);

/* ---------------------------------------------------------------- summary */

const total = countAndSize(OUT);
console.log(`\n  ${OUT}/ has ${total.n} files, ${(total.bytes / 1024 / 1024).toFixed(2)} MB of markup`);
console.log("  next:  node tools/assemble-pages.mjs      (copies assets in from cms/wwwroot)");
console.log("  then:  node tools/verify-export.mjs       (checks it under a Pages subpath)\n");
