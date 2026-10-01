// Minimal static file server for auditing the non-Umbraco build.
// Deliberately has no live-reload, so it cannot reload the page mid-test.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = process.argv[2] || ".";
const PORT = Number(process.argv[3] || 4322);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
};

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p === "/" || p.endsWith("/")) p += "index.html";
    // block traversal outside ROOT
    const full = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ""));
    if (!full.startsWith(ROOT)) {
      res.writeHead(403).end("forbidden");
      return;
    }
    const s = await stat(full);
    if (!s.isFile()) throw new Error("not a file");
    const body = await readFile(full);
    res.writeHead(200, {
      "content-type": TYPES[extname(full).toLowerCase()] || "application/octet-stream",
      "content-length": body.length,
      "cache-control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("not found");
  }
}).listen(PORT, () => console.log(`serving ${ROOT} on http://localhost:${PORT}/`));
