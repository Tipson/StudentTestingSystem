using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Assessment.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddManualGrading : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ManualGradingRequired",
                schema: "assessment",
                table: "AttemptAnswers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TeacherComment",
                schema: "assessment",
                table: "AttemptAnswers",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ManualGradingRequired",
                schema: "assessment",
                table: "AttemptAnswers");

            migrationBuilder.DropColumn(
                name: "TeacherComment",
                schema: "assessment",
                table: "AttemptAnswers");
        }
    }
}
