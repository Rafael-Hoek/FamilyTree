namespace FamilyTree.Api.Models;

public class Person
{
    public int Id { get; set; }

    public required string FirstName { get; set; }

    public required string LastName { get; set; }

    public string? BirthLastName { get; set; }

    public Gender? Gender { get; set; }

    public DateOnly? BirthDate { get; set; }

    public string? BirthPlace { get; set; }

    public DateOnly? DateOfDeath { get; set; }

    public string? DeathPlace { get; set; }

    public string? PictureUrl { get; set; }

    public string? Biography { get; set; }

    public int? Parent1Id { get; set; }

    public Person? Parent1 { get; set; }

    public int? Parent2Id { get; set; }

    public Person? Parent2 { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public ICollection<Person> ChildrenAsParent1 { get; set; } = new List<Person>();

    public ICollection<Person> ChildrenAsParent2 { get; set; } = new List<Person>();

    public ICollection<Relationship> RelationshipsAsPerson1 { get; set; } = new List<Relationship>();

    public ICollection<Relationship> RelationshipsAsPerson2 { get; set; } = new List<Relationship>();
}
