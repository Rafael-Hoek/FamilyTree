using FamilyTree.Api.Models;

namespace FamilyTree.Api.Dtos;

public record PersonDto(
    int Id,
    string FirstName,
    string LastName,
    string? BirthLastName,
    Gender? Gender,
    DateOnly? BirthDate,
    string? BirthPlace,
    DateOnly? DateOfDeath,
    string? DeathPlace,
    string? PictureUrl,
    string? Biography,
    int? Parent1Id,
    int? Parent2Id,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

// Used for both create (POST) and update (PUT) — the shape is identical, only the route differs.
public record PersonRequest(
    string FirstName,
    string LastName,
    string? BirthLastName,
    Gender? Gender,
    DateOnly? BirthDate,
    string? BirthPlace,
    DateOnly? DateOfDeath,
    string? DeathPlace,
    string? PictureUrl,
    string? Biography,
    int? Parent1Id,
    int? Parent2Id
);
