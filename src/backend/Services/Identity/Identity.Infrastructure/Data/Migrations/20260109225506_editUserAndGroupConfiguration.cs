using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Identity.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class editUserAndGroupConfiguration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "identity");

            migrationBuilder.RenameTable(
                name: "Users",
                newName: "Users",
                newSchema: "identity");

            migrationBuilder.RenameTable(
                name: "Groups",
                newName: "Groups",
                newSchema: "identity");

            migrationBuilder.AddColumn<Guid>(
                name: "GroupId1",
                schema: "identity",
                table: "Users",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Code",
                schema: "identity",
                table: "Groups",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<int>(
                name: "AdmissionYear",
                schema: "identity",
                table: "Groups",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CreatedAt",
                schema: "identity",
                table: "Groups",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.CreateIndex(
                name: "IX_Users_GroupId",
                schema: "identity",
                table: "Users",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_GroupId1",
                schema: "identity",
                table: "Users",
                column: "GroupId1");

            migrationBuilder.CreateIndex(
                name: "IX_Groups_Code",
                schema: "identity",
                table: "Groups",
                column: "Code");

            migrationBuilder.CreateIndex(
                name: "IX_Groups_Institution_Specialization_AdmissionYear_GroupNumber",
                schema: "identity",
                table: "Groups",
                columns: new[] { "Institution", "Specialization", "AdmissionYear", "GroupNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Groups_IsActive_Institution_Specialization_Course_GroupNumb~",
                schema: "identity",
                table: "Groups",
                columns: new[] { "IsActive", "Institution", "Specialization", "Course", "GroupNumber" });

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Groups_GroupId",
                schema: "identity",
                table: "Users",
                column: "GroupId",
                principalSchema: "identity",
                principalTable: "Groups",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Groups_GroupId1",
                schema: "identity",
                table: "Users",
                column: "GroupId1",
                principalSchema: "identity",
                principalTable: "Groups",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Users_Groups_GroupId",
                schema: "identity",
                table: "Users");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Groups_GroupId1",
                schema: "identity",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_GroupId",
                schema: "identity",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_GroupId1",
                schema: "identity",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Groups_Code",
                schema: "identity",
                table: "Groups");

            migrationBuilder.DropIndex(
                name: "IX_Groups_Institution_Specialization_AdmissionYear_GroupNumber",
                schema: "identity",
                table: "Groups");

            migrationBuilder.DropIndex(
                name: "IX_Groups_IsActive_Institution_Specialization_Course_GroupNumb~",
                schema: "identity",
                table: "Groups");

            migrationBuilder.DropColumn(
                name: "GroupId1",
                schema: "identity",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "AdmissionYear",
                schema: "identity",
                table: "Groups");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                schema: "identity",
                table: "Groups");

            migrationBuilder.RenameTable(
                name: "Users",
                schema: "identity",
                newName: "Users");

            migrationBuilder.RenameTable(
                name: "Groups",
                schema: "identity",
                newName: "Groups");

            migrationBuilder.AlterColumn<string>(
                name: "Code",
                table: "Groups",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(64)",
                oldMaxLength: 64);
        }
    }
}
