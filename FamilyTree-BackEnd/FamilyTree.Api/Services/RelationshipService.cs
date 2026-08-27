using FamilyTree.Api.Common;
using FamilyTree.Api.Data;
using FamilyTree.Api.Dtos;
using FamilyTree.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FamilyTree.Api.Services;

public class RelationshipService(FamilyTreeDbContext db)
{
    public async Task<List<RelationshipDto>> GetAllAsync(CancellationToken ct)
    {
        return await db.Relationships
            .OrderBy(r => r.Id)
            .Select(r => ToDto(r))
            .ToListAsync(ct);
    }

    public async Task<RelationshipDto?> GetByIdAsync(int id, CancellationToken ct)
    {
        var relationship = await db.Relationships.FindAsync([id], ct);
        return relationship is null ? null : ToDto(relationship);
    }

    public async Task<RelationshipDto> CreateAsync(RelationshipRequest request, CancellationToken ct)
    {
        await ValidateAsync(request, ct);

        var now = DateTime.UtcNow;
        var relationship = new Relationship
        {
            Person1Id = request.Person1Id,
            Person2Id = request.Person2Id,
            Type = request.Type,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.Relationships.Add(relationship);
        await db.SaveChangesAsync(ct);

        return ToDto(relationship);
    }

    public async Task<RelationshipDto?> UpdateAsync(int id, RelationshipRequest request, CancellationToken ct)
    {
        var relationship = await db.Relationships.FindAsync([id], ct);
        if (relationship is null)
        {
            return null;
        }

        await ValidateAsync(request, ct);

        relationship.Person1Id = request.Person1Id;
        relationship.Person2Id = request.Person2Id;
        relationship.Type = request.Type;
        relationship.StartDate = request.StartDate;
        relationship.EndDate = request.EndDate;
        relationship.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        return ToDto(relationship);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct)
    {
        var relationship = await db.Relationships.FindAsync([id], ct);
        if (relationship is null)
        {
            return false;
        }

        db.Relationships.Remove(relationship);
        await db.SaveChangesAsync(ct);
        return true;
    }

    private async Task ValidateAsync(RelationshipRequest request, CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();

        if (request.Person1Id == request.Person2Id)
        {
            errors[nameof(request.Person2Id)] = ["Person1 and Person2 must be different people."];
        }
        else
        {
            if (!await db.People.AnyAsync(p => p.Id == request.Person1Id, ct))
            {
                errors[nameof(request.Person1Id)] = ["Person1 does not reference an existing person."];
            }

            if (!await db.People.AnyAsync(p => p.Id == request.Person2Id, ct))
            {
                errors[nameof(request.Person2Id)] = ["Person2 does not reference an existing person."];
            }
        }

        if (request.StartDate is { } start && request.EndDate is { } end && end < start)
        {
            errors[nameof(request.EndDate)] = ["End date cannot be before the start date."];
        }

        if (errors.Count > 0)
        {
            throw new ValidationException(errors);
        }
    }

    private static RelationshipDto ToDto(Relationship r) => new(
        r.Id,
        r.Person1Id,
        r.Person2Id,
        r.Type,
        r.StartDate,
        r.EndDate,
        r.CreatedAt,
        r.UpdatedAt
    );
}
