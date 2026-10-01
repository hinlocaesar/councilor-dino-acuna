/**
 * Confirms every url() in the exported stylesheets points at a file that exists.
 *
 *   node tools/check-fonts.mjs
 *
 * The references are relative ("../fonts/x.woff2" from dist/css/), so they must
 * be resolved against the stylesheet's own directory -- joining them onto the
 * stylesheet's folder as well is the easy mistake, and produces 41 phantom
 * missing files that look alarming and are not real.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";

const CSS_DIR = "dist/css";
let checked = 0;
let missing = 0;

for (const name of readdirSync(CSS_DIR)) {
  if (!name.endsWith(".css")) continue;
  const file = join(CSS_DIR, name);
  const css = readFileSync(file, "utf8");

  for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
    const ref = m[1];
    if (/^(https?:)?\/\//.test(ref) || ref.startsWith("data:")) {
      console.log(`  ${name}: EXTERNAL ${ref}`);
      missing++;
      continue;
    }
    checked++;
    // Resolve relative to the stylesheet, which is what the browser does.
    const target = resolve(dirname(file), ref);
    if (!existsSync(target)) {
      missing++;
      console.log(`  ${name}: MISSING ${ref}  ->  ${target}`);
    }
  }
}

console.log(`\n  checked ${checked} url() references in ${CSS_DIR}`);
console.log(`  broken  ${missing}`);
console.log(missing === 0 ? "  PASS\n" : "  FAIL\n");
process.exit(missing === 0 ? 0 : 1);
