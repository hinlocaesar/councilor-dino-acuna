// =============================================================================
//  Content seeder
//
//  Creates the document types and publishes the site content on first boot.
//  Idempotent: if the root already has children, or the types already exist,
//  it does nothing — so restarting is always safe.
//
//  To re-seed from scratch, delete umbraco/Data/ and restart.
// =============================================================================

using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Strings;
using Umbraco.Extensions;

namespace DinoAcuna.Web.Seeding;

public static class ContentSeeder
{
    // ------------------------------------------------------------- aliases
    private const string Home = "home";
    private const string Video = "video";
    private const string BlogPost = "blogPost";
    private const string Milestone = "milestone";

    private const string GroupAlias = "content";
    private const string GroupName = "Content";
    private const int UserId = -1;   // SuperUser

    // A couple of built-in editor aliases have no constant in
    // Constants.PropertyEditors.Aliases, so they are declared here.
    private const string ToggleAlias = "Umbraco.TrueFalse";

    // The site is invariant (no languages configured). An empty array means
    // "publish every culture the item has", which is the invariant culture here.
    private static readonly string[] InvariantCultures = Array.Empty<string>();

    public static async Task SeedAsync(IServiceProvider services, ILogger logger)
    {
        using var outer = services.CreateScope();
        var sp = outer.ServiceProvider;

        var contentTypeService = sp.GetRequiredService<IContentTypeService>();
        var dataTypeService = sp.GetRequiredService<IDataTypeService>();
        var contentService = sp.GetRequiredService<IContentService>();
        var scopeProvider = sp.GetRequiredService<Umbraco.Cms.Infrastructure.Scoping.IScopeProvider>();
        var ssh = sp.GetRequiredService<IShortStringHelper>();

        // ------------------------------------------------------- 1. doc types
        if (contentTypeService.Get(Home) is null)
        {
            CreateContentTypes(contentTypeService, dataTypeService, ssh);
            logger.LogInformation("Seeded {0} document types.", 4);
        }
        else
        {
            logger.LogInformation("Document types already present.");
        }

        // -------------------------------------------------------- 2. content
        // Everything hangs off the content root, addressed by Constants.System.Root.
        const int SystemRoot = Constants.System.Root;

        if (contentService.HasChildren(SystemRoot))
        {
            logger.LogInformation("Content already seeded — nothing to do.");
            return;
        }

        using (var scope = scopeProvider.CreateScope(autoComplete: true))
        {
            var home = contentService.CreateAndSave("Home", SystemRoot, Home, UserId);
            home.SetValue("title", "Councilor Dino Acuña");
            home.SetValue("subtitle", "City Councilor · Victorias City");
            contentService.SaveAndPublish(home, InvariantCultures, UserId);

            // ---- blog posts: prefer the WordPress export, fall back to the
            //      hand-curated list if the JSON is missing.
            var posts = LoadWordPressPosts();
            if (posts.Count > 0)
            {
                logger.LogInformation("Imported {0} blog posts from the WordPress export.", posts.Count);
            }
            else
            {
                logger.LogWarning(
                    "WordPress export not found - falling back to the built-in post list. " +
                    "Run: node tools/export-wordpress.mjs");
                posts = FallbackPosts
                    .Select(p => new PostEntry(
                        p.SortKey, p.Title, p.Excerpt, p.Tag, p.Date, p.Url, "", "", ""))
                    .ToList();
            }

            int n = 0;
            n += Seed(contentService, Video, home, UserId, Videos.Select(v => new[]
            {
                ("sortKey", (object?)v.SortKey),
                ("title", v.Title),
                ("caption", v.Caption),
                ("category", v.Category),
                ("duration", v.Duration),
                ("views", v.Views),
                ("when", v.When),
                ("thumbFile", v.FileName ?? ""),
                ("isStill", v.IsStill),
                ("url", v.Url)
            }.ToArray()));

            n += Seed(contentService, BlogPost, home, UserId, posts.Select(p => new[]
            {
                ("sortKey", (object?)p.SortKey),
                ("title", p.Title),
                ("excerpt", p.Excerpt),
                ("tag", p.Tag),
                ("date", p.Date),
                ("url", p.Url),
                ("body", p.Body),
                ("featuredImage", p.FeaturedImage),
                ("wordpressSlug", p.Slug)
            }.ToArray()));

            n += Seed(contentService, Milestone, home, UserId, Milestones.Select(m => new[]
            {
                ("sortKey", (object?)m.SortKey),
                ("milestoneYear", m.Year),
                ("milestoneTitle", m.Title),
                ("milestoneBody", "<p>" + m.Body + "</p>"),
                ("isKey", m.IsKey)
            }.ToArray()));

            scope.Complete();
            logger.LogInformation("Seeded {0} content items under Home.", n);
        }
    }

    private static int Seed(
        IContentService svc, string alias, IContent parent, int userId, IEnumerable<(string, object?)[]> items)
    {
        int count = 0;
        foreach (var values in items)
        {
            var name = (string)(values.First(v => v.Item1 is "title" or "milestoneTitle").Item2 ?? "Item");
            var item = svc.CreateAndSave(name, parent, alias, userId);
            foreach (var (key, value) in values) item.SetValue(key, value);
            svc.SaveAndPublish(item, InvariantCultures, UserId);
            count++;
        }
        return count;
    }

    /// <summary>A blog entry, either from the WordPress export or the fallback list.</summary>
    private sealed record PostEntry(
        string SortKey, string Title, string Excerpt, string Tag, string Date, string Url,
        string Body, string FeaturedImage, string Slug);

    /// <summary>
    /// Reads cms/Seeding/wordpress-posts.json, produced by
    /// tools/export-wordpress.mjs. Returns an empty list if it is absent, so a
    /// fresh clone without the export still boots.
    /// </summary>
    private static List<PostEntry> LoadWordPressPosts()
    {
        // Prefer the copy next to the binaries (works from `dotnet publish`),
        // then fall back to the project root (works when running from source).
        var candidates = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "Seeding", "wordpress-posts.json"),
            Path.GetFullPath(Path.Combine(
                AppContext.BaseDirectory, "..", "..", "..", "..", "Seeding", "wordpress-posts.json")),
        };

        var path = candidates.FirstOrDefault(System.IO.File.Exists);
        if (path is null) return new List<PostEntry>();

        try
        {
            using var doc = JsonDocument.Parse(System.IO.File.ReadAllText(path));
            var list = new List<PostEntry>();

            foreach (var el in doc.RootElement.EnumerateArray())
            {
                string S(string name) =>
                    el.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String
                        ? v.GetString() ?? ""
                        : "";

                var tags = el.TryGetProperty("tags", out var t) && t.ValueKind == JsonValueKind.Array
                    ? t.EnumerateArray().Select(x => x.GetString() ?? "").Where(x => x.Length > 0).ToArray()
                    : Array.Empty<string>();

                var title = S("title");
                var date = DateTime.TryParse(S("date"), null,
                        System.Globalization.DateTimeStyles.AdjustToUniversal |
                        System.Globalization.DateTimeStyles.AssumeUniversal,
                        out var dt)
                    ? dt.ToString("dd MMM yyyy")
                    : S("date");

                list.Add(new PostEntry(
                    SortKey: list.Count.ToString("D2"),
                    Title: title,
                    Excerpt: S("excerpt"),
                    Tag: S("cardTag") is { Length: > 0 } ct ? ct : CardTag(tags, title),
                    Date: date,
                    Url: S("url"),
                    Body: S("body"),
                    FeaturedImage: S("featuredImage"),
                    Slug: S("slug")));
            }

            return list;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Could not read {path}: {ex.Message}");
            return new List<PostEntry>();
        }
    }

    /// <summary>
    /// Mirrors pickTag() in tools/export-wordpress.mjs, so labels stay
    /// consistent even for exports made before that field existed.
    /// </summary>
    private static string CardTag(string[] tags, string title)
    {
        bool Has(string pat) => tags.Any(t => Regex.IsMatch(t, pat, RegexOptions.IgnoreCase));
        bool Title(string pat) => Regex.IsMatch(title, pat, RegexOptions.IgnoreCase);

        if (Title(@"\b(gratitude|thank\s+you|sympath|rest\s+well|sleep\s+well|good\s+night|farewell|remembering|condolen|tribute)\b")
            || Title(@"\b(rosalina|lola|hautea|bantug)\b"))
            return "Tribute";
        if (Has("environment|climate|sustainab|forest|renewab|reforest")) return "Environment";
        if (Has("women|gender|feminis")) return "Women";
        if (Has("heritage|history|cultur|kadalag|panaad|ancient|annivers|foran")) return "Heritage";
        if (Has("mine|chile|earthquake|disaster|tsunami|hostage")) return "World";
        if (Has(@"crime|criminal|police|AFP|human\s+rights|torture|kidnap")) return "Society";
        if (Has("education|school|teacher|tesda|skills|health")) return "Society";
        if (Has("OFW|remit|econom|sugar|business|pagcor|trade|agricultur|rice|food|budget")) return "Economy";
        if (Has("politic|senate|congress|election|comelec|president|p-noy|noynoy|cory|aquino|palace|legislat|ombudsman")) return "Politics";

        if (Title(@"hostage|earthquake|disaster|miners|chile")) return "World";
        if (Title(@"gratitude|thank|sympath|rest\s+well|sleep\s+well|good\s+night|critic|mourn")) return "Tribute";
        if (Title(@"essay|generation|world!|hello\s+world")) return "Essay";
        if (Title(@"president|senat|congress|elect|ombudsman|palace")) return "Politics";
        if (Title(@"police|crime|AFP|justice|court|massacre|killed")) return "Society";

        var ok = tags
            .Where(t => t.Length > 2 && t.Length <= 18
                        && !char.IsDigit(t[0])
                        && t.Split(' ').Length <= 2
                        && !StopWords.Contains(t))   // "Rubout", "Journal", "BSP"…
            .OrderBy(t => t.Length)
            .FirstOrDefault();

        return ok is null ? "Journal" : char.ToUpperInvariant(ok[0]) + ok[1..];
    }

    /// <summary>
    /// Tags that read as noise on a card. "BSP" and "Rubout" are WordPress tags
    /// the author used to name an organisation, not a subject.
    /// </summary>
    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "dino acuna", "acuna", "journal", "news", "featured", "blog", "posts",
        "bsp", "rubout", "davao", "blogroll", "spam",
    };

    // ------------------------------------------------------ doc type setup
    private static void CreateContentTypes(
        IContentTypeService svc, IDataTypeService dts, IShortStringHelper ssh)
    {
        // GetDataType(name) matches on the built-in *name*, which shifts between
        // Umbraco versions, so resolve by property-editor alias instead.
        IDataType T(string editorAlias) =>
            dts.GetByEditorAlias(editorAlias).FirstOrDefault()
            ?? throw new InvalidOperationException($"No built-in data type for editor '{editorAlias}'.");

        ContentType Make(string alias, string name, string icon, bool root = false)
        {
            var t = new ContentType(ssh, Constants.System.Root)
            {
                Alias = alias,
                Name = name,
                Icon = icon,
                AllowedAsRoot = root
            };
            t.AddPropertyGroup(GroupAlias, GroupName);
            return t;
        }

        void Prop(ContentType t, IDataType dt, string alias, string name, bool mandatory = false) =>
            t.AddPropertyType(new PropertyType(ssh, dt)
            {
                Alias = alias,
                Name = name,
                Mandatory = mandatory
            }, GroupAlias, GroupName);

        // ---- home
        var home = Make(Home, "Home", "icon-home", root: true);
        Prop(home, T(Constants.PropertyEditors.Aliases.TextBox), "title", "Page title", mandatory: true);
        Prop(home, T(Constants.PropertyEditors.Aliases.TextBox), "subtitle", "Subtitle");
        svc.Save(home, UserId);

        // ---- video
        var video = Make(Video, "Video", "icon-video");
        Prop(video, T(Constants.PropertyEditors.Aliases.TextBox), "sortKey", "Sort key");
        Prop(video, T(Constants.PropertyEditors.Aliases.TextBox), "title", "Title", mandatory: true);
        Prop(video, T(Constants.PropertyEditors.Aliases.TextArea), "caption", "Caption");
        Prop(video, T(Constants.PropertyEditors.Aliases.TextBox), "category", "Category (council / program / field)");
        Prop(video, T(Constants.PropertyEditors.Aliases.TextBox), "duration", "Duration");
        Prop(video, T(Constants.PropertyEditors.Aliases.TextBox), "views", "Views");
        Prop(video, T(Constants.PropertyEditors.Aliases.TextBox), "when", "When");
        Prop(video, T(Constants.PropertyEditors.Aliases.TextBox), "thumbFile", "Thumbnail filename");
        Prop(video, T(ToggleAlias), "isStill", "Is photo (not a video frame)");
        Prop(video, T(Constants.PropertyEditors.Aliases.TextBox), "url", "Facebook URL");
        svc.Save(video, UserId);

        // ---- blog post
        var post = Make(BlogPost, "Blog post", "icon-document");
        Prop(post, T(Constants.PropertyEditors.Aliases.TextBox), "sortKey", "Sort key");
        Prop(post, T(Constants.PropertyEditors.Aliases.TextBox), "title", "Title", mandatory: true);
        Prop(post, T(Constants.PropertyEditors.Aliases.TextArea), "excerpt", "Excerpt");
        Prop(post, T(Constants.PropertyEditors.Aliases.TextBox), "tag", "Tag");
        Prop(post, T(Constants.PropertyEditors.Aliases.TextBox), "date", "Date");
        Prop(post, T(Constants.PropertyEditors.Aliases.TextBox), "url", "Blog URL");
        Prop(post, T(Constants.PropertyEditors.Aliases.RichText), "body", "Full post (imported from WordPress)");
        Prop(post, T(Constants.PropertyEditors.Aliases.TextBox), "featuredImage", "Featured image URL");
        Prop(post, T(Constants.PropertyEditors.Aliases.TextBox), "wordpressSlug", "WordPress slug");
        svc.Save(post, UserId);

        // ---- milestone
        var ms = Make(Milestone, "Timeline milestone", "icon-thumbnails");
        Prop(ms, T(Constants.PropertyEditors.Aliases.TextBox), "sortKey", "Sort key");
        Prop(ms, T(Constants.PropertyEditors.Aliases.TextBox), "milestoneYear", "Year");
        Prop(ms, T(Constants.PropertyEditors.Aliases.TextBox), "milestoneTitle", "Title", mandatory: true);
        Prop(ms, T(Constants.PropertyEditors.Aliases.RichText), "milestoneBody", "Body");
        Prop(ms, T(ToggleAlias), "isKey", "Highlight");
        svc.Save(ms, UserId);
    }

    // ---------------------------------------------------------- seed content
    private sealed record VideoSeed(
        string SortKey, string Title, string Caption, string Category, string Duration,
        string Views, string When, bool IsStill, string Url, string? FileName);

    private static readonly VideoSeed[] Videos =
    {
        new("01", "58th Regular Session of the 10th Sangguniang Panlungsod",
            "The council floor in regular session — the chamber where the Grow-a-Forest ordinance and the city's other legislation are debated and passed.",
            "council", "0:40", "453", "Most recent", true,
            "https://www.facebook.com/dino2022/videos/58th-regular-session-of-the-10th-sangguniang-panlungsod-of-victorias-city/1392222609198399/",
            "still-council-office.jpg"),
        new("02", "66th Botika Sang Masa — Purok 8, Barrio Daan Banwa",
            "The city government's health programme brought down to the purok, in Brgy. 9, Victorias City.",
            "program", "1:54", "2.3K", "3 days ago", false,
            "https://www.facebook.com/dino2022/videos/66th-botika-sang-masa-sa-purok-8-barrio-daan-banwa-brgy-9-victorias-city/1818005389619685/",
            "1818005389619685.jpg"),
        new("03", "Salamat sa mga naka agum sang mga bulong, vitamins, bugas",
            "Medicines, vitamins, laundry soap and rubbing alcohol distributed at Purok 8, Brgy. 9 — with a compliance statement on the Anti-Epal Policy.",
            "program", "3:35", "1.5K", "3 days ago", false,
            "https://www.facebook.com/dino2022/videos/66th-botika-sang-masa-sa-purok-8-barrio-daan-banuasalamat-sa-mga-naka-agum-sang-/1379216911050937/",
            "1379216911050937.jpg"),
        new("04", "Five years of sharing, caring and giving back",
            "The fifth consecutive year of the Adopt a Victoriasanon Family Program with the CSWD — this time for a hardworking fishing family.",
            "program", "1:14", "1.5K", "6 days ago", false,
            "https://www.facebook.com/dino2022/videos/five-years-of-sharing-caring-and-giving-back-%EF%B8%8Ffor-the-5th-consecutive-year-since/1823982645281686/",
            "1823982645281686.jpg"),
        new("05", "Botika Sang Masa for the city's employees",
            "Serving the city workforce during the 126th Civil Service Month celebration.",
            "program", "1:15", "515", "6 days ago", false,
            "https://www.facebook.com/dino2022/videos/thank-you-for-the-chance-to-serve-our-dearest-city-employees-thru-the-botika-san/2124817634786544/",
            "2124817634786544.jpg"),
        new("06", "Negros Trade Fair 2026 — Butlak Negros",
            "Representing the City of Victorias at the 2026 Negros Trade Fair. #parientesangmasa",
            "field", "7:11", "806", "A week ago", false,
            "https://www.facebook.com/dino2022/videos/negros-trade-fair-2026-butlak-negros-aton-kilalahonparientesangmasa-dinoacuna/1776255363423731/",
            "1776255363423731.jpg"),
        new("07", "Clark Freeport Zone, Pampanga",
            "An official engagement in Pampanga. #parientesangmasa",
            "field", "5:17", "1.7K", "A week ago", false,
            "https://www.facebook.com/dino2022/videos/clark-freeport-zone-sa-pampanga-aton-kilalahonparientesangmasa-dinoacuna/4042188909417828/",
            "4042188909417828.jpg"),
        new("08", "Mactan Shrine",
            "A marker of the first stand of Filipino people against occupation. #parientesangmasa",
            "field", "5:56", "1K", "A week ago", false,
            "https://www.facebook.com/dino2022/videos/mactan-shrine-isa-ka-duog-nga-tanda-sang-una-nga-pakig-bato-sang-mga-pilipino-ko/2871241719914319/",
            "2871241719914319.jpg"),
        new("09", "57th Regular Session, presided by Vice Mayor Derek Palanca",
            "A productive session on responsive legislation and good governance for all Victoriasanons.",
            "council", "0:40", "481", "2 weeks ago", false,
            "https://www.facebook.com/dino2022/videos/%EF%B8%8F-57th-regular-session-presided-by-vice-mayor-derek-palanca-productive-session-u/1651321780032246/",
            null),
        new("10", "On the ground since 2022 — visiting small business owners",
            "“When I ran for City Council in 2022, and throughout my Council service, I visited with many small business owners in town.”",
            "field", "—", "5.3K", "On the road", false,
            "https://www.facebook.com/61590790902444/videos/when-i-ran-for-city-council-in-2022-and-throughout-my-council-service-i-visited-/1365551411801507/",
            null),
    };

    private sealed record PostSeed(string SortKey, string Title, string Excerpt, string Tag, string Date, string Url);

    /// <summary>
    /// Used only when wordpress-posts.json is missing. Once the export exists
    /// these are never read.
    /// </summary>
    private static readonly PostSeed[] FallbackPosts =
    {
        new("01", "Supporting Our Women Sector",
            "Educational, entrepreneurial and environmental benchmarking in Kabankalan City, with the women leaders of the province — and a reminder that empowerment, not assistance, is what moves a community forward.",
            "Community", "27 Mar 2025",
            "https://dinoacuna.wordpress.com/2025/03/27/supporting-our-women-sector/"),
        new("02", "Victorias Strengthens Its Environmental Commitment",
            "City Ordinance No. 2024-159, the Grow-a-Forest Project of Victorias City, turns forest preservation and climate mitigation into a shared civic responsibility — one hectare at a time.",
            "Environment", "26 Mar 2025",
            "https://dinoacuna.wordpress.com/2025/03/26/748/"),
        new("03", "Grand Slam: Best of Festival Dances at Panaad sa Negros",
            "A third consecutive win for Victorias City, the return of St. Casimiro to the Kadalag-an stage, and thanks to a choreographer who shared his talent with the world.",
            "Culture", "25 Mar 2025",
            "https://dinoacuna.wordpress.com/2025/03/25/victorias-citys-sidlak-sang-kadalag-an-dancers-win-grandslam-champion-in-the-best-festival-of-dances-competion-of-the-2025-panaad-sa-negros/"),
        new("04", "Honoring Severo A. Palanca, Continuing the Benitez Legacy",
            "The man who brought Victorias to cityhood, and the mayor carrying the torch — a tribute written on the 27th Kadalag-an Festival.",
            "History", "22 Mar 2025",
            "https://dinoacuna.wordpress.com/2025/03/22/honoring-mayor-severo-a-palanca-the-visionary-behind-victorias-cityhood-mayor-javier-miguel-l-benitez-continuing-the-legacy-of-service-and-leading-victorias-to-the-pinnacle-of-succe/"),
        new("05", "I Love My Generation",
            "For Pinoys and Pinayas born in the '40s, '50s, '60s and '70s: no helmets, no handhelds, real friends — and the best risk-takers, problem solvers and creative thinkers this country ever produced.",
            "Essays", "29 Oct 2011",
            "https://dinoacuna.wordpress.com/2011/10/29/i-love-my-generation/"),
        new("06", "In Gratitude to Mrs. Remedios P. Bantug",
            "Idiong Bantug — mayor at eighty-two, a record no one has broken. A tribute written with a grateful heart, and a farewell.",
            "Tributes", "28 Oct 2011",
            "https://dinoacuna.wordpress.com/2011/10/28/in-gratitude-to-mrs-remedios-p-bantug/"),
        new("07", "The Armed Conflict in Mindanao & the PNoy",
            "Filipinos killing Filipinos. An early column on the unresolved war in the south, and what it says about the politics being played over it.",
            "Politics", "28 Oct 2011",
            "https://dinoacuna.wordpress.com/2011/10/28/armed-conflict-in-mindanao-pnoy/"),
        new("08", "Albee's Sugar Act Bill on the Rise",
            "The most-awaited sugar bill is finally moving — and for Negros Occidental, the province whose livelihood depends on it, that matters enormously.",
            "Politics", "24 Oct 2011",
            "https://dinoacuna.wordpress.com/2011/10/24/albees-sugar-act-bill-on-the-rise/"),
        new("09", "Miss Rosalina J. Hautea",
            "“Imo lawas imo kulo, imo kalag imo bakiro.” A life remembered for a teacher of thirty-eight years, a mahjong table, and two adopted sons.",
            "Tributes", "02 Oct 2011",
            "https://dinoacuna.wordpress.com/2011/10/02/miss-rosalina-j-hautea/"),
    };

    private sealed record MilestoneSeed(string SortKey, string Year, string Title, string Body, bool IsKey);

    private static readonly MilestoneSeed[] Milestones =
    {
        new("01", "1992", "Age 16 — SK Chairman, Barangay V",
            "Elected Sangguniang Kabataan Chairman of his village; soon Federation President of the Municipality of Victorias and ex-officio member of the Town Council.", false),
        new("02", "1996", "SK President, Negros Occidental",
            "Re-elected from the barangay to the municipal and provincial level. Ex-officio member of the Sangguniang Panlalawigan, and National Assistant Auditor of the SK National Federation.", false),
        new("03", "1998", "Cityhood — R.A. No. 8488",
            "As SK Federation President he personally delivered to the Senate the SK resolution supporting Victorias' cityhood. The law was signed by President Fidel V. Ramos on February 11, 1998 and ratified on March 21, 1998 — now Charter Day.", false),
        new("04", "2002", "End of the youth chapter",
            "Two decades of Sangguniang Barangay, Sangguniang Bayan and Sangguniang Panlalawigan service. Most of the infrastructure and ordinances built in city and province — including the cityhoods of Sipalay and Himamaylan — carry his votes.", false),
        new("05", "2014", "Chief of Staff to the Mayor",
            "Six years inside city government, translating policy into programmes on the ground.", false),
        new("06", "2020", "City Administrator, Victorias City",
            "Appointed Administrator of the City of Victorias — the first former youth councillor to hold the post.", false),
        new("07", "2022", "Elected to the City Council",
            "Returns to the chamber as Councilor of Victorias City, 3rd Congressional District, Negros Occidental.", false),
        new("08", "2024", "City Ordinance No. 2024-159",
            "Authors the <strong>“Grow-a-Forest Project of Victorias City”</strong> — the Adopt-a-Forest Program. Approved by the Sangguniang Panlungsod on November 18, 2024 and signed by Mayor Javier Miguel L. Benitez on January 13, 2025.", true),
        new("09", "2025", "“Together for the Trees”",
            "Launches the first planting under the ordinance during the 27th Kadalag-an Festival and the International Day of Forests, with 2,500 endemic seedlings planted and 10,100 more donated by PEMO and PENRO.", true),
    };
}



