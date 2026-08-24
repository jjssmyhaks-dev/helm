# Helm Frontend Preview

## How to Reproduce Uncommitted Artifacts

1. `.env.local` in `apps/web/` must exist with Clerk keys (already present in main checkout):
   - Copy from main checkout: `cp apps/web/.env.local apps/web/.env.local`
2. Dependencies already installed via `pnpm install` at project root.
3. No build step needed — Next.js dev mode.

## How to Run the Server

```bash
cd apps/web
npx next dev -p 3456
```

Or use the detached VBS launcher:
```
cscript //nologo .freebuff/start-frontend.vbs
```

- **Port:** 3456 (Next.js may choose an alternate port if 3456 is taken; check the stdout log for the actual URL)
- **API_URL:** http://localhost:4000 (backend must be running separately via `cscript .freebuff/start-api.vbs`)
- **Auth:** Clerk (redirects to /sign-in if unauthenticated)
- **Frontend:** Next.js 15 + Tailwind CSS + Clerk auth

## Stopping the Server

```bash
taskkill //F //PID <pid>
```

Find PID with: `netstat -ano | grep ":3456" | grep "LISTENING"`

## Notes

- Register preview with `127.0.0.1:3456` (not `localhost`) to avoid IPv6 issues
- Multiple lockfiles warning is harmless (pnpm + npm coexist)
