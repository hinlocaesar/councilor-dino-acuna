
using DinoAcuna.Web.Seeding;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

#if DEBUG
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);
#endif

builder.CreateUmbracoBuilder()
    .AddBackOffice()
    .AddWebsite()
    .AddComposers()
    .Build();

WebApplication app = builder.Build();

await app.BootUmbracoAsync();

// First boot only: create the document types and publish the site content.
try
{
    await ContentSeeder.SeedAsync(app.Services, app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Seed"));
}
catch (Exception ex)
{
    app.Logger.LogError(ex, "Content seeding failed — the site will start with an empty tree.");
}

app.UseUmbraco()
    .WithMiddleware(u =>
    {
        u.UseBackOffice();
        u.UseWebsite();
    })
    .WithEndpoints(u =>
    {
        u.UseBackOfficeEndpoints();
        u.UseWebsiteEndpoints();
    });

await app.RunAsync();
