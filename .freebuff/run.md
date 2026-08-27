# Helm — Run Doc

## How to Reproduce Uncommitted Artifacts

1. Copy `.env.local` from the main checkout to `apps/web/.env.local`
2. Copy `.env` from the main checkout to `apps/api/.env`
3. Install dependencies: `pnpm install`

## How to Run the Server

### Frontend (Next.js on port 3001)

```bash
cd apps/web
npx next dev -p 3001
```

### Backend API (NestJS on port 4000)

```bash
cd apps/api
npx tsx src/main.ts
```

## Notes

- **Prisma 7** requires `@prisma/adapter-pg` driver adapter — PrismaService uses a Proxy to forward model access
- **Groq models** — use `openai/gpt-oss-20b` (account doesn't have access to Llama models)
- **Clerk auth** is optional — app runs in demo mode when key is invalid
- **Database** connects to Supabase via port 6543 (pooler)
