using FakeCheck.Api.Dtos;
using FluentValidation;

namespace FakeCheck.Api.Validation;

public sealed class PresignRequestValidator : AbstractValidator<PresignRequest>
{
    public PresignRequestValidator()
    {
        RuleFor(x => x.Count).InclusiveBetween(1, 12);
    }
}

public sealed class IdentifyRequestValidator : AbstractValidator<IdentifyRequest>
{
    public IdentifyRequestValidator()
    {
        RuleFor(x => x.ImageKey).NotEmpty().MaximumLength(512);
    }
}

public sealed class CreateScanRequestValidator : AbstractValidator<CreateScanRequest>
{
    private static readonly string[] Categories = { "sneaker", "handbag", "pokemon", "watch" };

    public CreateScanRequestValidator()
    {
        RuleFor(x => x.DeviceId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.Category).NotEmpty().Must(c => Categories.Contains(c))
            .WithMessage("Category must be one of: sneaker, handbag, pokemon, watch.");
        RuleFor(x => x.Product).MaximumLength(64);
    }
}

public sealed class AnalyzeRequestValidator : AbstractValidator<AnalyzeRequest>
{
    public AnalyzeRequestValidator()
    {
        RuleFor(x => x.ScanId).NotEmpty();
        RuleFor(x => x.ItemCategory).NotEmpty().MaximumLength(64);
        RuleFor(x => x.Photos).NotEmpty().WithMessage("At least one photo is required.");
        RuleForEach(x => x.Photos).ChildRules(p =>
        {
            p.RuleFor(x => x.CheckId).NotEmpty().MaximumLength(64);
            p.RuleFor(x => x.ImageKey).NotEmpty().MaximumLength(512);
        });
    }
}

public sealed class CorrectionRequestValidator : AbstractValidator<CorrectionRequest>
{
    private static readonly string[] UserCorrections = { "authentic", "counterfeit", "unknown" };
    private static readonly string[] Platforms = { "ios", "android" };

    public CorrectionRequestValidator()
    {
        RuleFor(x => x.ScanId).NotEmpty();
        RuleFor(x => x.UserCorrection).Must(c => UserCorrections.Contains(c))
            .WithMessage("user_correction must be authentic, counterfeit, or unknown.");
        RuleFor(x => x.Explanation).NotEmpty().MinimumLength(20).MaximumLength(500);
        RuleFor(x => x.OriginalVerdict).NotEmpty().MaximumLength(16);
        RuleFor(x => x.ItemCategory).NotEmpty().MaximumLength(64);
        RuleFor(x => x.SupportingImageUrls).Must(u => u.Count <= 3)
            .WithMessage("Up to 3 supporting photos are allowed.");
        RuleFor(x => x.AppVersion).NotEmpty().MaximumLength(32);
        RuleFor(x => x.Platform).Must(p => Platforms.Contains(p))
            .WithMessage("platform must be ios or android.");
    }
}
