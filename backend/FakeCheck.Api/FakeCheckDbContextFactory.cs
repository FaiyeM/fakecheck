using FakeCheck.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace FakeCheck.Api;

/// <summary>
/// Design-time factory used by <c>dotnet ef</c> so the EF tools build the model
/// without booting the API host (which runs the migrate-on-startup block in
/// <c>Program.cs</c>). Migration generation does not connect to the database;
/// the connection string here is only a placeholder. Override it for design-time
/// DB commands via the <c>FAKECHECK_DESIGN_TIME_CONNECTION</c> environment variable.
/// </summary>
public class FakeCheckDbContextFactory : IDesignTimeDbContextFactory<FakeCheckDbContext>
{
    public FakeCheckDbContext CreateDbContext(string[] args)
    {
        var connectionString =
            Environment.GetEnvironmentVariable("FAKECHECK_DESIGN_TIME_CONNECTION")
            ?? "Host=localhost;Port=5432;Database=fakecheck;Username=postgres;Password=dev";

        var options = new DbContextOptionsBuilder<FakeCheckDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new FakeCheckDbContext(options);
    }
}
