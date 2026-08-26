# Helm Frontend Preview

## How to Reproduce Uncommitted Artifacts

1. `.env.local` in `apps/web/` must exist with Clerk keys (already present in main checkout).
2. Dependencies already installed via `npm install` in `apps/web/`.
3. No build step needed — Next.js dev mode.

## How to Run the Server

```bash
cd apps/web
npm run dev
```

Or use the detached batch launcher:
```
start "" ".freebuff\launch.bat"
```

- **Port:** 54561 (or next available if 3456 is taken)
- **API_URL:** http://localhost:4000 (backend must be running separately)
- **Auth:** Clerk (redirects to /sign-in if unauthenticated)
- **Frontend:** Next.js 15 + Tailwind CSS + Clerk auth

## Stopping the Server

```powershell
taskkill /PID <pid> /F
```
