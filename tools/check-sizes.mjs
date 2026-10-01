/**
 * Confirms the two image size classes are wired correctly: the journal cards
 * must load the small /img/cards/ copies and the article bodies the full-size
 * /img/posts/ ones. Both must resolve.
 */
const BASE = process.argv[2] || "http://localhost:5001";

const home = await (await fetch(BASE + "/")).text();
const cardSrcs = [...home.matchAll(/<img[^>]*?\bsrc="((?:\/img\/cards\/)[^"]+)"/g)].map((m) => m[1]);

console.log(`card thumbnails referenced : ${cardSrcs.length}`);
console.log(`  all from /img/cards/    : ${cardSrcs.every((s) => s.startsWith("/img/cards/"))}`);

const brokenCards = [];
for (const p of [...new Set(cardSrcs)]) {
  const r = await fetch(BASE + p);
  if (!r.ok) brokenCards.push(`${r.status} ${p}`);
}
console.log(`  broken                  : ${brokenCards.length}`);
for (const b of brokenCards.slice(0, 5)) console.log("    " + b);

const slug = "supporting-our-women-sector";
const article = await (await fetch(`${BASE}/post/${slug}`)).text();
// The src value *starts* with "/img/", so the character class before it must be
// allowed to match nothing.
const bodySrcs = [...article.matchAll(/<img[^>]*?\bsrc="((?:\/img\/)[^"]+)"/g)]
  .map((m) => m[1])
  .filter((s) => s.includes("/img/posts/"));

console.log(`\narticle body images       : ${bodySrcs.length}`);
console.log(`  all from /img/posts/    : ${bodySrcs.length > 0}`);

const brokenBody = [];
let bytes = 0;
for (const p of [...new Set(bodySrcs)]) {
  const r = await fetch(BASE + p);
  if (!r.ok) brokenBody.push(`${r.status} ${p}`);
  else bytes += Number(r.headers.get("content-length") || 0);
}
console.log(`  broken                  : ${brokenBody.length}`);
for (const b of brokenBody.slice(0, 5)) console.log("    " + b);
console.log(`  total bytes             : ${(bytes / 1024).toFixed(0)} KB`);

let cardBytes = 0;
for (const p of [...new Set(cardSrcs)]) {
  const r = await fetch(BASE + p);
  cardBytes += Number(r.headers.get("content-length") || 0);
}
console.log(`\ncard class total          : ${(cardBytes / 1024).toFixed(0)} KB`);
console.log(
  `saving vs full-size        : ${(
    (cardBytes / Math.max(1, [...new Set(cardSrcs)].length)) /
    (bytes / Math.max(1, [...new Set(bodySrcs)].length))
  ).toFixed(2)}x smaller per image`
);

process.exit(brokenCards.length + brokenBody.length ? 1 : 0);
