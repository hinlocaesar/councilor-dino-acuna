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
| Hosting | any static host | needs .NET |
| Write-up | this file | **[cms/README.md](cms/README.md)** |

The design is identical between them — the Umbraco build reuses the same CSS
byte-for-byte. Pick the static one for simplicity, or Umbraco if you want to edit
content through a CMS.

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

That runs four steps in order (see [Content pipeline](#content-pipeline)). You do
not need to run it to run the site — the imported content is committed.

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
| `npm run sync:static` | Regenerates the `posts` array of `assets/js/data.js` from the export, so both builds list all 40 posts |
| `npm run verify:images` | Checks every downloaded image has valid header and end markers and real dimensions — a connection truncated mid-stream still passes a byte-size check but renders as nothing |

The Umbraco build keeps its own copy of the same content, seeded from
`cms/Seeding/wordpress-posts.json` — see **[cms/README.md](cms/README.md)**.

## Testing

Both builds are checked by a Playwright harness in `tools/audit.mjs` — 76 checks
across desktop, tablet and mobile, including layout overflow, tap-target size,
keyboard navigation, `prefers-reduced-motion`, the no-JavaScript render, and
mojibake in the source.

```bash
npm run audit          # Umbraco on :5001  (start `dotnet run` first)
npm run audit:static   # static build
npm run audit:offline  # asserts zero external requests
```

It writes screenshots and `report.txt` to `tools/shots/` (not committed) and
exits non-zero on failure, so it drops straight into CI.

> Audit the static build on **:4322** (`npm run serve:plain`), not :4321.
> `live-server` injects a reload client that navigates mid-test and tears down
> the browser context.

## Deploying

The site is fully static — any host works.

- **GitHub Pages:** push to a repo, then *Settings → Pages → Deploy from branch*.
- **Netlify / Vercel:** drag the folder in, or connect the repo. No build command.

## Disclaimer

An unofficial tribute site. All writing and photographs remain the work of their
original author, Dino Acuña. Not affiliated with or endorsed by the City
Government of Victorias.
