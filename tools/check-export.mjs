/**
 * Checks that dist/ still matches cms/Seeding/wordpress-posts.json.
 *
 *   node tools/check-export.mjs
 *
 * The markup in dist/ is committed, because CI cannot render it (the content
 * lives in a local SQLite database, not in the repository). That makes it
 * possible to edit the blog, forget to re-export, and quietly publish a stale
 * site.
 *
 * This compares the two structurally — every imported slug has a page, and
 * every exported page has a slug. It cannot detect edited text, so the
 * documented workflow is still "edit, then npm run pages:build, then commit".
 * This catches the common failure: articles added or removed without re-export.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const posts = JSON.parse(readFileSync("cms/Seeding/wordpress-posts.json", "utf8"));
const expected = new Set(posts.filter((p) => p.slug).map((p) => p.slug));

const problems = [];

if (!existsSync("dist/index.html")) {
  console.error("\n  dist/index.html is missing.");
  console.error("  Run:  dotnet run --project cms   then   npm run pages:build\n");
  process.exit(1);
}

const POSTS_DIR = "dist/post";
const found = new Set();
if (existsSync(POSTS_DIR)) {
  for (const slug of readdirSync(POSTS_DIR)) {
    const dir = join(POSTS_DIR, slug);
    if (!statSync(dir).isDirectory()) continue;
    const page = join(dir, "index.html");
    if (!existsSync(page)) {
      problems.push(`dist/post/${slug}/ has no index.html`);
      continue;
    }
    found.add(slug);

    // A page that renders empty is worse than a missing one: it looks published.
    //
    // Deliberately not counting characters inside the .prose container. The
    // article bodies contain nested <div> elements (WordPress galleries and
    // alignment wrappers), so any regex that tries to find the matching
    // </div> stops at the first inner one and reports a short article that is
    // in fact perfectly fine. Structural markers nest badly; tag counts do not.
    // tools/verify-export.mjs measures the rendered text in a browser instead.
    const html = readFileSync(page, "utf8");

    if (!/class="post-full/.test(html)) {
      problems.push(`dist/post/${slug}/ has no post-full article container`);
    }
    if (!/<h1[^>]*>\s*\S/.test(html)) {
      problems.push(`dist/post/${slug}/ has no non-empty <h1>`);
    }
    const paragraphs = (html.match(/<p[\s>]/gi) || []).length;
    if (paragraphs < 2) {
      problems.push(`dist/post/${slug}/ has only ${paragraphs} paragraph tag(s) — likely an empty body`);
    }
  }
}

for (const slug of expected) {
  if (!found.has(slug)) problems.push(`missing dist/post/${slug}/index.html for imported post "${slug}"`);
}
for (const slug of found) {
  if (!expected.has(slug)) problems.push(`dist/post/${slug}/ has no matching imported post`);
}

// Every article link on the home page must point at a page that exists.
const home = readFileSync("dist/index.html", "utf8");
const linked = new Set([...home.matchAll(/href="post\/([^/"]+)\//g)].map((m) => m[1]));
for (const slug of linked) {
  if (!existsSync(join(POSTS_DIR, slug, "index.html"))) {
    problems.push(`the home page links to post/${slug}/ but that page does not exist`);
  }
}

console.log(`\n  imported posts : ${expected.size}`);
console.log(`  exported pages : ${found.size}`);
console.log(`  linked from home: ${linked.size}`);

if (problems.length) {
  console.log(`\n  PROBLEMS (${problems.length}):`);
  for (const p of problems.slice(0, 20)) console.log("    " + p);
  console.log("\n  Re-export and commit:  npm run pages:build\n");
  process.exit(1);
}

console.log("\n  PASS — dist/ matches the import\n");
