namespace FamilyTree.Api.Models;

public class Relationship
{
    public int Id { get; set; }

    public int Person1Id { get; set; }

    public Person Person1 { get; set; } = null!;

    public int Person2Id { get; set; }

    public Person Person2 { get; set; } = null!;

    public required RelationshipType Type { get; set; }

    public DateOnly? StartDate { get; set; }

    public DateOnly? EndDate { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
