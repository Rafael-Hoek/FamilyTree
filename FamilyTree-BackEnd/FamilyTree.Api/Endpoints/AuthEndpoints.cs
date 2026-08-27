using FamilyTree.Api.Dtos;
using FamilyTree.Api.Services;

namespace FamilyTree.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/login", async (LoginRequest request, AuthService service, CancellationToken ct) =>
        {
            var result = await service.LoginAsync(request, ct);
            return result is null ? Results.Unauthorized() : Results.Ok(result);
        })
            .WithName("Login");

        // Authenticated-only: bootstraps the very first account by seeding it directly
        // in the database (see project notes); this endpoint only lets an already
        // logged-in user create additional accounts.
        group.MapPost("/users", async (CreateUserRequest request, AuthService service, CancellationToken ct) =>
        {
            await service.CreateUserAsync(request, ct);
            return Results.Created();
        })
            .RequireAuthorization()
            .WithName("CreateUser");
    }
}
