using FamilyTree.Api.Dtos;
using FamilyTree.Api.Services;

namespace FamilyTree.Api.Endpoints;

public static class RelationshipEndpoints
{
    public static void MapRelationshipEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/relationships").WithTags("Relationships");

        group.MapGet("/", async (RelationshipService service, CancellationToken ct) =>
            Results.Ok(await service.GetAllAsync(ct)))
            .WithName("GetRelationships");

        group.MapGet("/{id:int}", async (int id, RelationshipService service, CancellationToken ct) =>
        {
            var relationship = await service.GetByIdAsync(id, ct);
            return relationship is null ? Results.NotFound() : Results.Ok(relationship);
        })
            .WithName("GetRelationshipById");

        group.MapPost("/", async (RelationshipRequest request, RelationshipService service, CancellationToken ct) =>
        {
            var created = await service.CreateAsync(request, ct);
            return Results.Created($"/api/relationships/{created.Id}", created);
        })
            .RequireAuthorization()
            .WithName("CreateRelationship");

        group.MapPut("/{id:int}", async (int id, RelationshipRequest request, RelationshipService service, CancellationToken ct) =>
        {
            var updated = await service.UpdateAsync(id, request, ct);
            return updated is null ? Results.NotFound() : Results.Ok(updated);
        })
            .RequireAuthorization()
            .WithName("UpdateRelationship");

        group.MapDelete("/{id:int}", async (int id, RelationshipService service, CancellationToken ct) =>
        {
            var deleted = await service.DeleteAsync(id, ct);
            return deleted ? Results.NoContent() : Results.NotFound();
        })
            .RequireAuthorization()
            .WithName("DeleteRelationship");
    }
}
