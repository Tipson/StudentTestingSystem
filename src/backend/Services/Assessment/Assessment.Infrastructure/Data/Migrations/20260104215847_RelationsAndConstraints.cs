using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Assessment.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RelationsAndConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Questions_TestId_Order",
                schema: "assessment",
                table: "Questions");

            migrationBuilder.DropIndex(
                name: "IX_QuestionOptions_QuestionId_Order",
                schema: "assessment",
                table: "QuestionOptions");

            migrationBuilder.CreateIndex(
                name: "IX_Questions_TestId",
                schema: "assessment",
                table: "Questions",
                column: "TestId");

            migrationBuilder.CreateIndex(
                name: "IX_QuestionOptions_QuestionId",
                schema: "assessment",
                table: "QuestionOptions",
                column: "QuestionId");

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Questions_TestId",
                schema: "assessment",
                table: "Questions");

            migrationBuilder.DropIndex(
                name: "IX_QuestionOptions_QuestionId",
                schema: "assessment",
                table: "QuestionOptions");

            migrationBuilder.DropIndex(
                name: "IX_Attempts_TestId",
                schema: "assessment",
                table: "Attempts");

            migrationBuilder.DropIndex(
                name: "IX_Attempts_UserId",
                schema: "assessment",
                table: "Attempts");

            migrationBuilder.CreateIndex(
                name: "IX_Questions_TestId_Order",
                schema: "assessment",
                table: "Questions",
                columns: new[] { "TestId", "Order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_QuestionOptions_QuestionId_Order",
                schema: "assessment",
                table: "QuestionOptions",
                columns: new[] { "QuestionId", "Order" },
                unique: true);
        }
    }
}
