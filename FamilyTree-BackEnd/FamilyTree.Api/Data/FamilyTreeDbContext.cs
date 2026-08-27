using FamilyTree.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FamilyTree.Api.Data;

public class FamilyTreeDbContext(DbContextOptions<FamilyTreeDbContext> options) : DbContext(options)
{
    public DbSet<Person> People => Set<Person>();

    public DbSet<Relationship> Relationships => Set<Relationship>();

    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(FamilyTreeDbContext).Assembly);
    }
}
