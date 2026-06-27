namespace FakeCheck.Core.Security;

/// <summary>Outcome of checking that a request owns the scan it is acting on (spec §9 / §1.1).</summary>
public enum OwnershipResult
{
    /// <summary>Caller's device id matches the scan owner — proceed.</summary>
    Ok,
    /// <summary>No device id was supplied on the request.</summary>
    MissingDeviceId,
    /// <summary>No scan exists for the supplied id.</summary>
    ScanNotFound,
    /// <summary>The scan exists but belongs to a different device.</summary>
    OwnerMismatch
}

/// <summary>
/// Pure ownership guard: a scan may only be analyzed or disputed by the device that created it
/// (spec §1.1). Kept side-effect-free and unit-tested; controllers map the result to a status code.
/// </summary>
public static class ScanOwnership
{
    /// <param name="requestDeviceId">The caller's <c>X-Device-Id</c> header value (may be null/blank).</param>
    /// <param name="scanOwnerDeviceId">The owning scan's device id, or <c>null</c> when the scan is missing.</param>
    public static OwnershipResult Check(string? requestDeviceId, string? scanOwnerDeviceId)
    {
        if (string.IsNullOrWhiteSpace(requestDeviceId)) return OwnershipResult.MissingDeviceId;
        if (string.IsNullOrWhiteSpace(scanOwnerDeviceId)) return OwnershipResult.ScanNotFound;
        return string.Equals(requestDeviceId, scanOwnerDeviceId, StringComparison.Ordinal)
            ? OwnershipResult.Ok
            : OwnershipResult.OwnerMismatch;
    }
}
