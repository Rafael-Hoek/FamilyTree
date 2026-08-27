namespace FamilyTree.Api.Dtos;

public record LoginRequest(string Username, string Password);

public record LoginResponse(string Token, DateTime ExpiresAt);

public record CreateUserRequest(string Username, string Password);
