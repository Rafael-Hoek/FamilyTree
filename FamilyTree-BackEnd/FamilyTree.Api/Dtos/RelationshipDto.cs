using FamilyTree.Api.Models;

namespace FamilyTree.Api.Dtos;

public record RelationshipDto(
    int Id,
    int Person1Id,
    int Person2Id,
    RelationshipType Type,
    DateOnly? StartDate,
    DateOnly? EndDate,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

// Used for both create (POST) and update (PUT) — the shape is identical, only the route differs.
public record RelationshipRequest(
    int Person1Id,
    int Person2Id,
    RelationshipType Type,
    DateOnly? StartDate,
    DateOnly? EndDate
);
