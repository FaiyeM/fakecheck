using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FakeCheck.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "audit_logs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ScanId = table.Column<Guid>(type: "uuid", nullable: true),
                    Event = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Payload = table.Column<string>(type: "jsonb", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_logs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "categories",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "corrections",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ScanId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserCorrection = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Explanation = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    SupportingImageUrls = table.Column<List<string>>(type: "text[]", nullable: false),
                    OriginalVerdict = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    OriginalConfidence = table.Column<double>(type: "double precision", nullable: false),
                    ItemCategory = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ProductId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    OriginalChecks = table.Column<string>(type: "jsonb", nullable: false),
                    AllScanImageUrls = table.Column<List<string>>(type: "text[]", nullable: false),
                    SubmittedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    AppVersion = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Platform = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_corrections", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "scans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DeviceId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    CategoryId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ProductId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    IdentifiedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_scans", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "verdicts",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ScanId = table.Column<Guid>(type: "uuid", nullable: false),
                    Result = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    OverallConfidence = table.Column<double>(type: "double precision", nullable: false),
                    HardFailTriggered = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_verdicts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "auth_steps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CategoryId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Ordinal = table.Column<int>(type: "integer", nullable: false),
                    InstructionTitle = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    TipText = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    ReferenceImageUrl = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    Requirement = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    ConditionJson = table.Column<string>(type: "jsonb", nullable: true),
                    CheckId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Weight = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_auth_steps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_auth_steps_categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "products",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    CategoryId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Brand = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Line = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    FakeBar = table.Column<decimal>(type: "numeric(5,2)", nullable: false, defaultValue: 0m)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_products", x => x.Id);
                    table.ForeignKey(
                        name: "FK_products_categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "checks",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ScanId = table.Column<Guid>(type: "uuid", nullable: false),
                    CheckId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Score = table.Column<int>(type: "integer", nullable: false),
                    Result = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Observation = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                    RawModelJson = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_checks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_checks_scans_ScanId",
                        column: x => x.ScanId,
                        principalTable: "scans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "scan_photos",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ScanId = table.Column<Guid>(type: "uuid", nullable: false),
                    StepId = table.Column<int>(type: "integer", nullable: true),
                    ImageUrl = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    BlurScore = table.Column<double>(type: "double precision", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_scan_photos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_scan_photos_scans_ScanId",
                        column: x => x.ScanId,
                        principalTable: "scans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_ScanId",
                table: "audit_logs",
                column: "ScanId");

            migrationBuilder.CreateIndex(
                name: "IX_auth_steps_CategoryId_Ordinal",
                table: "auth_steps",
                columns: new[] { "CategoryId", "Ordinal" });

            migrationBuilder.CreateIndex(
                name: "IX_checks_ScanId",
                table: "checks",
                column: "ScanId");

            migrationBuilder.CreateIndex(
                name: "IX_corrections_ItemCategory_ProductId_UserCorrection",
                table: "corrections",
                columns: new[] { "ItemCategory", "ProductId", "UserCorrection" });

            migrationBuilder.CreateIndex(
                name: "IX_products_CategoryId",
                table: "products",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_scan_photos_ScanId",
                table: "scan_photos",
                column: "ScanId");

            migrationBuilder.CreateIndex(
                name: "IX_scans_CreatedAt",
                table: "scans",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_scans_DeviceId",
                table: "scans",
                column: "DeviceId");

            migrationBuilder.CreateIndex(
                name: "IX_verdicts_ScanId",
                table: "verdicts",
                column: "ScanId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "audit_logs");

            migrationBuilder.DropTable(
                name: "auth_steps");

            migrationBuilder.DropTable(
                name: "checks");

            migrationBuilder.DropTable(
                name: "corrections");

            migrationBuilder.DropTable(
                name: "products");

            migrationBuilder.DropTable(
                name: "scan_photos");

            migrationBuilder.DropTable(
                name: "verdicts");

            migrationBuilder.DropTable(
                name: "categories");

            migrationBuilder.DropTable(
                name: "scans");
        }
    }
}
