using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FamilyTree.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "People",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FirstName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    LastName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BirthLastName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Gender = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    BirthDate = table.Column<DateOnly>(type: "date", nullable: true),
                    BirthPlace = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    DateOfDeath = table.Column<DateOnly>(type: "date", nullable: true),
                    DeathPlace = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    PictureUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Biography = table.Column<string>(type: "text", nullable: true),
                    Parent1Id = table.Column<int>(type: "integer", nullable: true),
                    Parent2Id = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_People", x => x.Id);
                    table.CheckConstraint("CK_Person_NotOwnParent", "\"Parent1Id\" <> \"Id\" AND \"Parent2Id\" <> \"Id\"");
                    table.CheckConstraint("CK_Person_ParentsDistinct", "\"Parent1Id\" IS NULL OR \"Parent2Id\" IS NULL OR \"Parent1Id\" <> \"Parent2Id\"");
                    table.ForeignKey(
                        name: "FK_People_People_Parent1Id",
                        column: x => x.Parent1Id,
                        principalTable: "People",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_People_People_Parent2Id",
                        column: x => x.Parent2Id,
                        principalTable: "People",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Relationships",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Person1Id = table.Column<int>(type: "integer", nullable: false),
                    Person2Id = table.Column<int>(type: "integer", nullable: false),
                    Type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: true),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Relationships", x => x.Id);
                    table.CheckConstraint("CK_Relationship_DistinctPeople", "\"Person1Id\" <> \"Person2Id\"");
                    table.ForeignKey(
                        name: "FK_Relationships_People_Person1Id",
                        column: x => x.Person1Id,
                        principalTable: "People",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Relationships_People_Person2Id",
                        column: x => x.Person2Id,
                        principalTable: "People",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_People_Parent1Id",
                table: "People",
                column: "Parent1Id");

            migrationBuilder.CreateIndex(
                name: "IX_People_Parent2Id",
                table: "People",
                column: "Parent2Id");

            migrationBuilder.CreateIndex(
                name: "IX_Relationships_Person1Id",
                table: "Relationships",
                column: "Person1Id");

            migrationBuilder.CreateIndex(
                name: "IX_Relationships_Person2Id",
                table: "Relationships",
                column: "Person2Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Relationships");

            migrationBuilder.DropTable(
                name: "People");
        }
    }
}
