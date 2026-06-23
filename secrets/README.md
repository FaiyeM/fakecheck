# Secrets

Real secret files in this folder are gitignored — only `*.example` templates are committed.

## How to use
1. Copy each `*.example` to the same name without `.example` (e.g. `backend.env.example` → `backend.env`).
2. Fill in the real values.
3. Tell the build agent (or note in `PROGRESS.md`) that secrets are ready — it will load them and unblock the matching phases.

## What unblocks what
| File | Unblocks |
|---|---|
| `backend.env` → Vision keys | Phase 5 (live vision calls) |
| `backend.env` → R2 keys | Phase 4 (object storage) |
| `backend.env` → DB / Railway | Phase 8 (deploy) |
| `mobile.env` → API URL | Phase 9 (mobile points at live backend) |
| Apple/Google accounts (not files) | Phase 14 (store builds) — done interactively via EAS |

## Security
- Never commit the filled-in files (the folder `.gitignore` blocks them).
- Rotate any key that is ever pasted into chat or logs.
- For production, mirror these as environment variables in Railway — do not ship `.env` files in the container.
