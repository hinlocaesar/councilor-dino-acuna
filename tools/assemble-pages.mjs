/**
 * Copies the assets into the exported site and fixes their URLs.
 *
 *   node tools/assemble-pages.mjs
 *
 * Run after tools/export-static.mjs when previewing locally, and run on its own
 * in CI — which has no Umbraco to export from, because the rendered markup is
 * committed to dist/.
 *
 * The split exists so the repository does not hold two copies of 12 MB of
 * images: dist/ carries the markup, cms/wwwroot/ carries the binaries, and this
 * script joins them at deploy time.
 *
 * Why the CSS needs rewriting
 * ---------------------------
 * cms/wwwroot/css/fonts.css declares url('/fonts/inter-400.woff2'). The browser
 * resolves that against the domain root, but GitHub Pages serves a project
 * repository from https://<user>.github.io/<repo>/ — so every font 404s. The
 * markup is rewritten to document-relative paths by export-static.mjs; the
 * stylesheet needs the same treatment, and its prefix is its own depth
 * (dist/css/ is one directory down, so "../").
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, cpSync, readdirSync, statSync, rmSync } from "node:fs";
import { join } from "node:path";

const OUT = "dist";
const WWWROOT = "cms/wwwroot";
const ASSETS = ["css", "js", "img", "fonts"];

if (!existsSync(join(OUT, "index.html"))) {
  console.error(`\n  ${OUT}/index.html not found.`);
  console.error("  Run:  dotnet run --project cms   then   node tools/export-static.mjs\n");
  process.exit(1);
}

for (const dir of ASSETS) {
  const from = join(WWWROOT, dir);
  const to = join(OUT, dir);
  if (existsSync(to)) rmSync(to, { recursive: true, force: true });
  if (!existsSync(from)) continue;
  mkdirSync(OUT, { recursive: true });
  cpSync(from, to, { recursive: true });
}

/** Rewrite root-absolute url() and @import refs to be document-relative. */
function rewriteCss(file, prefix) {
  if (!existsSync(file)) return 0;
  const before = readFileSync(file, "utf8");
  const after = before
    .replace(/url\(\s*(['"]?)\/(?!\/)([^'")]+)\1\s*\)/g, (m, q, p) => `url(${q}${prefix}${p}${q})`)
    .replace(/@import\s+(['"])\/(?!\/)([^'"]+)\1/g, (m, q, p) => `@import ${q}${prefix}${p}${q}`);
  if (after === before) return 0;
  writeFileSync(file, after, "utf8");
  return (before.match(/url\(\s*['"]?\/(?!\/)/g) || []).length;
}

let fixedUrls = 0;
for (const name of readdirSync(join(OUT, "css"))) {
  if (name.endsWith(".css")) fixedUrls += rewriteCss(join(OUT, "css", name), "../");
}

function measure(dir) {
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
  walk(dir);
  return { n, bytes };
}

const mb = (b) => (b / 1024 / 1024).toFixed(2) + " MB";
console.log(`\nAssembled ${OUT}/\n`);
for (const dir of ASSETS) {
  const { n, bytes } = measure(join(OUT, dir));
  console.log(`  ${dir.padEnd(8)} ${String(n).padStart(4)} files  ${mb(bytes).padStart(9)}`);
}
if (fixedUrls) console.log(`\n  rewrote ${fixedUrls} root-absolute url() refs in the stylesheets`);

const total = measure(OUT);
console.log(`\n  ready to publish: ${total.n} files, ${mb(total.bytes)}`);
console.log("  check:  node tools/verify-export.mjs\n");
