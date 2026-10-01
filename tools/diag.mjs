import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const bad = [];
p.on("response", (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
p.on("requestfailed", (r) => bad.push(`FAIL ${r.url()}`));

await p.goto("http://localhost:4321/", { waitUntil: "load" });
await p.waitForTimeout(2500);

console.log("failing requests on the home page:", bad.length);
for (const u of [...new Set(bad)].slice(0, 12)) console.log("  " + u.replace("http://localhost:4321", ""));
await b.close();