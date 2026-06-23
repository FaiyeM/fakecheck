# Deploying the FakeCheck backend to Railway (Phase 8)

The repo ships a Dockerfile (`backend/Dockerfile`) and `railway.json` (Dockerfile
builder, `/health` healthcheck). Railway builds the image from the repo root so the
prompt library in `docs/` is included.

## One-time setup

```bash
npm install -g @railway/cli
railway login
cd ~/Documents/Claude/Projects/flossin-Fakecheck
railway init                      # create the project (or `railway link` to an existing one)
railway add --database postgres   # managed Postgres — injects DATABASE_URL automatically
```

The app reads `DATABASE_URL` directly (auto-converted to Npgsql format in
`DependencyInjection.cs`), so you do **not** need to set `ConnectionStrings__Default`
manually when using Railway's managed Postgres. It migrates + seeds on startup.

## Environment variables

Set the non-DB secrets on the service. Fastest is to import from `secrets/backend.env`
(skip `ConnectionStrings__Default` — Railway's `DATABASE_URL` covers it):

```bash
# from the repo root, with secrets/backend.env filled in
grep -v '^#' secrets/backend.env | grep -v '^ConnectionStrings__Default=' | grep -v '^RAILWAY_TOKEN=' \
  | while IFS= read -r line; do [ -n "$line" ] && railway variables --set "$line"; done
```

Required keys (all already in `secrets/backend.env`): `Vision__Gemini__ApiKey`,
`Vision__Gemini__Model`, `Vision__Premium__Provider`, `Vision__Premium__ApiKey`,
`Vision__Premium__Model`, `Vision__Premium__BaseUrl`, `R2__AccountId`,
`R2__AccessKeyId`, `R2__SecretAccessKey`, `R2__Endpoint`, `R2__BucketScans`,
`R2__BucketCorrections`, `R2__BucketReference`.

> Never commit `secrets/backend.env` — it's gitignored. Railway stores these server-side.

## Deploy

```bash
railway up           # builds backend/Dockerfile and deploys
railway domain       # generate/show the public URL
```

## Verify

```bash
curl https://<railway-domain>/health     # -> 200
open https://<railway-domain>/swagger     # Swagger UI loads
```

Then put that base URL into the mobile app: set `EXPO_PUBLIC_API_URL` in
`secrets/mobile.env` to `https://<railway-domain>` and restart Expo.

## GitHub auto-deploy (optional, recommended)

In the Railway dashboard → service → Settings → connect the GitHub repo
`FaiyeM/fakecheck` and enable deploys from `main`. After that, every push that passes
CI redeploys automatically and you can stop running `railway up` by hand.
