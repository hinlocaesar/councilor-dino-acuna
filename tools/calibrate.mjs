/**
 * Calibration helper: prints the size of a few sample photographs at different
 * width/quality combinations, so the settings in optimize-images.mjs are chosen
 * from measurements instead of guesses.
 *
 *   node tools/calibrate.mjs
 */
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

sharp.cache(false);

const SAMPLES = [
  "cms/wwwroot/img/posts/20250326_115349.jpg", // a real photograph
  "cms/wwwroot/img/posts/3028870611_ff8186111d.jpg",
  "cms/wwwroot/img/posts/20250322_082931.jpg",
  "cms/wwwroot/img/editorial/imag0012.jpg",
  "cms/wwwroot/img/thumbs/4042188909417828.jpg",
];

const combos = [
  [1024, 78], [1024, 68], [960, 70], [900, 68], [900, 62], [820, 64], [760, 62],
];

console.log("  file                          orig    " + combos.map(([w, q]) => `${w}/${q}`.padStart(9)).join(""));
console.log("  " + "-".repeat(60));

const totals = new Map(combos.map((c) => [c.join("/"), 0]));

for (const f of SAMPLES) {
  let raw;
  try {
    raw = readFileSync(f);
  } catch {
    continue;
  }
  const orig = statSync(f).size;
  const row = [];
  for (const [w, q] of combos) {
    const out = await sharp(raw, { failOn: "none" })
      .rotate()
      .resize({ width: w, withoutEnlargement: true })
      .jpeg({ quality: q, progressive: true, mozjpeg: true, chromaSubsampling: "4:2:0" })
      .toBuffer();
    totals.set(`${w}/${q}`, totals.get(`${w}/${q}`) + out.length);
    row.push((out.length / 1024).toFixed(0) + "K");
  }
  console.log(
    `  ${f.split("\\").pop().slice(0, 28).padEnd(28)} ${(orig / 1024).toFixed(0).padStart(4)}K    ` +
      row.map((r) => r.padStart(9)).join(" ")
  );
}

console.log("\n  extrapolated across the 5 samples (261 post images would scale this by ~52x)");
console.log("  combo      total");
for (const [k, v] of totals) console.log(`  ${k.padEnd(9)} ${(v / 1024).toFixed(0).padStart(6)} KB`);
