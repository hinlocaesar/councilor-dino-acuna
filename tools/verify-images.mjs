/**
 * Verifies every downloaded image is a complete, decodable file.
 *
 *   node tools/verify-images.mjs [--fix]
 *
 * Why this exists: the downloader only checked "more than 512 bytes", which a
 * connection truncated mid-stream still passes. A JPEG ending in "JF" instead
 * of the FF D9 end-of-image marker renders as nothing at all, silently.
 *
 * Checks each file's magic bytes and its trailer, which together catch every
 * truncation without needing an image library. --fix deletes the bad files so
 * `node tools/fetch-images.mjs` re-downloads them on the next run.
 */
import { readFileSync, existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join, extname } from "node:path";

const FIX = process.argv.includes("--fix");

/** Trailer bytes that must be present at the very end of a valid file. */
const TRAILERS = {
  jpg: [[0xff, 0xd9]],
  jpeg: [[0xff, 0xd9]],
  webp: [
    [0x56, 0x45, 0x42, 0x50], // "WEBP" (VP8 / VP8L / VP8X container)
  ],
  png: [
    // IEND chunk: length 0, type IEND, CRC AE 42 60 82
    [0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82],
  ],
  gif: [[0x3b]], // GIF trailer ';'
};

/** Leading bytes every valid file of that type starts with (array of options). */
const MAGIC = {
  jpg: [[0xff, 0xd8, 0xff]], // SOI
  jpeg: [[0xff, 0xd8, 0xff]],
  webp: [[0x52, 0x49, 0x46, 0x46]], // "RIFF" — WebP is always in a RIFF container
  png: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  gif: [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  ],
};

const endsWith = (buf, bytes) => {
  const n = bytes.length;
  if (buf.length < n) return false;
  for (let i = 0; i < n; i++) if (buf[buf.length - n + i] !== bytes[i]) return false;
  return true;
};

const startsWithAny = (buf, options) => {
  for (const sig of options) {
    let ok = buf.length >= sig.length;
    for (let i = 0; ok && i < sig.length; i++) if (buf[i] !== sig[i]) ok = false;
    if (ok) return true;
  }
  return false;
};

/**
 * Reads pixel dimensions straight from the file header.
 *
 * Used instead of a minimum file size: a 985-byte 72x54 logo is perfectly
 * valid, so any byte floor produces false positives, while a real truncation
 * shows up as either a missing end marker or a nonsense dimension.
 */
function dimensions(buf, ext) {
  try {
    if (ext === "png") {
      // IHDR is always the first chunk: bytes 16..23 are width/height BE uint32
      return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
    }
    if (ext === "gif") {
      // logical screen descriptor: LE uint16 at offsets 6 and 8
      return [buf.readUInt16LE(6), buf.readUInt16LE(8)];
    }
    if (ext === "webp") {
      // RIFF....WEBP<fourcc> ; VP8X/VP8/VP8L store their own dimensions
      const fourcc = buf.toString("ascii", 8, 12);
      if (fourcc === "VP8X") {
        return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
      }
      if (fourcc === "VP8 ") {
        return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
      }
      if (fourcc === "VP8L") {
        const bits = buf.readUInt32LE(21);
        return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
      }
      return null;
    }
    // JPEG: walk the marker segments to the first SOFn frame header
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const len = buf.readUInt16BE(i + 2);
      const isSOF =
        marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSOF) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
      i += 2 + len;
    }
    return null;
  } catch {
    return null;
  }
}

const DIRS = ["cms/wwwroot/img", "assets/img"];

let checked = 0;
const bad = [];

for (const dir of DIRS) {
  if (!existsSync(dir)) continue;
  for (const sub of readdirSync(dir)) {
    const full = join(dir, sub);
    if (!statSync(full).isDirectory()) continue;
    for (const name of readdirSync(full)) {
      const path = join(full, name);
      if (!statSync(path).isFile()) continue;

      const ext = extname(name).slice(1).toLowerCase();
      if (!TRAILERS[ext]) continue;

      checked++;
      const buf = readFileSync(path);
      const reasons = [];

      if (!startsWithAny(buf, MAGIC[ext])) reasons.push("bad magic bytes");
      if (!TRAILERS[ext].some((t) => endsWith(buf, t))) {
        reasons.push(
          `truncated (ends ${[...buf.slice(-4)].map((b) => b.toString(16).padStart(2, "0")).join(" ")})`
        );
      }

      const dim = dimensions(buf, ext);
      if (dim === null) {
        reasons.push("no readable image header");
      } else if (dim[0] < 2 || dim[1] < 2) {
        reasons.push(`degenerate dimensions ${dim[0]}x${dim[1]}`);
      }

      if (reasons.length) bad.push({ path, size: buf.length, reasons });
    }
  }
}

console.log(`checked ${checked} files across ${DIRS.length} directories`);
if (bad.length === 0) {
  console.log("  all complete, well-formed and non-degenerate");
  process.exit(0);
}

console.log(`\nCORRUPT (${bad.length}):`);
for (const b of bad) {
  console.log(`  ${String(b.size).padStart(8)} B  ${b.path}`);
  console.log(`             ${b.reasons.join("; ")}`);
}

if (FIX) {
  for (const b of bad) unlinkSync(b.path);
  console.log(`\ndeleted ${bad.length} corrupt files.`);
  console.log("re-run: node tools/fetch-images.mjs && node tools/fetch-editorial-images.mjs");
} else {
  console.log("\nre-run with --fix to delete them, then re-download.");
}
