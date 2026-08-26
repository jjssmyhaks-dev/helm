# Helm Frontend Preview

## How to Reproduce Uncommitted Artifacts

1. `.env.local` in `apps/web/` must exist with Clerk keys (already present in main checkout):
   - Copy from main checkout: `cp apps/web/.env.local apps/web/.env.local`
2. Dependencies already installed via `npm install` in `apps/web/`.
3. No build step needed — Next.js dev mode.
4. If Sentry DSN env vars are set, `next.config.js` wraps with `withSentryConfig`.

## How to Run the Server

```bash
cd apps/web
node node_modules/next/dist/bin/next dev -p 3456
```

Or use the detached PowerShell launcher:
```
powershell -NoProfile -ExecutionPolicy Bypass -File .freebuff/start-frontend.ps1
```

- **Port:** 3456
- **API_URL:** http://localhost:4000 (backend must be running separately)
- **Auth:** Clerk (redirects to /sign-in if unauthenticated)
- **Frontend:** Next.js 15 + Tailwind CSS + Clerk auth
- **Sentry:** Conditional — only wraps with `withSentryConfig` if `SENTRY_DSN` or `NEXT_PUBLIC_SENTRY_DSN` is set

## Stopping the Server

```bash
taskkill //F //PID <pid>
```

Find PID with: `netstat -ano | grep ":3456" | grep "LISTENING"`

## Notes

- Register preview with `localhost:3456` (not `127.0.0.1`)
- Multiple lockfiles warning is harmless
- Use `cmd //c "start /b node ..."` or PowerShell `Start-Process` for reliable process detachment on Windows
- `.freebuff/start-frontend.ps1` uses absolute paths for reliable detachment
