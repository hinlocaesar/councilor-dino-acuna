/**
 * Visual + technical audit of the site.
 *
 *   node tools/audit.mjs [baseUrl]
 *
 * Captures full-page and per-section screenshots at desktop / tablet / mobile
 * widths, then checks a set of correctness rules (escaped markup, broken
 * images, overflow, tap-target size, contrast, console errors, headings,
 * link safety) and prints a pass/fail table.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] || "http://localhost:5001/";
const OUT = "tools/shots";
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "mobile", width: 390, height: 844 },
];

const SECTIONS = [
  "home", "about", "record", "programs", "heritage", "videos", "journal", "connect",
];

const results = [];
const check = (name, pass, detail = "") =>
  results.push({ name, pass, detail: String(detail).slice(0, 220) });

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("requestfailed", (r) =>
    failedRequests.push(`${r.url()} — ${r.failure()?.errorText}`)
  );
  page.on("response", (r) => {
    if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`);
  });

  // live-server injects a live-reload client that reloads the page on change,
  // which destroys the execution context mid-audit. Block it.
  await ctx.route("**/livereload.js*", (route) => route.abort());

  // live-server's live-reload client holds a connection open, so networkidle
  // never fires there. "load" works for both builds.
  await page.goto(BASE, { waitUntil: "load", timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);

  // Warm up lazy-loaded images: a fullPage screenshot of a ~12,000px page with
  // unloaded lazy images will time out waiting for them.
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
    await Promise.all(
      [...document.images]
        .filter((i) => !i.complete)
        .map(
          (i) =>
            new Promise((res) => {
              i.addEventListener("load", res, { once: true });
              i.addEventListener("error", res, { once: true });
              setTimeout(res, 8000);
            })
        )
    );
  });
  await page.waitForTimeout(700);

  /* ---------------------------------------------------- screenshots */
  // animations:"disabled" freezes the infinite marquee/orb loops, which
  // otherwise keep the page permanently "unstable" and time out the capture.
  const shot = (opts) =>
    page.screenshot({ animations: "disabled", timeout: 120000, ...opts });

  await shot({ path: join(OUT, `${vp.name}-full.png`), fullPage: true });
  await shot({ path: join(OUT, `${vp.name}-fold.png`) });

  for (const id of SECTIONS) {
    const el = await page.$(`#${id}`);
    if (el) {
      try {
        await el.scrollIntoViewIfNeeded();
        await page.waitForTimeout(450);
        await el.screenshot({ animations: "disabled", timeout: 60000, path: join(OUT, `${vp.name}-${id}.png`) });
      } catch { /* section not rendered */ }
    }
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  /* ------------------------------------------------------ checks */
  const pre = `${vp.name}:`;

  // 1. escaped SVG markup leaking as visible text (the bug that was reported)
  const leaked = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("a, button, span, h3, p")) {
      if (el.children.length === 0 && /<svg|viewBox=|stroke-width=/.test(el.textContent || "")) {
        out.push((el.textContent || "").trim().slice(0, 90));
      }
    }
    return out;
  });
  check(`${pre} no escaped markup in text`, leaked.length === 0, leaked.join(" | "));

  // 1b. mojibake — text that has been through a lossy encoding round-trip
  //     (Ã±, Â·, â€”). Caused by editing UTF-8 files with a Windows-1252 editor.
  const mojibake = await page.evaluate(() => {
    const bad = /[ÃÂ]|â€|Ã¢/;
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      if (el.children.length) continue;
      const t = el.textContent || "";
      if (t.trim() && bad.test(t)) out.push(t.trim().replace(/\s+/g, " ").slice(0, 70));
    }
    return [...new Set(out)];
  });
  check(`${pre} no mojibake in text`, mojibake.length === 0, mojibake.slice(0, 5).join(" | "));

  // 1c. specific strings that must survive encoding intact
  const strings = await page.evaluate(() => {
    const body = document.body.innerText;
    return {
      tilde: /Acuña/.test(body),
      emDash: /[A-Za-z]—[A-Za-z]/.test(body) || body.includes("—"),
      middot: /·/.test(body),
      quotes: /[“”]/.test(body),
    };
  });
  check(
    `${pre} accents & punctuation intact`,
    strings.tilde && strings.emDash && strings.middot,
    JSON.stringify(strings)
  );

  // 2. broken images
  const brokenImgs = await page.evaluate(() =>
    [...document.images]
      .filter((i) => !i.complete || i.naturalWidth === 0)
      .map((i) => i.currentSrc || i.src)
  );
  check(`${pre} images all loaded`, brokenImgs.length === 0, brokenImgs.join(" | "));

  // 3. horizontal overflow
  //    The slide-in nav drawer and the decorative orbs/ticker are deliberately
  //    positioned outside the viewport on mobile (transform / overflow:hidden
  //    on an ancestor), so they are not layout bugs.
  const overflow = await page.evaluate(() => {
    const de = document.documentElement;
    const over = de.scrollWidth - de.clientWidth;
    const offCanvas = (el) =>
      el.closest(".nav, .hero-bg, .ticker") !== null ||
      el.classList.contains("nav") ||
      el.closest(".modal") !== null;
    const culprits = [];
    if (over > 1) {
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.right <= de.clientWidth + 1 && r.left >= -1) continue;
        if (getComputedStyle(el).position === "fixed") continue;
        if (offCanvas(el)) continue;
        culprits.push(
          `${el.tagName}.${(el.className || "").toString().split(" ")[0]} right=${Math.round(r.right)} w=${Math.round(r.width)}`
        );
      }
    }
    return { over, culprits: culprits.slice(0, 6) };
  });
  check(
    `${pre} no horizontal overflow`,
    overflow.over <= 1,
    `overflow=${overflow.over}px ${overflow.culprits.join(" | ")}`
  );

  // 4. tap targets (mobile only)
  if (vp.name === "mobile") {
    const small = await page.evaluate(() => {
      const bad = [];
      for (const el of document.querySelectorAll("a, button")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.height < 24 || r.width < 24) {
          bad.push(`${(el.textContent || el.className || "").toString().trim().slice(0, 28)} ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
      }
      return [...new Set(bad)].slice(0, 8);
    });
    check(`${pre} tap targets >= 24px`, small.length === 0, small.join(" | "));
  }

  // 5. heading order
  const headings = await page.evaluate(() =>
    [...document.querySelectorAll("h1,h2,h3,h4")].map((h) => ({
      lvl: Number(h.tagName[1]),
      text: (h.textContent || "").trim().slice(0, 40),
    }))
  );
  const h1s = headings.filter((h) => h.lvl === 1).length;
  let skip = null;
  let prev = 0;
  for (const h of headings) {
    if (prev && h.lvl > prev + 1) skip = `${h.lvl} after ${prev} ("${h.text}")`;
    prev = h.lvl;
  }
  check(`${pre} exactly one h1`, h1s === 1, `found ${h1s}`);
  check(`${pre} no skipped heading levels`, !skip, skip || "");

  // 6. link safety + external target
  //    Skip elements that are not rendered (hidden via [hidden] / display:none) —
  //    a placeholder href on an invisible element is not a dead link for a user.
  const badLinks = await page.evaluate(() => {
    const bad = [];
    const visible = (el) => {
      if (el.hasAttribute("hidden") || el.closest("[hidden]")) return false;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    for (const a of document.querySelectorAll("a[href]")) {
      if (!visible(a)) continue;
      const h = a.getAttribute("href") || "";
      if (h.startsWith("http") && a.target === "_blank") {
        if (!/noopener|noreferrer/.test(a.rel || "")) bad.push("missing noopener: " + h.slice(0, 50));
      }
      if (h === "" || h === "#") bad.push("empty href: " + (a.textContent || "").trim().slice(0, 30));
    }
    return [...new Set(bad)].slice(0, 8);
  });
  check(`${pre} external links safe`, badLinks.length === 0, badLinks.join(" | "));

  // 7. alt text
  const noAlt = await page.evaluate(() =>
    [...document.images]
      .filter((i) => !i.hasAttribute("alt"))
      .map((i) => i.src.slice(-50))
  );
  check(`${pre} all images have alt`, noAlt.length === 0, noAlt.join(" | "));

  // 8. button accessible names
  const namelessButtons = await page.evaluate(() =>
    [...document.querySelectorAll("button")]
      .filter((b) => !((b.textContent || "").trim() || b.getAttribute("aria-label") || b.getAttribute("title")))
      .map((b) => b.className || b.outerHTML.slice(0, 50))
  );
  check(`${pre} buttons have names`, namelessButtons.length === 0, namelessButtons.join(" | "));

  // 9. body text contrast (rough luminance check on the main body copy)
  const contrast = await page.evaluate(() => {
    const lum = (rgb) => {
      const [r, g, b] = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const bgOf = (el) => {
      let n = el;
      while (n && n !== document.documentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c;
        n = n.parentElement;
      }
      return "rgb(4,16,13)";
    };
    const out = [];
    for (const sel of [".hero-lede", ".card p", ".post p", ".section-lede", ".heritage-body p", ".tl-body p", ".vcard-body p", ".connect-lede"]) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const cs = getComputedStyle(el);
      const L1 = lum(cs.color), L2 = lum(bgOf(el));
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const large = parseFloat(cs.fontSize) >= 24;
      const need = large ? 3 : 4.5;
      if (ratio < need) out.push(`${sel} ${ratio.toFixed(2)}:1 (needs ${need})`);
    }
    return out;
  });
  check(`${pre} body text contrast >= 4.5:1`, contrast.length === 0, contrast.join(" | "));

  // 10. video cards rendered with real thumbs
  const cards = await page.evaluate(() => ({
    total: document.querySelectorAll(".vcard").length,
    withThumb: document.querySelectorAll(".vcard .vcard-img").length,
    withHit: document.querySelectorAll(".vcard .vcard-hit[data-url]").length,
    posts: document.querySelectorAll(".post").length,
    timeline: document.querySelectorAll(".tl-item").length,
  }));
  check(`${pre} 10 video cards`, cards.total === 10, `got ${cards.total}`);
  check(`${pre} 8 thumbnails present`, cards.withThumb === 8, `got ${cards.withThumb}`);
  check(`${pre} all cards have a play target`, cards.withHit === cards.total, `${cards.withHit}/${cards.total}`);
  // 40 blog posts imported from WordPress + 9 timeline milestones
  check(`${pre} 40 posts + 9 timeline`, cards.posts === 40 && cards.timeline === 9, `posts=${cards.posts} timeline=${cards.timeline}`);

  // 11b. every journal card must link somewhere real
  const deadPostLinks = await page.evaluate(() =>
    [...document.querySelectorAll(".post a[href]")]
      .map((a) => a.getAttribute("href"))
      .filter((h) => !h || h === "#")
  );
  check(`${pre} no dead journal links`, deadPostLinks.length === 0, `${deadPostLinks.length} dead`);

  // 11c. the first journal card must reach a rendered article page.
  //     Only the Umbraco build has /post/{slug}; the static build links
  //     straight to the WordPress URL, which is expected.
  const postRoute = await page.evaluate(() => {
    const a = document.querySelector('.post a[href^="/post/"]');
    return a ? a.getAttribute("href") : null;
  });
  if (postRoute) {
    const resp = await page.request.get(new URL(postRoute, BASE).toString());
    const body = await resp.text();
    // the prose container also carries the `reveal` class, so match the class
    // list rather than the exact attribute value
    const hasProse = /class="[^"]*\bprose\b[^"]*"/.test(body);
    const hasShell = body.includes("post-full");
    // article images are self-hosted under /img/posts/ — nothing should still
    // point at the WordPress CDN
    const hasImages = /<img[^>]+src="\/img\/[^"]+"/i.test(body);
    const leaksWp = /src="https?:\/\/dinoacuna\.wordpress\.com/i.test(body);
    check(
      `${pre} post page renders`,
      resp.ok() && hasProse && hasShell && hasImages,
      `status=${resp.status()} prose=${hasProse} shell=${hasShell} imgs=${hasImages}`
    );
    check(`${pre} post images are self-hosted`, !leaksWp, "found a wordpress.com src");
  } else {
    // static build: journal cards point at the original blog
    const links = await page.evaluate(
      () => [...document.querySelectorAll(".post a[href^='http']")].length
    );
    check(`${pre} journal links out to the blog`, links > 0, `${links} external links`);
  }

  // 11. no console errors / failed requests
  check(`${pre} no console errors`, consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
  check(`${pre} no failed requests`, failedRequests.length === 0, failedRequests.slice(0, 3).join(" | "));

  // 11a. nothing on the page may load from the WordPress CDN
  const wpLeak = await page.evaluate(() =>
    [...document.querySelectorAll("img[src], source[src], img[srcset]")]
      .map((el) => el.getAttribute("src") || el.getAttribute("srcset") || "")
      .filter((u) => /dinoacuna\.wordpress\.com/i.test(u))
  );
  check(`${pre} no wordpress.com images`, wpLeak.length === 0, wpLeak.slice(0, 3).join(" | "));

  // 11b. fonts must be self-hosted too
  const fontLeak = await page.evaluate(() =>
    [...document.querySelectorAll("link[href]")]
      .map((l) => l.getAttribute("href") || "")
      .filter((h) => /fonts\.(googleapis|gstatic)\.com/i.test(h))
  );
  check(`${pre} fonts self-hosted`, fontLeak.length === 0, fontLeak.join(" | "));

  // 12. interactive behaviour: filter chips + modal open
  const filterWorks = await page.evaluate(async () => {
    const chip = document.querySelector('[data-filter="council"]');
    if (!chip) return "no chip";
    chip.click();
    await new Promise((r) => setTimeout(r, 250));
    const visible = [...document.querySelectorAll(".vcard")].filter(
      (c) => !c.classList.contains("is-hidden")
    );
    const allCouncil = visible.every((c) => c.getAttribute("data-category") === "council");
    document.querySelector('[data-filter="all"]').click();
    await new Promise((r) => setTimeout(r, 250));
    const back = [...document.querySelectorAll(".vcard")].filter(
      (c) => !c.classList.contains("is-hidden")
    ).length;
    return allCouncil && back === 10 ? true : `council-only=${allCouncil} restored=${back}`;
  });
  check(`${pre} category filter works`, filterWorks === true, filterWorks);

  const modalWorks = await page.evaluate(async () => {
    document.querySelector(".vcard-hit")?.click();
    await new Promise((r) => setTimeout(r, 300));
    const m = document.querySelector("[data-modal]");
    const open = m && !m.hasAttribute("hidden");
    const hasIframe = !!m?.querySelector("iframe, .modal-loading");
    document.querySelector("[data-modal-close]")?.click();
    await new Promise((r) => setTimeout(r, 200));
    const closed = m?.hasAttribute("hidden");
    return open && hasIframe && closed ? true : `open=${open} iframe=${hasIframe} closed=${closed}`;
  });
  check(`${pre} video modal opens/closes`, modalWorks === true, modalWorks);

  // 13. sticky header + nav (hrefs may be "#x" or "/#x" depending on the build)
  //     Smooth scrolling takes ~1s to settle, so poll rather than sampling once.
  const navWorks = await page.evaluate(async () => {
    const link = document.querySelector('#nav a[href$="#about"]');
    if (!link) return "no nav link";
    link.click();

    const settle = async (ms) => new Promise((r) => setTimeout(r, ms));
    let y = 0;
    for (let i = 0; i < 20; i++) {
      await settle(100);
      y = window.scrollY;
      const top = document.getElementById("about")?.getBoundingClientRect().top ?? 999;
      if (y > 50 && top < 200) break;      // reached the target
    }

    const header = document.querySelector("[data-header]");
    const stuck = header?.classList.contains("is-stuck");
    const aboutTop = Math.round(document.getElementById("about")?.getBoundingClientRect().top ?? -1);
    return y > 50 && stuck && aboutTop < 200
      ? true
      : `y=${y} stuck=${stuck} aboutTop=${aboutTop}`;
  });
  check(`${pre} nav anchor scrolls + header sticks`, navWorks === true, navWorks);

  await ctx.close();
}

await browser.close();

/* ------------------------------------------------------------- report */
const pass = results.filter((r) => r.pass).length;
const fail = results.length - pass;

const lines = [
  `Audit: ${BASE}`,
  `${pass}/${results.length} checks passed${fail ? `  (${fail} FAILED)` : ""}`,
  "",
  ...results.map(
    (r) => `${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail && !r.pass ? `\n        ${r.detail}` : r.detail && r.pass ? `\n        ${r.detail}` : ""}`
  ),
];
const report = lines.join("\n");
console.log(report);
writeFileSync(join(OUT, "report.txt"), report);

process.exit(fail ? 1 : 0);
