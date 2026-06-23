using FakeCheck.Core.Abstractions;

namespace FakeCheck.Api.Dtos;

// ---- /uploads/presign ----
public sealed record PresignRequest(int Count);
public sealed record PresignItem(string Key, string Url);
public sealed record PresignResponse(IReadOnlyList<PresignItem> Uploads);

// ---- /identify ----
public sealed record IdentifyRequest(string ImageKey);
// Response reuses Core IdentificationResult.

// ---- /scans ----
public sealed record CreateScanRequest(string DeviceId, string Category, string? Product);
public sealed record CreateScanResponse(Guid ScanId);

// ---- /categories/{id}/steps ----
public sealed record StepDto(
    int Id, int Ordinal, string CheckId, string InstructionTitle, string TipText,
    string? ReferenceImageUrl, string Requirement, int Weight);

// ---- /auth/analyze (spec §9.2) ----
/// <summary>One photographed step. <c>CheckId</c> is the stable id from GET /categories/{id}/steps.</summary>
public sealed record AnalyzePhoto(string CheckId, string ImageKey);
public sealed record AnalyzeRequest(
    Guid ScanId, string ItemCategory, string? ProductId, IReadOnlyList<AnalyzePhoto> Photos);

public sealed record CheckDto(string Name, int Score, string Result, string Observation);
public sealed record AnalyzeResponse(
    string Verdict,
    double OverallConfidence,
    bool HardFailTriggered,
    bool CanProduceVerdict,
    IReadOnlyList<string> MissingRequiredSteps,
    IReadOnlyList<string> UncertainChecks,
    IReadOnlyList<string> SuggestedVerificationServices,
    IReadOnlyList<CheckDto> Checks,
    string Disclaimer);

// ---- /corrections (spec §9.3) ----
public sealed record CorrectionCheckDto(string CheckId, int Score, string Result, string Observation);
public sealed record CorrectionRequest(
    Guid ScanId,
    string UserCorrection,
    string Explanation,
    IReadOnlyList<string> SupportingImageUrls,
    string OriginalVerdict,
    double OriginalConfidence,
    string ItemCategory,
    string? ProductId,
    IReadOnlyList<CorrectionCheckDto> OriginalChecks,
    IReadOnlyList<string> AllScanImageUrls,
    string AppVersion,
    string Platform);
public sealed record OkResponse(bool Ok);
