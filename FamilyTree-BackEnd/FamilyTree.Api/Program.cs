using System.Text;
using System.Text.Json.Serialization;
using FamilyTree.Api.Common;
using FamilyTree.Api.Data;
using FamilyTree.Api.Endpoints;
using FamilyTree.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Render (and most PaaS hosts) inject the port to listen on via $PORT rather
// than a fixed launch profile URL. Only applies when that variable is present,
// so local dev via launchSettings.json is unaffected.
var renderPort = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(renderPort))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{renderPort}");
}

builder.Services.AddOpenApi();

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddDbContext<FamilyTreeDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("FamilyTree")));

builder.Services.AddScoped<PersonService>();
builder.Services.AddScoped<RelationshipService>();
builder.Services.AddScoped<AuthService>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]!)),
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireClaim("IsAdmin", "true"));
});

builder.Services.AddExceptionHandler<ValidationExceptionHandler>();
builder.Services.AddProblemDetails();

// In Development, allow any localhost port (the Vite dev server's port can shift).
// Elsewhere, only the configured production origin(s) are allowed.
const string corsPolicy = "AppCors";
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy(corsPolicy, policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy.SetIsOriginAllowed(origin => new Uri(origin).Host is "localhost" or "127.0.0.1")
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
        else
        {
            policy.WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
    });
});

var app = builder.Build();

app.UseExceptionHandler();

// The API's own auth (JWT on mutating endpoints) is what actually protects it —
// hiding the docs endpoint behind IsDevelopment() added no real security, since
// every route is already visible in the frontend's public JS bundle anyway.
app.MapOpenApi();
app.MapScalarApiReference();

app.UseCors(corsPolicy);

app.UseAuthentication();
app.UseAuthorization();

app.MapPersonEndpoints();
app.MapRelationshipEndpoints();
app.MapAuthEndpoints();

app.Run();
