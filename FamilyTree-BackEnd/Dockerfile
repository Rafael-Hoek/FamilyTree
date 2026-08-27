# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore first, in its own layer, so dependency resolution is only
# re-run when the csproj actually changes.
COPY global.json .
COPY FamilyTree.Api/FamilyTree.Api.csproj FamilyTree.Api/
RUN dotnet restore FamilyTree.Api/FamilyTree.Api.csproj

COPY FamilyTree.Api/ FamilyTree.Api/
RUN dotnet publish FamilyTree.Api/FamilyTree.Api.csproj -c Release -o /app/publish --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Official .NET images define APP_UID for a non-root user out of the box.
USER $APP_UID

ENTRYPOINT ["dotnet", "FamilyTree.Api.dll"]
