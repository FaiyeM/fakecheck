using FakeCheck.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace FakeCheck.Infrastructure.Data;

/// <summary>
/// EF Core context for FakeCheck (Postgres). Maps the spec §9.3 data model.
/// jsonb is used for <c>original_checks</c>, <c>condition_json</c>, <c>raw_model_json</c>, audit payloads.
/// </summary>
public class FakeCheckDbContext : DbContext
{
    public FakeCheckDbContext(DbContextOptions<FakeCheckDbContext> options) : base(options) { }

    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<AuthStep> AuthSteps => Set<AuthStep>();
    public DbSet<Scan> Scans => Set<Scan>();
    public DbSet<ScanPhoto> ScanPhotos => Set<ScanPhoto>();
    public DbSet<Check> Checks => Set<Check>();
    public DbSet<Verdict> Verdicts => Set<Verdict>();
    public DbSet<Correction> Corrections => Set<Correction>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        b.Entity<Category>(e =>
        {
            e.ToTable("categories");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(64);
            e.Property(x => x.DisplayName).HasMaxLength(128).IsRequired();
            e.Property(x => x.Active).HasDefaultValue(true);
        });

        b.Entity<Product>(e =>
        {
            e.ToTable("products");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(64);
            e.Property(x => x.CategoryId).HasMaxLength(64).IsRequired();
            e.Property(x => x.Brand).HasMaxLength(128).IsRequired();
            e.Property(x => x.Line).HasMaxLength(128).IsRequired();
            e.Property(x => x.FakeBar).HasColumnType("numeric(5,2)").HasDefaultValue(0m);
            e.HasOne(x => x.Category)
                .WithMany(c => c.Products)
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.CategoryId);
        });

        b.Entity<AuthStep>(e =>
        {
            e.ToTable("auth_steps");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedOnAdd();
            e.Property(x => x.CategoryId).HasMaxLength(64).IsRequired();
            e.Property(x => x.InstructionTitle).HasMaxLength(256).IsRequired();
            e.Property(x => x.TipText).HasMaxLength(512);
            e.Property(x => x.ReferenceImageUrl).HasMaxLength(512);
            e.Property(x => x.Requirement).HasConversion<string>().HasMaxLength(16);
            e.Property(x => x.ConditionJson).HasColumnType("jsonb");
            e.Property(x => x.CheckId).HasMaxLength(64).IsRequired();
            e.HasOne(x => x.Category)
                .WithMany(c => c.AuthSteps)
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.CategoryId, x.Ordinal });
        });

        b.Entity<Scan>(e =>
        {
            e.ToTable("scans");
            e.HasKey(x => x.Id);
            e.Property(x => x.DeviceId).HasMaxLength(128).IsRequired();
            e.Property(x => x.CategoryId).HasMaxLength(64).IsRequired();
            e.Property(x => x.ProductId).HasMaxLength(64);
            e.Property(x => x.Status).HasMaxLength(32);
            e.HasIndex(x => x.DeviceId);
            e.HasIndex(x => x.CreatedAt);
        });

        b.Entity<ScanPhoto>(e =>
        {
            e.ToTable("scan_photos");
            e.HasKey(x => x.Id);
            e.Property(x => x.ImageUrl).HasMaxLength(512).IsRequired();
            e.HasIndex(x => x.ScanId);
        });

        b.Entity<Check>(e =>
        {
            e.ToTable("checks");
            e.HasKey(x => x.Id);
            e.Property(x => x.CheckId).HasMaxLength(64).IsRequired();
            e.Property(x => x.Result).HasMaxLength(16);
            e.Property(x => x.Observation).HasMaxLength(1024);
            e.Property(x => x.RawModelJson).HasColumnType("jsonb");
            e.HasIndex(x => x.ScanId);
        });

        b.Entity<Verdict>(e =>
        {
            e.ToTable("verdicts");
            e.HasKey(x => x.Id);
            e.Property(x => x.Result).HasMaxLength(16);
            e.HasIndex(x => x.ScanId);
        });

        b.Entity<Correction>(e =>
        {
            e.ToTable("corrections");
            e.HasKey(x => x.Id);
            e.Property(x => x.UserCorrection).HasMaxLength(16).IsRequired();
            e.Property(x => x.Explanation).HasMaxLength(500).IsRequired();
            e.Property(x => x.SupportingImageUrls).HasColumnType("text[]");
            e.Property(x => x.OriginalVerdict).HasMaxLength(16).IsRequired();
            e.Property(x => x.ItemCategory).HasMaxLength(64).IsRequired();
            e.Property(x => x.ProductId).HasMaxLength(64);
            e.Property(x => x.OriginalChecks).HasColumnType("jsonb");
            e.Property(x => x.AllScanImageUrls).HasColumnType("text[]");
            e.Property(x => x.AppVersion).HasMaxLength(32);
            e.Property(x => x.Platform).HasMaxLength(16);
            // AI-agent filtering index per spec §8.2.
            e.HasIndex(x => new { x.ItemCategory, x.ProductId, x.UserCorrection });
        });

        b.Entity<AuditLog>(e =>
        {
            e.ToTable("audit_logs");
            e.HasKey(x => x.Id);
            e.Property(x => x.Event).HasMaxLength(64).IsRequired();
            e.Property(x => x.Payload).HasColumnType("jsonb");
            e.HasIndex(x => x.ScanId);
        });
    }
}
