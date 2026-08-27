using FamilyTree.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FamilyTree.Api.Data.Configurations;

public class PersonConfiguration : IEntityTypeConfiguration<Person>
{
    public void Configure(EntityTypeBuilder<Person> builder)
    {
        builder.Property(p => p.FirstName).IsRequired().HasMaxLength(200);
        builder.Property(p => p.LastName).IsRequired().HasMaxLength(200);
        builder.Property(p => p.BirthLastName).HasMaxLength(200);
        builder.Property(p => p.BirthPlace).HasMaxLength(300);
        builder.Property(p => p.DeathPlace).HasMaxLength(300);
        builder.Property(p => p.PictureUrl).HasMaxLength(2000);

        builder.Property(p => p.Gender).HasConversion<string>().HasMaxLength(20);

        builder
            .HasOne(p => p.Parent1)
            .WithMany(p => p.ChildrenAsParent1)
            .HasForeignKey(p => p.Parent1Id)
            .OnDelete(DeleteBehavior.SetNull);

        builder
            .HasOne(p => p.Parent2)
            .WithMany(p => p.ChildrenAsParent2)
            .HasForeignKey(p => p.Parent2Id)
            .OnDelete(DeleteBehavior.SetNull);

        builder.ToTable(t => t.HasCheckConstraint(
            "CK_Person_ParentsDistinct",
            "\"Parent1Id\" IS NULL OR \"Parent2Id\" IS NULL OR \"Parent1Id\" <> \"Parent2Id\""));

        builder.ToTable(t => t.HasCheckConstraint(
            "CK_Person_NotOwnParent",
            "\"Parent1Id\" <> \"Id\" AND \"Parent2Id\" <> \"Id\""));
    }
}
