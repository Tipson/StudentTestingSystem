using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Assessment.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAIConfidenceToAttemptAnswer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "TeacherComment",
                schema: "assessment",
                table: "AttemptAnswers",
                newName: "Feedback");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Feedback",
                schema: "assessment",
                table: "AttemptAnswers",
                newName: "TeacherComment");
        }
    }
}
