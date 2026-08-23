# Helm Frontend Preview

## How to Reproduce Uncommitted Artifacts

1. Copy `.env` from main checkout to `apps/web/.env.local` (adapt API URL if needed):
   ```
   cp apps/api/.env apps/api/.env
   ```
2. Install dependencies (already done in main checkout):
   ```
   pnpm install
   ```
3. Build shared types package:
   ```
   cd packages/shared && pnpm run build
   ```

## How to Run the Server

```bash
cd apps/web
pnpm run dev
```

- Default port: 3000
- API_URL: http://localhost:4000 (backend must be running separately)
- Frontend is a Next.js app with Tailwind CSS
