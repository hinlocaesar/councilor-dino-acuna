using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.Web;
using Umbraco.Cms.Web.Common.Controllers;
using Umbraco.Extensions;

namespace DinoAcuna.Web.Controllers;

public sealed class HomeController : UmbracoController
{
    private const string HomeAlias = "home";

    private readonly IPublishedContentQuery _contentQuery;

    public HomeController(IPublishedContentQuery contentQuery) => _contentQuery = contentQuery;

    /// <summary>
    /// Serves the single-page site at the root URL. The "Home" document in the
    /// backoffice is rendered by Views/Home.cshtml.
    /// </summary>
    [HttpGet("")]
    public IActionResult Index()
    {
        IPublishedContent? home = _contentQuery
            .ContentAtRoot()
            .FirstOrDefault(c => c.ContentType.Alias == HomeAlias);

        if (home is null)
        {
            // No content yet — point the visitor at the backoffice so an editor
            // can get started, rather than rendering a blank page.
            return Redirect("/umbraco");
        }

        return View("Home", home);
    }
}

