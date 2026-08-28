# Family Tree

A private family tree web app: view the family as a visual, generation-based
tree, and (once logged in) add, edit, or delete people and relationships.

Live at [familytree.stolenpancake.com](https://familytree.stolenpancake.com).

## Features

- Visual family tree — generations laid out automatically from parent/spouse
  data, with couples kept together and connector lines between generations.
- Collapse/expand any branch from its card.
- Click a person for full details; edit, delete, or manage their
  relationships from there.
- Anyone can view the tree. Logging in is required to add, edit, or delete
  anything.
- Only admin accounts can create new login accounts — there's no public
  sign-up.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React + TypeScript, built with Vite |
| Backend | .NET 10 minimal API + Entity Framework Core |
| Database | PostgreSQL (Neon in production, Docker locally) |
| Hosting | Render (frontend static site + backend Docker web service) |
| Domain / DNS | Cloudflare |

## Project structure

```
FamilyTree-FrontEnd/   React app
FamilyTree-BackEnd/    .NET API (FamilyTree.Api)
FamilyTree-Database/   docker-compose for local Postgres
docs/                  data model reference
```

## Local development

1. **Start local Postgres:**
   ```
   cd FamilyTree-Database
   docker compose up -d
   ```

2. **Run the backend** (uses `appsettings.Development.json`, already pointed
   at the local Postgres container above — no setup needed):
   ```
   cd FamilyTree-BackEnd/FamilyTree.Api
   dotnet run
   ```
   API: http://localhost:5284 — interactive docs at `/scalar/v1`.

3. **Run the frontend** (`.env` already points at the local API above):
   ```
   cd FamilyTree-FrontEnd
   npm install
   npm run dev
   ```
   App: whatever URL Vite prints (defaults to http://localhost:5173).

4. **Apply database migrations** (needed once, and again after pulling any
   change under `FamilyTree.Api/Migrations`):
   ```
   cd FamilyTree-BackEnd
   dotnet ef database update --project FamilyTree.Api --startup-project FamilyTree.Api
   ```

There's no self-service sign-up. To get a local login, ask whoever has an
admin account to create one for you, or insert a row into the `Users` table
directly (password hashed with PBKDF2 — see `Common/PasswordHasher.cs`).

## Deployment

- **Frontend**: Render Static Site, built from `FamilyTree-FrontEnd/`.
- **Backend**: Render Web Service running `FamilyTree-BackEnd/Dockerfile`.
- **Database**: Neon (Postgres), connected via an environment variable —
  never committed to the repo.
- **Domain**: registered and DNS-managed on Cloudflare, pointing at Render's
  services via CNAME records.

Config that differs between local and production (connection string, JWT
signing secret) is supplied via environment variables in Render, not
committed. Everything else (CORS allowed origins, JWT issuer/audience) lives
in `appsettings.json` since none of it is actually secret.
