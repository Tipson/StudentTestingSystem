using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Assessment.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTestAccessAndAvailability : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AccessType",
                schema: "assessment",
                table: "Tests",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AvailableFrom",
                schema: "assessment",
                table: "Tests",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AvailableUntil",
                schema: "assessment",
                table: "Tests",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "TestAccesses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TestId = table.Column<Guid>(type: "uuid", nullable: false),
                    GrantType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: true),
                    GroupId = table.Column<Guid>(type: "uuid", nullable: true),
                    InviteCode = table.Column<Guid>(type: "uuid", nullable: true),
                    GrantedByUserId = table.Column<string>(type: "text", nullable: false),
                    GrantedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    MaxUses = table.Column<int>(type: "integer", nullable: true),
                    UsedCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TestAccesses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TestAccesses_Tests_TestId",
                        column: x => x.TestId,
                        principalSchema: "assessment",
                        principalTable: "Tests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TestAccesses_GroupId",
                table: "TestAccesses",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_TestAccesses_InviteCode",
                table: "TestAccesses",
                column: "InviteCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TestAccesses_TestId",
                table: "TestAccesses",
                column: "TestId");

            migrationBuilder.CreateIndex(
                name: "IX_TestAccesses_TestId_GroupId",
                table: "TestAccesses",
                columns: new[] { "TestId", "GroupId" },
                unique: true,
                filter: "[GroupId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_TestAccesses_TestId_UserId",
                table: "TestAccesses",
                columns: new[] { "TestId", "UserId" },
                unique: true,
                filter: "[UserId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_TestAccesses_UserId",
                table: "TestAccesses",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TestAccesses");

            migrationBuilder.DropColumn(
                name: "AccessType",
                schema: "assessment",
                table: "Tests");

            migrationBuilder.DropColumn(
                name: "AvailableFrom",
                schema: "assessment",
                table: "Tests");

            migrationBuilder.DropColumn(
                name: "AvailableUntil",
                schema: "assessment",
                table: "Tests");
        }
    }
}
