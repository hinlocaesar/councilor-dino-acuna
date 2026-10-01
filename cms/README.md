# DinoAcuna.Web — Umbraco version of the site

An **Umbraco 17 LTS** rebuild of the Councilor Dino Acuña site. The design is
unchanged; the content is now editable in the Umbraco backoffice.

| | Static version | This project |
| --- | --- | --- |
| Stack | HTML / CSS / vanilla JS | ASP.NET Core 10 + Umbraco 17 |
| Content | `assets/js/data.js` | Umbraco backoffice |
| Hosting | any static host | needs .NET |

## Run it

```powershell
cd cms
dotnet run
```

| URL | What |
| --- | --- |
| <http://localhost:5001/> | The site |
| <http://localhost:5001/umbraco> | The backoffice |

**Backoffice login** (set in `appsettings.json`):

```
email:    admin@victoriascity.gov.ph
password: Victorias2025!
```

> Change that password before this goes anywhere public.

The port is pinned to **5001** because 5000 and 8080 are already taken on this
machine, and `5001` avoids the ports the old `live-server` used.

## First run does three things

On first boot the app installs itself unattended (SQLite), creates the document
types, and publishes the content. You will see this in the log:

```
Starting unattended install.
Unattended install completed.
Seeded 4 document types.
Seeded 28 content items under Home.
Now listening on: http://localhost:5001
```

The seeder is **idempotent** — it checks whether the content root already has
children and bails out if so, so restarts never duplicate anything.

To re-seed from scratch:

```powershell
# stop the app, then
Remove-Item cms\umbraco\Data\Umbraco.sqlite.db* -Force
dotnet run --project cms
```

## Document types

| Type | Purpose |
| --- | --- |
| **Home** (`home`) | The single page. Root-level. |
| **Video** (`video`) | One gallery card. |
| **Blog post** (`blogPost`) | One journal card + a full article at `/post/{slug}`. |
| **Timeline milestone** (`milestone`) | One entry in the Record section. |

Ordering everywhere uses a `sortKey` text property, so you can re-order from the
backoffice by typing `01`, `02`, `03` — no need to fiddle with Umbraco's
built-in sort.

## Importing the blog from WordPress

All **40 posts** from dinoacuna.wordpress.com (July 2010 – March 2025) are
imported with their full article bodies — roughly 379,000 characters of HTML,
including the photographs and WordPress gallery blocks.

Every photograph those articles reference is **stored locally**, so the CMS makes
no request to `dinoacuna.wordpress.com` at runtime. 261 images live in
`wwwroot/img/posts/` (21.5 MB) and 7 more in `wwwroot/img/editorial/`; the fonts
are self-hosted in `wwwroot/fonts/` too. See
[Self-hosting](../README.md#self-hosting) in the root README.

```bash
npm run import:blog      # from the repo root — export, images, editorial, sync
```

`npm run export:blog` re-fetches via the WordPress.com REST API,
`npm run fetch:images` downloads and rewrites the article images, and
`npm run sync:static` regenerates the static build's post list from the same
export so both builds stay identical.

That writes `cms/Seeding/wordpress-posts.json`, which the seeder reads on the
next fresh install. Per post it stores the title (verbatim, author's own
casing), date, canonical URL, a plain-text excerpt, the cleaned HTML body, the
first inline image, all WordPress tags, and a short `cardTag` label.

The exporter strips the WordPress comment form, share buttons and
related-posts chrome, decodes HTML entities in titles, and trims a trailing
colon. It also drops every `data-*` attribute that carried a `wordpress.com`
URL — those were editor metadata the browser never reads, but leaving them meant
500+ absolute dependencies on the source site.

### Re-importing

The seeder only runs when the content root is empty, so refresh the import with:

```powershell
# stop the app, then
Remove-Item cms\umbraco\Data\Umbraco.sqlite.db* -Force
dotnet run --project cms
```

**This wipes the backoffice**, including any edits made since the first seed. If
you have edited content, re-seed selectively instead, or add just the new posts
to the JSON by hand.

### The `/post/{slug}` route

Journal cards link to `/post/{slug}` when a body was imported, and fall back to
the original WordPress URL otherwise. `HomeController.Post` matches the slug
against the `wordpressSlug` property and returns 404 when there is no match.

### Card labels

WordPress tags are too noisy to show directly — they include agency names
("BSP", "CDC"), people's names ("Merly Fortu") and whole sentences ("33 miners
rescued in Chile"). `pickTag()` in the exporter maps them to a closed set of
eight: **Politics, Heritage, Tribute, Society, Economy, World, Environment,
Journal**. The seeder falls back to the same logic in C# if `cardTag` is
missing.

## Editing content

Go to **Content → Home**. Its children are the videos, posts and milestones —
create, edit, reorder, publish, unpublish. The front page re-renders immediately.

### Video categories

The `category` property is free text and drives the filter chips:

- `council` → "Council"
- `program` → "Programme"
- `field` → "Field"

Anything else falls back to "Council". See `CatLabel(...)` in `Views/Home.cshtml`.

### Thumbnails

Videos reference a **filename** in `thumbFile`, served from
`cms/wwwroot/img/thumbs/`. They are deliberately *not* in the Umbraco media
library — see the caveat below. To change a thumbnail, drop a new file in that
folder and update the `thumbFile` value.

Tick `isStill` when the image is a photograph rather than a real frame from the
clip; that adds a small **PHOTO** badge so nothing is passed off as a still.

Two of the ten videos have no usable Facebook thumbnail:

| Video | Why | What shows |
| --- | --- | --- |
| 58th Regular Session | Facebook's auto-frame is a **solid black** still | His council-office photo, badged `PHOTO` |
| 57th Regular Session | The thumbnail URL returns **403** | The gradient tile |
| Small business owners | Page is **login-walled** | The gradient tile |

## Project layout

```
cms/
├─ Controllers/HomeController.cs   # "/" and "/post/{slug}"
├─ Seeding/
│  ├─ ContentSeeder.cs            # document types + all seed content
│  └─ wordpress-posts.json        # the imported blog (40 posts)
├─ Views/
│  ├─ _Layout.cshtml              # <head>, header, footer, video modal
│  ├─ Home.cshtml                 # the single page, rendered from Umbraco
│  ├─ Post.cshtml                 # a full imported article
│  └─ _ViewImports.cshtml
├─ wwwroot/
│  ├─ css/
│  │  ├─ styles.css              # byte-identical to assets/css
│  │  └─ fonts.css               # generated — self-hosted @font-face
│  ├─ fonts/                     # 41 woff2 subsets (Fraunces + Inter)
│  ├─ img/
│  │  ├─ thumbs/                 # video thumbnails
│  │  ├─ editorial/              # portraits + heritage photographs
│  │  └─ posts/                  # 261 images from the imported articles
│  └─ js/site.js                 # interactions only — cards are server-rendered
├─ appsettings.json               # SQLite + unattended install credentials
├─ umbraco/Data/                  # the SQLite database (git-ignored)
└─ DinoAcuna.Web.csproj
```

`wwwroot/js/site.js` differs from the static `assets/js/main.js` on purpose: the
static version built cards from `data.js` in the browser, this one only wires up
behaviour and reads what it needs from `data-*` attributes on server-rendered
markup.

## Known caveats

**No media library import.** Umbraco 17 exposes no public file-upload API to
application code — uploads go through the Management API. The seeder therefore
stores images as filenames in `wwwroot` instead of as media items. This applies
to the 261 article images and 7 editorial photographs as much as to the video
thumbnails. If you want them in the library, upload them once through the
backoffice and swap the `thumbFile` property for a media picker.

**One-page site, plus article pages.** `/` serves the single page and
`/post/{slug}` serves each imported blog post. `HomeController` intercepts only
those two routes, so adding more Umbraco pages later still works through normal
Umbraco routing.

**`RazorCompileOnBuild` is on** so view errors surface at `dotnet build` rather
than as a 500 at request time. The Umbraco template ships with it off; it also
means a `.cshtml` syntax error fails the build.

## Deploying

Umbraco needs a real host, not a static one:

```powershell
dotnet publish cms -c Release -o publish
```

Point IIS, or `dotnet publish` output behind a reverse proxy, at that folder.
Keep `umbraco/Data` on a **writable** volume — that is where the SQLite file
lives. For production, move off SQLite to SQL Server or PostgreSQL by changing
`umbracoDbDSN` and `umbracoDbDSN_ProviderName` in `appsettings.json`.

## Disclaimer

An unofficial tribute site. All writing and photographs remain the work of their
original author, Dino Acuña. Not affiliated with or endorsed by the City
Government of Victorias.
