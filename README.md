# Helm — AI Operating System for Solo Founders

Helm is a hybrid multi-agent system organized into four functional layers (Research, Marketing, Operations, Finance), coordinated by a global orchestrator, and connected to the founder's real tools via MCP-based connectors.

## Architecture

```
Founder (Chat + Voice)
        │
   Global Orchestrator
        │
   ┌────┼────┬────┐
Research Marketing Ops Finance
   │     │     │     │
[5 sub] [6 sub] [5 sub] [5 sub]
        │
   Event Bus (Redis pub/sub)
        │
   Shared Context Store (Postgres + pgvector)
        │
   MCP Connector Layer
```

## Tech Stack

- **Backend**: NestJS (modular monolith)
- **Frontend**: Next.js + Tailwind CSS
- **Database**: PostgreSQL with Row-Level Security (Supabase preferred)
- **Queue/Jobs**: BullMQ + Redis
- **LLM**: Anthropic API (Claude)
- **Event Bus**: Redis Pub/Sub
- **Vector Store**: pgvector

## Getting Started

### Prerequisites

- Node.js >= 20
- PostgreSQL 15+
- Redis 7+
- pnpm

### Setup

```bash
# Install dependencies
pnpm install

# Set up environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your database URL, Redis URL, and Anthropic API key

# Run database migration
cd apps/api
npx prisma migrate dev
npx prisma generate

# Start development servers
pnpm dev
```

The API runs on `http://localhost:4000` and the frontend on `http://localhost:3000`.

## Project Structure

```
helm/
├── apps/
│   ├── api/           # NestJS backend
│   │   ├── prisma/    # Database schema and migrations
│   │   └── src/
│   │       ├── auth/          # JWT authentication
│   │       ├── orchestrator/  # Global + layer orchestrators
│   │       ├── event/         # Event bus (Redis pub/sub)
│   │       ├── approval/      # Risk-tier engine + approval queue
│   │       ├── connector/     # MCP connector registry
│   │       ├── context/       # Shared memory layer
│   │       ├── chat/          # Chat + voice endpoints
│   │       ├── agent/         # Agent management
│   │       ├── task/          # Task management
│   │       ├── founder/       # Founder profile & settings
│   │       └── activity/      # Audit trail
│   └── web/           # Next.js frontend
│       └── src/
│           ├── app/           # Pages and layout
│           ├── components/    # UI components
│           └── lib/           # API client
├── packages/
│   └── shared/        # Shared TypeScript types
└── README.md
```

## Key Features

### Hybrid Orchestration
- **Top-down**: Global Orchestrator routes founder input to layers
- **Peer-to-peer**: Event Bus enables direct cross-layer signals
- **Best of both**: Clean topology with fast urgent signals

### 21 Specialist Sub-Agents
- **Research** (5): Competitor Intelligence, Market Scanning, Pricing, Audience Research, Campaign Deep-Dive
- **Marketing** (6): Strategist, Performance Marketer, Content, SEO, Designer, Social
- **Operations** (5): Process, Vendor, Quality, Support, Scheduling
- **Finance** (5): Bookkeeping, Cash Flow, Unit Economics, Compliance, Fundraising

### Risk-Tiered Autonomy
- **Tier 1 (Auto-Execute)**: Reversible, no cost — runs immediately
- **Tier 2 (Notify & Act)**: Proceeds but flagged for visibility
- **Tier 3 (Approval Required)**: Blocks until founder approves/rejects/edits

### MCP Connectors
16 pre-configured connectors covering Web Search, Figma, Meta Ads, Google Ads, WhatsApp, Tally, Banking APIs, and more.

## API Documentation

Swagger docs available at `http://localhost:4000/docs` when the server is running.

## License

Proprietary — All rights reserved.
