using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Assessment.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class addTestAndAttemptIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Attempts_TestId",
                schema: "assessment",
                table: "Attempts");

            migrationBuilder.DropIndex(
                name: "IX_Attempts_UserId",
                schema: "assessment",
                table: "Attempts");

            migrationBuilder.CreateIndex(
                name: "IX_Tests_OwnerUserId_CreatedAt",
                schema: "assessment",
                table: "Tests",
                columns: new[] { "OwnerUserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Tests_Status_AccessType_UpdatedAt",
                schema: "assessment",
                table: "Tests",
                columns: new[] { "Status", "AccessType", "UpdatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Tests_Status_CreatedAt",
                schema: "assessment",
                table: "Tests",
                columns: new[] { "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Attempts_TestId_StartedAt",
                schema: "assessment",
                table: "Attempts",
                columns: new[] { "TestId", "StartedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Attempts_UserId_StartedAt",
                schema: "assessment",
                table: "Attempts",
                columns: new[] { "UserId", "StartedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Tests_OwnerUserId_CreatedAt",
                schema: "assessment",
                table: "Tests");

            migrationBuilder.DropIndex(
                name: "IX_Tests_Status_AccessType_UpdatedAt",
                schema: "assessment",
                table: "Tests");

            migrationBuilder.DropIndex(
                name: "IX_Tests_Status_CreatedAt",
                schema: "assessment",
                table: "Tests");

            migrationBuilder.DropIndex(
                name: "IX_Attempts_TestId_StartedAt",
                schema: "assessment",
                table: "Attempts");

            migrationBuilder.DropIndex(
                name: "IX_Attempts_UserId_StartedAt",
                schema: "assessment",
                table: "Attempts");

            migrationBuilder.CreateIndex(
                name: "IX_Attempts_TestId",
                schema: "assessment",
                table: "Attempts",
                column: "TestId");

            migrationBuilder.CreateIndex(
                name: "IX_Attempts_UserId",
                schema: "assessment",
                table: "Attempts",
                column: "UserId");
        }
    }
}
