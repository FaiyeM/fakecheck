using Microsoft.AspNetCore.Mvc;

namespace FakeCheck.Api.Controllers;

/// <summary>
/// Public, unauthenticated legal pages (spec §14). Served as plain HTML from the
/// existing backend so the app can link a real Privacy Policy URL in the app
/// stores without standing up separate hosting.
/// </summary>
[ApiController]
public sealed class LegalController : ControllerBase
{
    private const string Contact = "support@flossinfakecheck.app";
    private const string Updated = "24 June 2026";

    [HttpGet("/privacy")]
    [Produces("text/html")]
    public ContentResult Privacy() => Html("Privacy Policy", $$"""
        <p>FakeCheck ("we", "the app") helps you photograph an item and get an AI-assisted
        opinion on whether it appears authentic. We designed FakeCheck to require
        <strong>no account and no personal information</strong>.</p>

        <h2>What we collect</h2>
        <ul>
          <li><strong>Photos you take or select</strong> of the item you want checked, uploaded to
          secure storage so our vision models can identify and assess the item.</li>
          <li><strong>An anonymous device identifier</strong> generated on your device, used only to
          group your scans and apply fair-use rate limits. It is not linked to your name, email,
          phone number, or any advertising identifier.</li>
          <li><strong>Scan results and any corrections you submit</strong> (your stated outcome plus
          an optional written explanation and up to three supporting photos), used to improve accuracy.</li>
          <li><strong>Basic technical data</strong> such as app version and platform.</li>
        </ul>
        <p>We do <strong>not</strong> collect your name, email, address, contacts, precise location,
        or advertising identifiers, and we do <strong>not</strong> sell your data or use it for ads.</p>

        <h2>How we use it</h2>
        <p>To identify the item, run authenticity checks, show you a result, and improve our models.
        Correction photos are re-encoded on our servers, which removes all embedded metadata
        (including any GPS/location EXIF data) before they are retained for model improvement.</p>

        <h2>How long we keep it</h2>
        <ul>
          <li><strong>Scan photos</strong> are automatically deleted within <strong>30 days</strong>.</li>
          <li><strong>Corrections</strong> (and their EXIF-stripped supporting photos) may be retained
          longer to improve model accuracy; they contain no personal identifiers.</li>
        </ul>

        <h2>Sharing</h2>
        <p>We use third-party infrastructure providers (cloud hosting, object storage, and AI vision
        providers) solely to operate the service. We do not share your data with anyone else.</p>

        <h2>Your choices</h2>
        <p>You can clear your local scan history in the app at any time. To request deletion of
        server-side data, contact us below.</p>

        <h2>Important note</h2>
        <p>FakeCheck provides an <strong>AI-assisted opinion, not a guarantee</strong> of authenticity.
        Always use your own judgment for purchase or resale decisions.</p>

        <h2>Contact</h2>
        <p>Questions or deletion requests: <a href="mailto:{{Contact}}">{{Contact}}</a></p>
        """);

    [HttpGet("/terms")]
    [Produces("text/html")]
    public ContentResult Terms() => Html("Terms of Service", $$"""
        <p>By using FakeCheck ("the app") you agree to these terms. If you do not agree, please do
        not use the app.</p>

        <h2>1. What FakeCheck is</h2>
        <p>FakeCheck uses photos you provide and AI vision models to give an <strong>opinion</strong>
        on whether an item appears authentic across supported categories (sneakers, luxury handbags,
        Pokémon cards, luxury watches). It is an informational tool only.</p>

        <h2>2. No guarantee of authenticity</h2>
        <p>The result is an AI-assisted assessment, <strong>not a certification, appraisal, or
        guarantee</strong>. Results can be wrong. You are solely responsible for any buying, selling,
        or other decision you make. FakeCheck and its operators are not liable for losses arising from
        reliance on a result.</p>

        <h2>3. Acceptable use</h2>
        <p>You agree to photograph only items you own or are lawfully permitted to photograph, and not
        to misuse, overload, reverse-engineer, or attempt to disrupt the service.</p>

        <h2>4. Your content</h2>
        <p>You retain ownership of the photos you submit. You grant us a limited license to process and
        store them to operate and improve the service, as described in the Privacy Policy.</p>

        <h2>5. Availability</h2>
        <p>The service is provided "as is" and may change or be unavailable at times.</p>

        <h2>6. Changes to these terms</h2>
        <p>We may update these terms; continued use after an update means you accept the revised terms.</p>

        <h2>7. Contact</h2>
        <p><a href="mailto:{{Contact}}">{{Contact}}</a></p>
        """);

    private ContentResult Html(string title, string body) => new()
    {
        ContentType = "text/html; charset=utf-8",
        Content = $$"""
            <!doctype html>
            <html lang="en">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>FakeCheck — {{title}}</title>
              <style>
                body{max-width:720px;margin:40px auto;padding:0 20px;
                  font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1a1a1a}
                h1{font-size:1.7rem;margin-bottom:0} h2{margin-top:1.6em;font-size:1.15rem}
                .updated{color:#666;font-size:.9rem;margin-top:.3em} a{color:#2f6fed}
              </style>
            </head>
            <body>
              <h1>FakeCheck — {{title}}</h1>
              <p class="updated">Last updated: {{Updated}}</p>
              {{body}}
            </body>
            </html>
            """
    };
}
