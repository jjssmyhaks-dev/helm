# Helm Frontend Preview — Run Doc

## How to reproduce artifacts

1. Copy `.env.local` from the main checkout:
   ```
   cp <main-checkout>/apps/web/.env.local apps/web/.env.local
   ```
   **Note:** Never copy secret values — record the procedure only.

2. Install dependencies (if not already):
   ```
   cd apps/web && npm install
   ```

## How to run the server

```bash
cd apps/web
npm run dev
```

The server runs on port 3001 (configured via `npx next dev -p 3001`). If 3001 is busy, Next.js auto-picks the next available port.

## Current configuration

- **Port:** 3001 (Next.js auto-selected)
- **Clerk:** Disabled (`pk_test_INVALID` in `.env.local`) — app runs in demo mode
- **API:** Expects backend at `http://localhost:4000` (NestJS)
- **Design system:** `surface-*` CSS classes, glass morphism, Inter font

## When Clerk is configured

To enable real authentication:
1. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to a valid key in `.env.local`
2. Set `CLERK_SECRET_KEY` to the matching secret
3. Restart the dev server
4. The app will automatically use Clerk auth instead of demo mode
