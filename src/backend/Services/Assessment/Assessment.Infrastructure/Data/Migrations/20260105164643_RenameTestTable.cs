using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Assessment.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RenameTestTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Questions_tests_TestId",
                schema: "assessment",
                table: "Questions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_tests",
                schema: "assessment",
                table: "tests");

            migrationBuilder.RenameTable(
                name: "tests",
                schema: "assessment",
                newName: "Tests",
                newSchema: "assessment");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Tests",
                schema: "assessment",
                table: "Tests",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Questions_Tests_TestId",
                schema: "assessment",
                table: "Questions",
                column: "TestId",
                principalSchema: "assessment",
                principalTable: "Tests",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Questions_Tests_TestId",
                schema: "assessment",
                table: "Questions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Tests",
                schema: "assessment",
                table: "Tests");

            migrationBuilder.RenameTable(
                name: "Tests",
                schema: "assessment",
                newName: "tests",
                newSchema: "assessment");

            migrationBuilder.AddPrimaryKey(
                name: "PK_tests",
                schema: "assessment",
                table: "tests",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Questions_tests_TestId",
                schema: "assessment",
                table: "Questions",
                column: "TestId",
                principalSchema: "assessment",
                principalTable: "tests",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
