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
│  ├─ css/styles.css          # design system + all component styles
│  ├─ img/thumbs/             # video thumbnails (local, see note)
│  └─ js/
│     ├─ data.js              # ← EDIT THIS to add videos / blog posts
│     └─ main.js              # behaviour (nav, reveal, filter, modal)
├─ cms/                       # the Umbraco build — see cms/README.md
├─ package.json               # dev server only
└─ .gitignore
```

## Adding a video or blog post

Everything dynamic lives in **`assets/js/data.js`**. The page reads it on load.

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

- **Type** — Fraunces (display serif) + Inter (UI), loaded from Google Fonts.
- **Palette** — deep forest greens with gold accents, nodding to Victorias City
  and the sugarcane fields of Negros Occidental.
- **Motion** — scroll-reveals via `IntersectionObserver`, a gradient sheen on
  the name, drifting background orbs, a marquee ticker, and a scroll-progress bar.
- **Responsive** — full-width down to 320px, with a slide-in mobile menu.
- **Accessibility** — skip link, visible focus rings, `aria-*` state on the menu
  and filter chips, real `<button>` hit areas on video cards, and a full
  `prefers-reduced-motion` path that disables animation.

## Images

Editorial photographs (portraits, heritage) are hot-linked from the original
WordPress uploads, so there is nothing to re-upload for those. Video thumbnails
are the exception — see [Thumbnails](#thumbnails) above.

If a host ever blocks hotlinking, download the WordPress images into
`assets/img/` and swap the `src` values in `index.html`.

## Deploying

The site is fully static — any host works.

- **GitHub Pages:** push to a repo, then *Settings → Pages → Deploy from branch*.
- **Netlify / Vercel:** drag the folder in, or connect the repo. No build command.

## Disclaimer

An unofficial tribute site. All writing and photographs remain the work of their
original author, Dino Acuña. Not affiliated with or endorsed by the City
Government of Victorias.
