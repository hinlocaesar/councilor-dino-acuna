# Councilor Dino Acuña

A site for **Councilor Dino Acuña** of the City of Victorias, Negros Occidental,
Philippines. Content is drawn from the author's public blog and official Facebook
page.

| Source | URL |
| --- | --- |
| Blog | https://dinoacuna.wordpress.com/ |
| Facebook page | https://www.facebook.com/dino2022 |
| Facebook videos | https://www.facebook.com/dino2022/videos |
| X / Twitter | https://twitter.com/dinoacuna |

## Two versions

| | Static | Umbraco |
| --- | --- | --- |
| Stack | HTML / CSS / vanilla JS | ASP.NET Core 10 + Umbraco 17 LTS |
| Content lives in | `assets/js/data.js` | the Umbraco backoffice |
| Run it | `npm run dev` → **:4321** | `dotnet run` → **:5001** |
| Hosting | any static host — **deployed to GitHub Pages** | needs .NET |
| Write-up | this file | **[cms/README.md](cms/README.md)** |

The design is identical between them — the Umbraco build reuses the same CSS
byte-for-byte. Pick the static one for simplicity, or Umbraco if you want to edit
content through a CMS.

**What GitHub Pages actually serves:** the Umbraco CMS, rendered to static files.
`npm run pages:build` exports it to `dist/`, which is what the Pages workflow
publishes. So you edit in the backoffice locally and the published site follows.
See [Publishing an edit](#publishing-an-edit).

---

# Static version

## Run it locally

```bash
npm install     # installs live-server (dev dependency)
npm run dev     # serves the site with live reload
```

Then open:

```
http://localhost:4321/
```

Edit any file and the browser refreshes automatically.

> **Port:** the dev server is pinned to `4321` because `5173` and `8080` were
> already in use on this machine. Change it in `package.json` if needed.

No build step is required — it is plain HTML, CSS and ES5-compatible JavaScript.
You can also just open `index.html` straight off the disk.

---

## Structure

```
.
├─ index.html                 # the whole page
├─ assets/
│  ├─ css/
│  │  ├─ styles.css           # design system + all component styles
│  │  └─ fonts.css            # generated — self-hosted @font-face
│  ├─ fonts/                  # 41 woff2 subsets (Fraunces + Inter)
│  ├─ img/
│  │  ├─ thumbs/              # video thumbnails
│  │  ├─ editorial/           # portraits + heritage photographs
│  │  └─ posts/               # 261 photographs from the imported articles
│  └─ js/
│     ├─ data.js              # videos (hand-written) + posts (generated)
│     └─ main.js              # behaviour (nav, reveal, filter, modal)
├─ cms/                       # the Umbraco build — see cms/README.md
├─ tools/                     # the content pipeline + the test suite
├─ package.json
└─ .gitignore
```

## Adding a video

Video entries are hand-written and live in **`assets/js/data.js`**. The page
reads them on load, so a new card appears on reload — no build step.

Add a video:

```js
{
  id: "1234567890",
  title: "57th Regular Session",
  caption: "One or two lines of context.",
  category: "council",        // council | program | field
  duration: "0:40",           // or "—"
  views: "481",
  when: "2 weeks ago",
  thumb: "assets/img/thumbs/1234567890.jpg",   // optional
  still: true,                                // optional, see below
  url: "https://www.facebook.com/dino2022/videos/..."
}
```

`category` drives the filter chips at the top of the Videos section. Cards
appear immediately — no rebuild needed, just reload.

## Adding a blog post

Blog posts are **generated, not hand-written.** They are imported from
`dinoacuna.wordpress.com` and written into the `posts` array of `data.js` by
`tools/sync-static-blog.mjs`. Editing that array by hand works but will be
overwritten the next time the import runs.

To pull in new or changed posts from the source blog:

```bash
npm run import:blog
```

That runs the pipeline in order (see [Content pipeline](#content-pipeline)). You
do not need to run it to run the site — the imported content is committed.

**To add or change a post after the initial import, use the backoffice** rather
than re-running the importer: *Content →* pick the item, edit it, save, publish.
Then `npm run pages:build` to push it to the published site. The importer would
overwrite your edits with what WordPress says.

### Thumbnails

The thumbnails in `assets/img/thumbs/` were **downloaded from Facebook** and are
committed to the repo. Facebook's CDN links are signed and expire within days, so
hotlinking them would have left broken cards within a week — storing them locally
keeps the site stable.

Two of the ten videos have no usable Facebook thumbnail:

| Video | Why | What is shown |
| --- | --- | --- |
| 58th Regular Session | Facebook's auto-frame is a **solid black** still | His council-office photo, tagged `still: true` (shown with a small **PHOTO** badge) |
| 57th Regular Session | The thumbnail URL returns **403** | The branded gradient tile |
| Small business owners | Video page is **login-walled** | The branded gradient tile |

If you capture your own screenshots, drop them in `assets/img/thumbs/` and add
the `thumb` path to those three entries in `data.js`.

`still: true` is only needed when the image is a photograph rather than a real
frame from the clip — it renders a small "PHOTO" badge so nothing is passed off
as a video still.

---

## Design notes

- **Type** — Fraunces (display serif) + Inter (UI), **self-hosted** from
  `assets/fonts/` (see [Self-hosting](#self-hosting)).
- **Palette** — deep forest greens with gold accents, nodding to Victorias City
  and the sugarcane fields of Negros Occidental.
- **Motion** — scroll-reveals via `IntersectionObserver`, a gradient sheen on
  the name, drifting background orbs, a marquee ticker, and a scroll-progress bar.
- **Responsive** — full-width down to 320px, with a slide-in mobile menu.
- **Accessibility** — skip link, visible focus rings, `aria-*` state on the menu
  and filter chips, real `<button>` hit areas on video cards, and a full
  `prefers-reduced-motion` path that disables animation.

## Self-hosting

The site makes **no external requests at all**. Everything it loads — every
photograph, both typefaces, the stylesheet — is served from this repository. It
renders identically with the network unplugged, and it cannot be broken by a CDN
rate-limit, a hot-link block, or the source blog going offline.

| Was | Now | Size |
| --- | --- | --- |
| 261 photographs from `dinoacuna.wordpress.com` | `assets/img/posts/` | 21.5 MB |
| 7 editorial photographs, hot-linked from WordPress | `assets/img/editorial/` | 0.7 MB |
| 10 video thumbnails from Facebook's signed CDN | `assets/img/thumbs/` | — |
| Fraunces + Inter from `fonts.googleapis.com` | `assets/fonts/` | 1.4 MB |

`npm run audit:offline` loads the site in a real browser, scrolls it, visits a
sample of articles, and fails if a single request leaves the local host.

## Content pipeline

`tools/` holds the scripts that produced all of the above. Each is idempotent —
re-running skips work that is already done.

| Script | Does |
| --- | --- |
| `npm run export:blog` | Reads the WordPress.com REST API for all 40 posts, strips the comment form, share buttons and editor metadata → `cms/Seeding/wordpress-posts.json` |
| `npm run fetch:images` | Downloads every image the posts reference (deduplicating WordPress's `?w=150 / ?w=300 / ?w=1024` renditions down to 261 real files) and rewrites the bodies to point at the local copies |
| `npm run fetch:editorial` | Same for the 7 photographs hard-coded in the views and `index.html` |
| `npm run fetch:fonts` | Downloads the woff2 subsets from Google, writes `assets/css/fonts.css` and `cms/wwwroot/css/fonts.css` with the right URL prefix for each build |
| `npm run optimize:images` | Re-encodes every image with mozjpeg at the right size for where it is displayed, and builds the small card thumbnails |
| `npm run sync:static` | Regenerates the `posts` array of `assets/js/data.js` from the export, so both builds list all 40 posts |
| `npm run verify:images` | Checks every downloaded image has valid header and end markers and real dimensions — a connection truncated mid-stream still passes a byte-size check but renders as nothing |
| `npm run verify:subpath` | Mounts the build under `/councilor-dino-acuna/` and loads it in a browser, which is how Pages serves it |
| `npm run pages:build` | Renders the running CMS to `dist/`, copies the assets in, and verifies the result under a Pages subpath — this is what gets published |

Run the whole thing with `npm run import:blog`, or `npm run verify` to check the
committed result. Both are safe to re-run.

The Umbraco build keeps its own copy of the same content, seeded from
`cms/Seeding/wordpress-posts.json` — see **[cms/README.md](cms/README.md)**.

## Image sizes

The same photograph appears at two very different widths, so the pipeline
produces two size classes:

| | Source width | Where it is shown | Displayed at |
| --- | --- | --- | --- |
| `assets/img/posts/` | 900px | article bodies (`.post-full-inner` is 760px) | up to 760px |
| `assets/img/cards/` | 440px | journal cards (a 38% column) | ~207px |

Letting the browser shrink one 900px file for a 207px slot was the single
largest waste — a card thumbnail at full size is roughly **4× larger** than it
needs to be.

Everything is re-encoded through mozjpeg, which strips the EXIF block WordPress
attached and drops the quality far below what WordPress served.

| | Before | After |
| --- | --- | --- |
| Published (static build) | 25.24 MB | **11.58 MB** |
| First visit (home page) | ~4 MB | **1.05 MB** |

A first visit downloads the markup, CSS, JS, the 40 card thumbnails and only
the Latin font subsets — the 261 article images load only when an article is
opened. `npm run payload` prints both figures.

WebP was tested at the same perceived quality and saved only 16–22%, which did
not seem worth renaming every reference across the JSON, the Razor views and the
HTML. `tools/calibrate.mjs` reproduces those measurements.


## Testing

The build is checked by Playwright harnesses in `tools/`. All of them exit
non-zero on failure, so they drop straight into CI.

```bash
npm run audit          # Umbraco on :5001  (start `dotnet run` first)
npm run audit:static   # static build
npm run audit:offline  # asserts zero external requests
npm run verify:images  # every image is complete and non-degenerate
npm run pages:verify   # dist/ matches the import, and serves from a subpath
npm run pages:live     # loads the PUBLISHED site and visits all 40 articles
npm run verify         # images + subpath + static audit
```

`audit.mjs` runs 76 checks across desktop, tablet and mobile, including layout
overflow, tap-target size, keyboard navigation, `prefers-reduced-motion`, the
no-JavaScript render, and mojibake in the source. `verify-export.mjs` serves
`dist/` under the Pages prefix and loads all 40 articles. `verify-live.mjs` does
the same against the deployed URL, which is the only way to confirm the
published site works rather than the one on disk. Screenshots and `report.txt`
land in `tools/shots/` (not committed).

> Audit the static build on **:4322** (`npm run serve:plain`), not :4321.
> `live-server` injects a reload client that navigates mid-test and tears down
> the browser context.


## Deploying

The site is fully static — any host works. GitHub Pages is already wired up.

### GitHub Pages

The published site is the Umbraco CMS rendered to plain files. GitHub Pages
cannot run .NET, so the site is exported and the result committed:

```
dist/index.html              home
dist/post/<slug>/index.html  all 40 articles
dist/sitemap.xml             41 urls
dist/css js img fonts        ← git-ignored, copied from cms/wwwroot at deploy time
```

**Live at:** https://hinlocaesar.github.io/councilor-dino-acuna/

Pages is enabled with *Source: GitHub Actions*, so every push to `main` deploys
itself.

> The repository is **public**. GitHub Pages is not available for private
> repositories on the Free plan — GitHub returns *"Your current plan does not
> support GitHub Pages for this repository"* — so this had to change to put the
> site online. The repository holds only this site's content; no credentials.

#### Publishing an edit

```bash
dotnet run --project cms        # 1. edit in the backoffice at /umbraco
npm run pages:build             # 2. re-export, assemble and verify
git add dist && git commit -m "…"
git push                         # 3. Pages deploys
```

`npm run pages:build` runs three steps and fails loudly rather than publishing
something broken:

| Step | Does |
| --- | --- |
| `pages:export` | Fetches every page from the running CMS and writes `dist/` as static files, rewriting root-absolute URLs to be document-relative |
| `pages:assemble` | Copies `css js img fonts` in from `cms/wwwroot` and fixes the `url()` references inside the stylesheets |
| `pages:verify` | Confirms `dist/` matches the import, then serves it under the Pages subpath and loads all 40 articles in a browser |

#### Why the markup is committed rather than rendered in CI

It would be tidier to spin up .NET in the workflow and render at deploy time.
That is wrong here: the content lives in a **local SQLite database**, not in the
repository. A fresh CI render would seed itself from
`cms/Seeding/wordpress-posts.json` and publish content that predates every edit
made in the backoffice — your edits would silently never reach the site.

Committing the export keeps the CMS authoritative, which is the point of having
one. It also keeps the repository small: `dist/` holds 0.7 MB of markup, and the
11.5 MB of images stay in `cms/wwwroot/` as a single copy rather than two.

#### Subpath

This is a *project* repository, so Pages serves it from
`https://hinlocaesar.github.io/councilor-dino-acuna/`. Any root-absolute asset
path (`/css/styles.css`) works on localhost and 404s there, and grepping cannot
reliably catch it — so the exporter rewrites every URL to be document-relative
and `verify-export.mjs` serves the build under the real prefix and loads it in a
browser before publishing.

To deploy by hand, use the **Actions** tab → *Deploy to GitHub Pages* → *Run
workflow*.

### Elsewhere

- **Netlify / Vercel:** connect the repo, build command `npm run pages:build`,
  publish directory `dist`. Needs .NET available, since the export renders the
  CMS. Or upload an already-built `dist/` by hand — no build command at all.
- **Your own server:** upload the contents of `dist/` to any web root.



## Disclaimer

An unofficial tribute site. All writing and photographs remain the work of their
original author, Dino Acuña. Not affiliated with or endorsed by the City
Government of Victorias.
