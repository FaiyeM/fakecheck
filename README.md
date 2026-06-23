# FakeCheck

> *Point. Check. Know.* — AI-assisted authentication for sneakers, luxury handbags, Pokémon cards, and luxury watches.

FakeCheck is a mobile-first app: point your phone at an item, get an identification, run a guided category-specific photo flow, and receive a verdict (Authentic / Counterfeit / Inconclusive) with the evidence behind it. Every user correction feeds a learning loop.

**This is an AI-assisted assessment, not a certified appraisal.**

## Monorepo layout

```
fakecheck/
├── backend/    # ASP.NET Core Web API on .NET 10 (layered: Api / Core / Infrastructure / Tests)
├── mobile/     # Expo SDK 56 (React Native) app
├── docs/       # spec, build plan, and the per-check prompt library (core IP)
│   └── prompts/
├── .github/workflows/   # CI (backend + mobile)
└── secrets/    # *.env.example templates (real *.env are gitignored)
```

## Stack (locked)

| Layer | Choice |
|---|---|
| Backend | ASP.NET Core Web API, .NET 10 (LTS) |
| Front-end | React Native via Expo SDK 56 |
| Vision | Tiered — Gemini Flash for identification, premium model for auth checks |
| Object storage | Cloudflare R2 (S3-compatible) |
| Deploy | Railway (Docker + managed Postgres + Redis) |
| Launch categories | Sneakers · Luxury Handbags · Pokémon Cards · Luxury Watches |

## Build status

Progress is tracked in [`PROGRESS.md`](./PROGRESS.md). The build is executed incrementally by a scheduled agent following [`FakeCheck_Build_Instructions.md`](./FakeCheck_Build_Instructions.md).

## Local dev (quick reference)

Backend:
```bash
cd backend
docker compose -f docker-compose.dev.yml up -d   # Postgres + Redis
dotnet ef database update --project FakeCheck.Infrastructure --startup-project FakeCheck.Api
dotnet run --project FakeCheck.Api                # Swagger at /swagger
```

Mobile:
```bash
cd mobile
npm install
npx expo start
```

Copy `secrets/backend.env.example` → `secrets/backend.env` and `secrets/mobile.env.example` → `secrets/mobile.env` and fill in credentials before running anything that needs vision APIs, R2, or the deployed backend.
