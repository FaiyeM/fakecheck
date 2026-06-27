using FakeCheck.Core.Security;
using Xunit;

namespace FakeCheck.Tests;

public class ScanOwnershipTests
{
    [Fact]
    public void Matching_device_id_is_ok()
        => Assert.Equal(OwnershipResult.Ok, ScanOwnership.Check("device-abc", "device-abc"));

    [Fact]
    public void Different_device_id_is_owner_mismatch()
        => Assert.Equal(OwnershipResult.OwnerMismatch, ScanOwnership.Check("device-abc", "device-xyz"));

    [Fact]
    public void Comparison_is_case_sensitive()
        => Assert.Equal(OwnershipResult.OwnerMismatch, ScanOwnership.Check("Device-ABC", "device-abc"));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Missing_request_device_id_is_rejected(string? requestDeviceId)
        => Assert.Equal(OwnershipResult.MissingDeviceId, ScanOwnership.Check(requestDeviceId, "device-abc"));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void Missing_scan_owner_is_scan_not_found(string? scanOwnerDeviceId)
        => Assert.Equal(OwnershipResult.ScanNotFound, ScanOwnership.Check("device-abc", scanOwnerDeviceId));

    [Fact]
    public void Missing_device_id_takes_precedence_over_missing_scan()
        => Assert.Equal(OwnershipResult.MissingDeviceId, ScanOwnership.Check(null, null));
}
