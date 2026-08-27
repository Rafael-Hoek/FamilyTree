using FamilyTree.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FamilyTree.Api.Data.Configurations;

public class RelationshipConfiguration : IEntityTypeConfiguration<Relationship>
{
    public void Configure(EntityTypeBuilder<Relationship> builder)
    {
        builder.Property(r => r.Type).IsRequired().HasConversion<string>().HasMaxLength(20);

        builder
            .HasOne(r => r.Person1)
            .WithMany(p => p.RelationshipsAsPerson1)
            .HasForeignKey(r => r.Person1Id)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(r => r.Person2)
            .WithMany(p => p.RelationshipsAsPerson2)
            .HasForeignKey(r => r.Person2Id)
            .OnDelete(DeleteBehavior.Cascade);

        builder.ToTable(t => t.HasCheckConstraint(
            "CK_Relationship_DistinctPeople",
            "\"Person1Id\" <> \"Person2Id\""));
    }
}
