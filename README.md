# ArchiDesk

Business management SaaS for architects, decorators, and design studios in Morocco.

## Tech Stack

- **Next.js 15** (App Router, TypeScript strict)
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** (Auth, PostgreSQL, Storage)
- **Drizzle ORM**
- **Anthropic Claude** (AI contract generation)
- **next-intl** (French UI, scaffolded for Arabic)
- **pnpm**

## Setup

### 1. Clone and install

```bash
git clone https://github.com/brahimsemlali/archiapp.git
cd archiapp
pnpm install
```

### 2. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase project settings
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase project settings
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings (server only)
- `DATABASE_URL` — Supabase direct connection string (for Drizzle)
- `ANTHROPIC_API_KEY` — from console.anthropic.com

### 3. Database

Run `supabase/migrations/001_initial.sql` in your Supabase SQL editor. This creates all tables, enums, RLS policies, and the auto-workspace-on-signup trigger.

### 4. Dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Generate Drizzle migrations |

## Project Structure

See `CLAUDE.md` for the full architecture reference.

## Changelog

### v0.1.0 — Foundation
- Next.js 15 scaffold with TypeScript strict, Tailwind, shadcn/ui
- Supabase auth (email + Google OAuth)
- Full DB schema with RLS + auto-workspace trigger
- Clients CRUD (list, create, edit, detail)
- Projects CRUD (list, create, edit, detail with tabs)
- Settings page (firm profile)
- Contracts list page
- Dashboard with activity feed
- French i18n via next-intl
- PWA manifest
