using FamilyTree.Api.Common;
using FamilyTree.Api.Data;
using FamilyTree.Api.Dtos;
using FamilyTree.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FamilyTree.Api.Services;

public class PersonService(FamilyTreeDbContext db)
{
    public async Task<List<PersonDto>> GetAllAsync(CancellationToken ct)
    {
        return await db.People
            .OrderBy(p => p.LastName)
            .ThenBy(p => p.FirstName)
            .Select(p => ToDto(p))
            .ToListAsync(ct);
    }

    public async Task<PersonDto?> GetByIdAsync(int id, CancellationToken ct)
    {
        var person = await db.People.FindAsync([id], ct);
        return person is null ? null : ToDto(person);
    }

    public async Task<PersonDto> CreateAsync(PersonRequest request, CancellationToken ct)
    {
        await ValidateAsync(request, personId: null, ct);

        var now = DateTime.UtcNow;
        var person = new Person
        {
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            BirthLastName = request.BirthLastName?.Trim(),
            Gender = request.Gender,
            BirthDate = request.BirthDate,
            BirthPlace = request.BirthPlace?.Trim(),
            DateOfDeath = request.DateOfDeath,
            DeathPlace = request.DeathPlace?.Trim(),
            PictureUrl = request.PictureUrl?.Trim(),
            Biography = request.Biography?.Trim(),
            Parent1Id = request.Parent1Id,
            Parent2Id = request.Parent2Id,
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.People.Add(person);
        await db.SaveChangesAsync(ct);

        return ToDto(person);
    }

    public async Task<PersonDto?> UpdateAsync(int id, PersonRequest request, CancellationToken ct)
    {
        var person = await db.People.FindAsync([id], ct);
        if (person is null)
        {
            return null;
        }

        await ValidateAsync(request, personId: id, ct);

        person.FirstName = request.FirstName.Trim();
        person.LastName = request.LastName.Trim();
        person.BirthLastName = request.BirthLastName?.Trim();
        person.Gender = request.Gender;
        person.BirthDate = request.BirthDate;
        person.BirthPlace = request.BirthPlace?.Trim();
        person.DateOfDeath = request.DateOfDeath;
        person.DeathPlace = request.DeathPlace?.Trim();
        person.PictureUrl = request.PictureUrl?.Trim();
        person.Biography = request.Biography?.Trim();
        person.Parent1Id = request.Parent1Id;
        person.Parent2Id = request.Parent2Id;
        person.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        return ToDto(person);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct)
    {
        var person = await db.People.FindAsync([id], ct);
        if (person is null)
        {
            return false;
        }

        db.People.Remove(person);
        await db.SaveChangesAsync(ct);
        return true;
    }

    private async Task ValidateAsync(PersonRequest request, int? personId, CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.FirstName))
        {
            errors[nameof(request.FirstName)] = ["First name is required."];
        }

        if (string.IsNullOrWhiteSpace(request.LastName))
        {
            errors[nameof(request.LastName)] = ["Last name is required."];
        }

        if (request.BirthDate is { } birthDate && birthDate > DateOnly.FromDateTime(DateTime.UtcNow))
        {
            errors[nameof(request.BirthDate)] = ["Birth date cannot be in the future."];
        }

        if (request.DateOfDeath is { } dateOfDeath)
        {
            if (dateOfDeath > DateOnly.FromDateTime(DateTime.UtcNow))
            {
                errors[nameof(request.DateOfDeath)] = ["Date of death cannot be in the future."];
            }
            else if (request.BirthDate is { } birth && dateOfDeath < birth)
            {
                errors[nameof(request.DateOfDeath)] = ["Date of death cannot be before the birth date."];
            }
        }

        if (request.Parent1Id is { } parent1Id)
        {
            if (parent1Id == personId)
            {
                errors[nameof(request.Parent1Id)] = ["A person cannot be their own parent."];
            }
            else if (!await db.People.AnyAsync(p => p.Id == parent1Id, ct))
            {
                errors[nameof(request.Parent1Id)] = ["Parent1 does not reference an existing person."];
            }
            else if (personId is { } id1 && await CreatesCycleAsync(id1, parent1Id, ct))
            {
                errors[nameof(request.Parent1Id)] = ["Parent1 is a descendant of this person — that would create a cycle."];
            }
        }

        if (request.Parent2Id is { } parent2Id)
        {
            if (parent2Id == personId)
            {
                errors[nameof(request.Parent2Id)] = ["A person cannot be their own parent."];
            }
            else if (!await db.People.AnyAsync(p => p.Id == parent2Id, ct))
            {
                errors[nameof(request.Parent2Id)] = ["Parent2 does not reference an existing person."];
            }
            else if (personId is { } id2 && await CreatesCycleAsync(id2, parent2Id, ct))
            {
                errors[nameof(request.Parent2Id)] = ["Parent2 is a descendant of this person — that would create a cycle."];
            }
        }

        if (request.Parent1Id is not null && request.Parent1Id == request.Parent2Id)
        {
            errors[nameof(request.Parent2Id)] = ["Parent1 and Parent2 must be different people."];
        }

        if (errors.Count > 0)
        {
            throw new ValidationException(errors);
        }
    }

    // True if candidateParentId is already a descendant of personId — i.e. making
    // candidateParentId a parent of personId would create a cycle in the family graph.
    // Walks upward from candidateParentId through both parent branches, looking for personId.
    private async Task<bool> CreatesCycleAsync(int personId, int candidateParentId, CancellationToken ct)
    {
        var toVisit = new Queue<int>();
        var visited = new HashSet<int> { candidateParentId };
        toVisit.Enqueue(candidateParentId);

        while (toVisit.Count > 0)
        {
            var currentId = toVisit.Dequeue();
            if (currentId == personId)
            {
                return true;
            }

            var current = await db.People
                .Where(p => p.Id == currentId)
                .Select(p => new { p.Parent1Id, p.Parent2Id })
                .FirstOrDefaultAsync(ct);

            if (current is null)
            {
                continue;
            }

            foreach (var parentId in new[] { current.Parent1Id, current.Parent2Id })
            {
                if (parentId is { } id && visited.Add(id))
                {
                    toVisit.Enqueue(id);
                }
            }
        }

        return false;
    }

    private static PersonDto ToDto(Person p) => new(
        p.Id,
        p.FirstName,
        p.LastName,
        p.BirthLastName,
        p.Gender,
        p.BirthDate,
        p.BirthPlace,
        p.DateOfDeath,
        p.DeathPlace,
        p.PictureUrl,
        p.Biography,
        p.Parent1Id,
        p.Parent2Id,
        p.CreatedAt,
        p.UpdatedAt
    );
}
