using FakeCheck.Core.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FakeCheck.Infrastructure.Data;

/// <summary>
/// Seeds the 4 launch categories, their products (with per-product fake_bar), and the
/// guided auth-step flows straight from spec §6.1–§6.4. Idempotent: safe to run on every boot.
/// Weights: 1 = supporting, 2 = strong, 3 = critical/hard-fail-capable (spec §7.1, §7.3).
/// </summary>
public static class DbSeeder
{
    // Reference images live in the public R2 'fakecheck-reference' bucket (spec Phase 4).
    private const string RefBase = "https://reference.fakecheck.app";

    public static async Task SeedAsync(FakeCheckDbContext db, ILogger? logger = null, CancellationToken ct = default)
    {
        await db.Database.MigrateAsync(ct);

        await UpsertCategoryAsync(db, "sneaker", "Sneakers", ct);
        await UpsertCategoryAsync(db, "handbag", "Luxury Handbags", ct);
        await UpsertCategoryAsync(db, "pokemon", "Pokémon Cards", ct);
        await UpsertCategoryAsync(db, "watch", "Luxury Watches", ct);

        // Products (fake_bar raises the Authentic threshold for high-counterfeit items, spec §7.2).
        await UpsertProductsAsync(db,
            ("nike_air_jordan_1", "sneaker", "Nike", "Air Jordan 1", 5m),
            ("nike_dunk", "sneaker", "Nike", "Dunk", 5m),
            ("adidas_yeezy_350", "sneaker", "Adidas", "Yeezy Boost 350", 10m),
            ("adidas_samba", "sneaker", "Adidas", "Samba", 2m),
            ("new_balance_990", "sneaker", "New Balance", "990", 2m),
            ("lv_neverfull_mm", "handbag", "Louis Vuitton", "Neverfull MM", 10m),
            ("lv_speedy", "handbag", "Louis Vuitton", "Speedy", 10m),
            ("chanel_classic_flap", "handbag", "Chanel", "Classic Flap", 8m),
            ("gucci_marmont", "handbag", "Gucci", "GG Marmont", 5m),
            ("hermes_birkin", "handbag", "Hermès", "Birkin", 10m),
            ("pokemon_base_set", "pokemon", "Pokémon", "Base Set (WOTC)", 8m),
            ("pokemon_modern", "pokemon", "Pokémon", "Modern (Sword & Shield+)", 3m),
            ("rolex_submariner", "watch", "Rolex", "Submariner", 10m),
            ("rolex_datejust", "watch", "Rolex", "Datejust", 8m),
            ("ap_royal_oak", "watch", "Audemars Piguet", "Royal Oak", 8m),
            ("omega_speedmaster", "watch", "Omega", "Speedmaster", 5m));

        // Auth-step flows (spec §6.1–§6.4). (ordinal, checkId, title, tip, requirement, weight)
        await UpsertStepsAsync(db, "sneaker", new[]
        {
            Step(1, "box_label",  "Box label (full)",        "Lay the box label flat and fill the frame. Capture SKU, barcode and colorway name.", Requirement.Required, 2),
            Step(2, "silhouette", "Shoe side profile",       "Full side-on shot of one shoe on a plain background.",                                Requirement.Required, 2),
            Step(3, "toe_box",    "Toe box (front close-up)","Get close to the toe; show stitching and material texture.",                          Requirement.Required, 1),
            Step(4, "heel",       "Heel (back)",             "Straight-on shot of the heel counter and heel tab logo/font.",                       Requirement.Required, 2),
            Step(5, "sole",       "Sole (bottom)",           "Bottom of one shoe; show full tread and any 'Air' text.",                            Requirement.Required, 2),
            Step(6, "tongue",     "Tongue label",            "Close-up of the tongue label: font, sizing, country of manufacture.",                Requirement.Required, 1),
            Step(7, "insole",     "Insole",                  "Optional: remove insole if possible and photograph the print.",                      Requirement.Optional, 1),
            Step(8, "aglets",     "Lace tips (aglets)",      "Optional: close-up of the lace tips — metal vs plastic, colour.",                    Requirement.Optional, 1),
        }, ct);

        await UpsertStepsAsync(db, "handbag", new[]
        {
            Step(1, "exterior",   "Overall exterior (front)", "Front-on shot of the whole bag; keep logos/pattern centred and in focus.",          Requirement.Required, 1),
            Step(2, "stitching",  "Stitching (close-up)",     "Macro of a corner or seam so stitch count and tension are visible.",                Requirement.Required, 2),
            Step(3, "hardware",   "Hardware",                 "Close-up of zipper pulls / clasps / D-rings showing engraving and finish.",         Requirement.Required, 2),
            Step(4, "date_code",  "Date code / serial",       "Find the interior stamp; fill the frame and keep it sharp.",                         Requirement.Required, 3),
            Step(5, "lining",     "Interior lining",          "Photograph the lining colour, texture and any brand stamp.",                        Requirement.Required, 2),
            Step(6, "exterior_bottom", "Exterior bottom",     "Optional: underside showing feet alignment and piping.",                            Requirement.Optional, 1),
            Step(7, "dust_bag",   "Dust bag (if available)",  "Optional: dust bag colour/format and drawstring.",                                  Requirement.Optional, 1),
            Step(8, "auth_card",  "Authenticity card",        "Optional: card front — font, hologram, card stock.",                                Requirement.Optional, 1),
        }, ct);

        await UpsertStepsAsync(db, "pokemon", new[]
        {
            Step(1, "front", "Card front (full)", "Flat, glare-free shot of the whole front; fill the frame.",                                Requirement.Required, 2),
            Step(2, "back",  "Card back (full)",  "Flat shot of the back; the blue swirl should be evenly lit.",                              Requirement.Required, 2),
            Step(3, "edge",  "Card edge (close-up)", "Macro of the card edge held side-on — we look for the black core layer.",               Requirement.Required, 3),
            Step(4, "holo",  "Holographic area",  "For holo/foil cards: angle the card so the holo pattern catches the light.",               Requirement.Required, 2),
            Step(5, "front_angle", "Front under angle light", "Optional: tilt under light to reveal surface texture / rosette pattern.",      Requirement.Optional, 1),
        }, ct);

        await UpsertStepsAsync(db, "watch", new[]
        {
            Step(1, "dial",     "Dial (front face)",  "Straight-on, glare-free shot of the dial; logo, text and indices sharp.",              Requirement.Required, 2),
            Step(2, "case",     "Case profile (3 o'clock)", "Side profile showing case finishing and the crown.",                            Requirement.Required, 1),
            Step(3, "caseback", "Caseback",           "Photograph the caseback engravings / movement and serial number.",                     Requirement.Required, 3),
            Step(4, "bracelet", "Bracelet / clasp",   "Close-up of the clasp engravings and link finishing.",                                 Requirement.Required, 2),
            Step(5, "crown",    "Crown close-up",     "Optional: macro of the crown logo and grooves.",                                       Requirement.Optional, 1),
            Step(6, "cyclops",  "Cyclops / date window", "Optional (Rolex): date magnification and font.",                                    Requirement.Optional, 1),
        }, ct);

        await db.SaveChangesAsync(ct);
        logger?.LogInformation("DbSeeder: launch categories, products and auth steps are up to date.");
    }

    private static (int ord, string checkId, string title, string tip, Requirement req, int weight) Step(
        int ord, string checkId, string title, string tip, Requirement req, int weight)
        => (ord, checkId, title, tip, req, weight);

    private static async Task UpsertCategoryAsync(FakeCheckDbContext db, string id, string name, CancellationToken ct)
    {
        var existing = await db.Categories.FindAsync(new object?[] { id }, ct);
        if (existing is null)
        {
            db.Categories.Add(new Category { Id = id, DisplayName = name, Active = true });
        }
        else
        {
            existing.DisplayName = name;
            existing.Active = true;
        }
    }

    private static async Task UpsertProductsAsync(
        FakeCheckDbContext db,
        params (string id, string categoryId, string brand, string line, decimal fakeBar)[] products)
    {
        foreach (var p in products)
        {
            var existing = await db.Products.FindAsync(p.id);
            if (existing is null)
            {
                db.Products.Add(new Product
                {
                    Id = p.id, CategoryId = p.categoryId, Brand = p.brand, Line = p.line, FakeBar = p.fakeBar
                });
            }
            else
            {
                existing.CategoryId = p.categoryId;
                existing.Brand = p.brand;
                existing.Line = p.line;
                existing.FakeBar = p.fakeBar;
            }
        }
    }

    private static async Task UpsertStepsAsync(
        FakeCheckDbContext db,
        string categoryId,
        (int ord, string checkId, string title, string tip, Requirement req, int weight)[] steps,
        CancellationToken ct)
    {
        var existing = await db.AuthSteps
            .Where(s => s.CategoryId == categoryId)
            .ToListAsync(ct);

        foreach (var s in steps)
        {
            var match = existing.FirstOrDefault(e => e.CheckId == s.checkId);
            if (match is null)
            {
                db.AuthSteps.Add(new AuthStep
                {
                    CategoryId = categoryId,
                    Ordinal = s.ord,
                    CheckId = s.checkId,
                    InstructionTitle = s.title,
                    TipText = s.tip,
                    ReferenceImageUrl = $"{RefBase}/{categoryId}/{s.checkId}.jpg",
                    Requirement = s.req,
                    Weight = s.weight
                });
            }
            else
            {
                match.Ordinal = s.ord;
                match.InstructionTitle = s.title;
                match.TipText = s.tip;
                match.ReferenceImageUrl = $"{RefBase}/{categoryId}/{s.checkId}.jpg";
                match.Requirement = s.req;
                match.Weight = s.weight;
            }
        }
    }
}
