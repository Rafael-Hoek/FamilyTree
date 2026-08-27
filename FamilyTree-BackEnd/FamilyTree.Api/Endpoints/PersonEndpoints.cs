using FamilyTree.Api.Dtos;
using FamilyTree.Api.Services;

namespace FamilyTree.Api.Endpoints;

public static class PersonEndpoints
{
    public static void MapPersonEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/people").WithTags("People");

        group.MapGet("/", async (PersonService service, CancellationToken ct) =>
            Results.Ok(await service.GetAllAsync(ct)))
            .WithName("GetPeople");

        group.MapGet("/{id:int}", async (int id, PersonService service, CancellationToken ct) =>
        {
            var person = await service.GetByIdAsync(id, ct);
            return person is null ? Results.NotFound() : Results.Ok(person);
        })
            .WithName("GetPersonById");

        group.MapPost("/", async (PersonRequest request, PersonService service, CancellationToken ct) =>
        {
            var created = await service.CreateAsync(request, ct);
            return Results.Created($"/api/people/{created.Id}", created);
        })
            .RequireAuthorization()
            .WithName("CreatePerson");

        group.MapPut("/{id:int}", async (int id, PersonRequest request, PersonService service, CancellationToken ct) =>
        {
            var updated = await service.UpdateAsync(id, request, ct);
            return updated is null ? Results.NotFound() : Results.Ok(updated);
        })
            .RequireAuthorization()
            .WithName("UpdatePerson");

        group.MapDelete("/{id:int}", async (int id, PersonService service, CancellationToken ct) =>
        {
            var deleted = await service.DeleteAsync(id, ct);
            return deleted ? Results.NoContent() : Results.NotFound();
        })
            .RequireAuthorization()
            .WithName("DeletePerson");
    }
}
