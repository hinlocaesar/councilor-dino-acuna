import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const PREFIX = "/councilor-dino-acuna";
const ROOT = join(process.cwd(), "dist");
const PORT = 4401;
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".woff2": "font/woff2" };

const server = createServer((req, res) => {
  let rel = decodeURIComponent(new URL(req.url, "http://x").pathname).slice(PREFIX.length) || "/";
  if (rel.endsWith("/")) rel += "index.html";
  const file = join(ROOT, rel);
  if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile())
    return res.writeHead(404).end("nf");
  res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(PORT, r));

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const base = `http://localhost:${PORT}${PREFIX}`;

await p.goto(base + "/post/supporting-our-women-sector/", { waitUntil: "load" });
await p.evaluate(() => document.fonts.ready);
await p.evaluate(() => document.querySelectorAll(".reveal").forEach((e) => e.classList.add("is-in")));
await p.waitForTimeout(800);
await p.screenshot({ path: "tools/shots/export-post.png", animations: "disabled" });

await p.goto(base + "/", { waitUntil: "load" });
await p.evaluate(async () => {
  for (let i = 0, y = 0; i < 60; i++, y += window.innerHeight) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); }
});
await p.evaluate(() => document.querySelectorAll(".reveal").forEach((e) => e.classList.add("is-in")));
await p.waitForTimeout(900);
await p.evaluate(() => document.querySelector("#journal").scrollIntoViewIfNeeded());
await p.waitForTimeout(700);
await p.screenshot({ path: "tools/shots/export-journal.png", animations: "disabled" });

console.log("captured export-post.png, export-journal.png");
await b.close();
server.close();
