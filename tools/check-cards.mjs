import { readFileSync } from "node:fs";

const s = readFileSync("assets/js/data.js", "utf8");
const m = [...s.matchAll(/featuredImage: "([^"]*)"/g)].map((x) => x[1]);

console.log("  data.js featuredImage refs :", m.length);
console.log("  pointing at img/cards/    :", m.filter((x) => x.includes("img/cards/")).length);
console.log("  pointing at img/posts/    :", m.filter((x) => x.includes("img/posts/")).length);
console.log("  sample                    :", m[0]);

const posts = JSON.parse(readFileSync("cms/Seeding/wordpress-posts.json", "utf8"));
console.log("  json sample               :", posts[0].featuredImage);
console.log("  distinct featured images  :", new Set(posts.map((p) => p.featuredImage)).size, "across", posts.length, "posts");

// every referenced card file must exist on disk
import { existsSync } from "node:fs";
const missing = m.filter((p) => !existsSync(p));
console.log("  card files missing on disk:", missing.length);
if (missing.length) console.log("   ", missing.slice(0, 5));
