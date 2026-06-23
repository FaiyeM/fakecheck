namespace FakeCheck.Core.Authentication;

/// <summary>Result of a single authentication check.</summary>
public enum CheckResult
{
    Pass,
    Fail,
    Inconclusive
}

/// <summary>Overall verdict for a scan (spec §4.6, §7.2).</summary>
public enum VerdictKind
{
    Authentic,
    Counterfeit,
    Inconclusive
}
