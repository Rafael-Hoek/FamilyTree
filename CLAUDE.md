# Working in this repo

This is a small, private, single-family family-tree app. Frontend and backend
are separate projects (`FamilyTree-FrontEnd/`, `FamilyTree-BackEnd/`) with no
shared package/solution — treat them as two independent apps that happen to
share a data contract (`docs/data-model.json`).

Start with the root `README.md` for features, stack, project structure, and
local dev / deployment steps. This file only covers things that aren't
obvious from the code or the README — gotchas discovered the hard way during
development.

## Local dev gotchas

- **Windows PowerShell blocks npm by default.** `npm run dev`/`npm install`
  fail with "running scripts is disabled on this system" unless script
  execution has been enabled once per user:
  `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. This is a one-time
  machine setting, not a project config — don't try to work around it in
  repo files. Running npm via `cmd.exe` instead of PowerShell also sidesteps
  it.
- **Local Postgres needs Docker Desktop running** before
  `docker compose up -d` in `FamilyTree-Database/` will work. If Docker
  Desktop itself isn't running, the `docker` CLI fails with a pipe-not-found
  error, not a clearer "start Docker Desktop" message.
- **`FamilyTree-Database/.env` is gitignored and optional.** The
  `docker-compose.yml` falls back to `familytree`/`familytree`/`familytree`
  (user/password/db) if it's absent, which already matches
  `appsettings.Development.json`'s connection string. You don't need to
  create this file for local dev to work.
- **No automated tests exist in this repo** (no test project, no frontend
  test runner configured). "Verified" currently means: `dotnet build`,
  `npm run build` + `npm run lint` (oxlint), and a manual check in a browser.
  Don't assume a test suite is just hidden somewhere — there isn't one.
- **`react-zoom-pan-pinch` wheel/pan behavior:** a plain mouse wheel zooms
  the tree; a trackpad two-finger scroll pans it (`trackPadPanning` is on by
  default, and the library treats continuous small-delta wheel events as
  trackpad panning, discrete larger ticks as zoom). This is intentional
  library behavior, not a bug — don't "fix" it by disabling one or the
  other without checking with the user first.
- **Testing the pan/zoom tree UI without a real backend running:** a tiny
  local mock HTTP server (permissive CORS, static JSON matching
  `Person`/`Relationship` shapes) is a fast way to get browser-testable data
  without needing Docker + EF migrations + seed data. Point
  `FamilyTree-FrontEnd/.env.local` (gitignored, overrides `.env`) at it, and
  delete `.env.local` again afterwards so the frontend falls back to
  `.env`'s real local API URL.

## CORS

`Program.cs` sets up CORS differently per environment:
- **Development**: any `localhost`/`127.0.0.1` origin (any port) is allowed.
  This is why a locally-running frontend on whatever port Vite picks always
  works against a locally-running backend.
- **Production**: only origins listed in `appsettings.json`'s
  `Cors:AllowedOrigins` are allowed (currently just
  `https://familytree.stolenpancake.com`).

Practical consequence: pointing a local dev frontend at the **production**
API (e.g. to test against real data without running a local backend) will
fail — the browser blocks the response for CORS even though the request
itself succeeds server-side. There's no quick per-request workaround; either
run the backend locally, add the origin to `Cors:AllowedOrigins`, or use a
mock server for UI-only testing (see above).

## Render free-tier cold starts

The backend is a Render free-tier Web Service, which spins down after a
period of inactivity. The **first** request after idle can return `503` for
up to roughly 30–60 seconds while the container restarts, before subsequent
requests succeed normally. If you see an intermittent 503 immediately after
hitting the production API (especially first thing in a session), retry
after a short wait before assuming something is actually broken.

## Auth model

- Login is **username + password**, not email — see `Models/User.cs`
  (`Username`, `PasswordHash`, `PasswordSalt`, `IsAdmin`). `Username` is the
  EF Core primary key (`UserConfiguration.cs`), there's no separate `Id`.
- Permissions are a **flat boolean**, not a role hierarchy: `IsAdmin` only
  gates `POST /api/auth/users` (creating new accounts). Any authenticated
  user — admin or not — can create/edit/delete People and Relationships.
  There is no Editor/Viewer distinction.
- There's no self-service sign-up. The very first account is inserted
  directly into the database; every account after that is created by an
  existing admin via the API. New accounts created via the API are always
  `IsAdmin = false` — promoting someone to admin currently requires a direct
  database update.
- A successful login returns a JWT carrying an `IsAdmin` claim
  (`"true"`/`"false"` string) that the `AdminOnly` authorization policy
  checks with `RequireClaim`.
- GET endpoints on `/api/people` and `/api/relationships` are public
  (unauthenticated). All POST/PUT/DELETE on those, plus
  `POST /api/auth/users`, require a valid JWT.

## Production configuration

Secrets are never committed — they're supplied as Render environment
variables using ASP.NET Core's double-underscore nesting convention:
- `ConnectionStrings__FamilyTree` — the Postgres connection string (Neon,
  pooled).
- `Jwt__Secret` — the JWT signing key.

Everything else config-wise (CORS allowed origins, JWT issuer/audience)
lives in `appsettings.json` since none of it is actually secret — see
`README.md`'s Deployment section.

## Data model contract

`docs/data-model.json` documents the actual EF Core models and DTOs
(`Models/`, `Dtos/` in `FamilyTree-BackEnd/FamilyTree.Api`) and is meant to
be the source of truth for the shape both frontend and backend agree on —
the frontend's `FamilyTree-FrontEnd/src/api/types.ts` is written to match
it. **Keep it in sync**: if you change a model or DTO, update
`docs/data-model.json` (and `types.ts`) in the same change. It had drifted
out of sync with the real `User` model once already (an earlier design
draft with `Email`/`Role`/`PersonId` fields that were never actually built)
— don't let that happen again.

## Git conventions observed in this repo

Commit messages here are short, imperative, and describe the "what" in one
line (e.g. "Fix JWT validation always failing in production", "Restrict
account creation to admin users") — no multi-paragraph bodies. Match that
style. Commits include a `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`
trailer when Claude made the change.
