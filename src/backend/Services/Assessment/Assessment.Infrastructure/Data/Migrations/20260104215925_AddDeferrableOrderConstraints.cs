using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Assessment.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDeferrableOrderConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                                 ALTER TABLE assessment."Questions"
                                 ADD CONSTRAINT "UQ_Questions_TestId_Order"
                                 UNIQUE ("TestId", "Order")
                                 DEFERRABLE INITIALLY DEFERRED;
                                 """);

            migrationBuilder.Sql("""
                                 ALTER TABLE assessment."QuestionOptions"
                                 ADD CONSTRAINT "UQ_QuestionOptions_QuestionId_Order"
                                 UNIQUE ("QuestionId", "Order")
                                 DEFERRABLE INITIALLY DEFERRED;
                                 """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                                 ALTER TABLE assessment."Questions"
                                 DROP CONSTRAINT IF EXISTS "UQ_Questions_TestId_Order";
                                 """);

            migrationBuilder.Sql("""
                                 ALTER TABLE assessment."QuestionOptions"
                                 DROP CONSTRAINT IF EXISTS "UQ_QuestionOptions_QuestionId_Order";
                                 """);
        }
    }
}