using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FamilyTree.Api.Common;
using FamilyTree.Api.Data;
using FamilyTree.Api.Dtos;
using FamilyTree.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace FamilyTree.Api.Services;

public class AuthService(FamilyTreeDbContext db, IConfiguration config)
{
    public async Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        var user = await db.Users.FindAsync([request.Username], ct);
        if (user is null || !PasswordHasher.Verify(request.Password, user.PasswordHash, user.PasswordSalt))
        {
            return null;
        }

        var expiresAt = DateTime.UtcNow.AddHours(24);
        var token = GenerateToken(user.Username, user.IsAdmin, expiresAt);
        return new LoginResponse(token, expiresAt);
    }

    public async Task CreateUserAsync(CreateUserRequest request, CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.Username))
        {
            errors[nameof(request.Username)] = ["Username is required."];
        }
        else if (await db.Users.AnyAsync(u => u.Username == request.Username, ct))
        {
            errors[nameof(request.Username)] = ["Username is already taken."];
        }

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
        {
            errors[nameof(request.Password)] = ["Password must be at least 8 characters."];
        }

        if (errors.Count > 0)
        {
            throw new ValidationException(errors);
        }

        var (hash, salt) = PasswordHasher.Hash(request.Password);
        db.Users.Add(new User
        {
            Username = request.Username,
            PasswordHash = hash,
            PasswordSalt = salt,
            IsAdmin = false, // accounts created via this endpoint are never admins by default
        });
        await db.SaveChangesAsync(ct);
    }

    private string GenerateToken(string username, bool isAdmin, DateTime expiresAt)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Secret"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, username),
            new Claim("IsAdmin", isAdmin ? "true" : "false"),
        };

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
