# ArchiDesk — Claude Code Project Guide

> This file is the source of truth for Claude Code. Read it at the start of every session before writing code. If something here is wrong or out of date, fix this file first, then code.

---

## 1. What we're building

**ArchiDesk** is a business management SaaS for **architects, decorators, and design studios in Morocco**. It replaces the chaos of email + WhatsApp + Excel + paper contracts with one place where a project lives from first client call to final delivery.

**MVP primary user:** A Moroccan **solo architect** running their own practice, working in French, billing in MAD, dealing with 5-30 active projects at a time. Build *for this person first.* Decorator and small-studio support comes in later phases — but the schema and architecture must not lock them out.

**Core value proposition (MVP):** "Generate a contract in 2 minutes, not 2 hours. Send a file to a client without losing it in WhatsApp."

**Long-term vision:** the daily operating system for any Moroccan design professional — architect, decorator, interior designer, small studio. See section 13 for the full vision and section 9 for the phased roadmap. **The MVP scope in section 2 does not change because of the long-term vision.** When in doubt, build less, ship sooner, learn from real users.

---

## 2. MVP scope (v1.0) — what to build

The MVP has **exactly 4 modules**. Anything outside this list is **out of scope** until v1.0 is shipped and used by real people.

### 2.1 Projects & Clients (the spine)

**Clients**
- Create / edit / archive (soft delete) clients
- Fields: `name`, `type` (particulier | société), `phone`, `email`, `address`, `ice` (Identifiant Commun de l'Entreprise — for sociétés), `cin` (Carte d'Identité Nationale — for particuliers), `notes`, `created_at`
- List view with search by name/phone, filter by type
- Single client page shows their projects + contracts + activity log

**Projects**
- Create / edit / archive
- Fields: `title`, `client_id`, `type` (villa | appartement | immeuble | commercial | rénovation | aménagement | autre), `address`, `surface_m2`, `phase` (esquisse | APS | APD | PC | DCE | chantier | réception | terminé), `status` (actif | en_attente | suspendu | terminé | archivé), `budget_estimate_mad`, `fees_mad`, `start_date`, `target_end_date`, `notes`
- List view: cards or table, filters by phase / status / client, sort by recent activity
- Single project page tabs: **Overview** (key info, recent activity), **Files**, **Contracts**, **Notes** (markdown notepad)

### 2.2 AI Contract Generation (the differentiator)

**Flow:**
1. User clicks "Nouveau contrat" on a project (or standalone)
2. Form collects: contract type (Contrat d'architecte mission complète | mission partielle | étude de faisabilité | suivi de chantier | autre), client (auto-filled from project), project (auto-filled), `mission_scope` (multi-select of phases), `fees_mad`, `payment_schedule` (free text or template: "30% à la signature, 30% APD, 30% PC, 10% réception"), `deadlines`, `special_clauses` (free text)
3. Backend calls **Anthropic Claude API** (`claude-sonnet-4-6`) with a system prompt anchored in **Moroccan architecture practice (Loi 016-89 relative à l'exercice de la profession d'architecte, barème indicatif de l'Ordre National des Architectes)**
4. AI returns a structured contract in **French**, with sections: Préambule, Objet, Mission, Honoraires, Modalités de paiement, Délais, Obligations des parties, Propriété intellectuelle, Litiges, Signatures
5. User reviews in a rich-text editor (TipTap), edits freely
6. Export to **PDF** with the firm's letterhead (logo, name, ICE, address pulled from settings)
7. Save versions; each edit creates a new version. Store the original AI prompt + response for audit.

**Important constraints:**
- Disclaimer always shown: *"Ce contrat est généré par IA. Faites-le valider par un juriste avant signature."*
- Never invent legal article numbers. The AI is told to use generic phrasing or cite Loi 016-89 only when explicitly relevant.
- Contracts always store the AI model + prompt version used (for traceability).

### 2.3 Files & Versioning (the daily driver)

**Upload**
- Drag-and-drop multi-file upload to a project
- Per-project folders (created automatically): `Plans`, `Rendus`, `Documents`, `Photos`, `Autre`. User can create custom folders.
- Max single file size: **100 MB** for MVP (Supabase free tier limit awareness).
- Allowed extensions: any (no blocklist) — but warn for executables.

**Versioning**
- Uploading a file with the same name in the same folder creates **v2, v3, …** instead of overwriting.
- Each version stores: `uploaded_by`, `uploaded_at`, `size`, `note` (optional).
- UI shows latest version by default with a "voir l'historique" link.

**Preview**
- Inline preview for: **PDF** (via PDF.js), **JPG, PNG, WebP, SVG** (native `<img>`).
- DWG / RVT / IFC / DXF: show icon + filename + size + "Télécharger" button. **No preview attempted in MVP** — proper CAD preview needs Autodesk Platform Services (paid) and is explicitly v2.
- Other types (DOCX, XLSX, ZIP, etc.): icon + download.

**Sharing**
- "Générer un lien de partage" for a file or folder → produces a **signed URL valid 7 days** (configurable: 1d / 7d / 30d / never expires).
- Link recipient does NOT need an account. They see a clean download page with the firm's branding.
- All shares are logged: who shared, what, when, expiry.

### 2.4 Cross-cutting (always present)

- **Dashboard home** (`/`): "Aujourd'hui" — recent activity (last 20 events across all projects), active projects count by phase, contracts awaiting export, recent files
- **Settings** (`/settings`): firm profile — logo upload, firm name, architect name, ICE, RC, IF, CNSS, patente, address, phone, email, IBAN. Used in contract PDFs and share-link branding.
- **Auth**: email + password and Google OAuth via Supabase Auth. Single user per account at MVP (no team).
- **Language**: French only at MVP. All UI strings go through `next-intl` from day one (so v1.1 can add Arabic without a rewrite).
- **Currency**: MAD only. Display format: `1 234,56 DH` (French locale, "DH" suffix). Store as integers in **centimes** (smallest unit) in the DB to avoid float math.
- **PWA**: installable, with manifest + service worker, offline shell + cached assets only (no offline data sync in MVP).
- **Responsive**: works on mobile (375px+), tablet, desktop. Mobile is read/light-edit; heavy entry assumed desktop.

---

## 3. Explicitly OUT of scope for MVP

Do not build these. If the user asks, remind them they're scheduled for later phases. They are listed in section 9.

- Client portal / external client login
- Time tracking, timers, timesheets
- Invoicing, payment processing, TVA, payment gateways
- Tasks, to-dos, kanban, mentions, comments, team members
- DWG / RVT / IFC inline preview
- Email or SMS notifications (in-app activity feed only)
- Calendar / Google Calendar integration
- Mobile native apps (it's a PWA)
- Multi-language UI beyond French
- Multi-currency
- AI features beyond contract generation (no chatbot, no auto-tagging, no smart search)

---

## 4. Tech stack — non-negotiable

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router) | Single codebase, server components, Vercel deploy |
| Language | **TypeScript strict** | Catch bugs at build time |
| Styling | **Tailwind CSS** + **shadcn/ui** | Fast, consistent, no design debt |
| Forms | **react-hook-form** + **zod** | Type-safe validation client + server |
| DB / Auth / Storage | **Supabase** (PostgreSQL, Auth, Storage) | One service, free tier, RLS for security |
| ORM | **Drizzle** (preferred) or Supabase JS client | Type-safe queries; Drizzle for complex joins, Supabase client for simple reads |
| AI | **Anthropic SDK** (`@anthropic-ai/sdk`), model `claude-sonnet-4-6` | Contract generation only |
| Rich text | **TipTap** | Contract editor |
| PDF generation | **@react-pdf/renderer** (server-side) | Contracts + share-link branding |
| File preview | **react-pdf** (PDF.js wrapper), native `<img>` | Inline preview |
| i18n | **next-intl** | French at MVP, scaffold for Arabic later |
| Date handling | **date-fns** with `fr` locale | French date formatting |
| Deployment | **Vercel** | Zero-config, edge functions, PWA-friendly |
| Package manager | **pnpm** | Fast, disk-efficient |

**Versions:** always use the latest stable at install time. Pin in `package.json` after install.

---

## 5. Project structure

```
archidesk/
├── CLAUDE.md                    # this file
├── README.md                    # human-facing setup
├── .env.local.example           # env vars template
├── next.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
├── package.json
├── public/
│   ├── icons/                   # PWA icons
│   └── manifest.json
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/              # login, signup
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── (app)/               # authenticated routes
│   │   │   ├── layout.tsx       # sidebar shell
│   │   │   ├── page.tsx         # dashboard
│   │   │   ├── clients/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx          # overview
│   │   │   │       ├── files/page.tsx
│   │   │   │       ├── contracts/page.tsx
│   │   │   │       └── notes/page.tsx
│   │   │   ├── contracts/
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── share/[token]/       # public share-link viewer (no auth)
│   │   ├── api/
│   │   │   ├── contracts/generate/route.ts   # AI call
│   │   │   ├── contracts/[id]/pdf/route.ts   # PDF export
│   │   │   ├── files/upload/route.ts
│   │   │   └── share/[token]/route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                  # shadcn primitives
│   │   ├── layout/              # sidebar, header
│   │   ├── clients/
│   │   ├── projects/
│   │   ├── contracts/
│   │   └── files/
│   ├── lib/
│   │   ├── supabase/            # server + client + middleware helpers
│   │   ├── db/                  # drizzle schema + queries
│   │   ├── ai/                  # Anthropic client + prompts
│   │   ├── pdf/                 # contract PDF templates
│   │   ├── i18n/                # next-intl config
│   │   ├── format.ts            # currency, date helpers
│   │   └── validators/          # zod schemas
│   ├── messages/                # i18n strings
│   │   └── fr.json
│   └── types/                   # shared TS types
├── drizzle/                     # migrations
└── supabase/
    └── migrations/              # SQL for RLS policies
```

---

## 6. Database schema (Supabase / Postgres)

All tables have `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`, and `owner_id uuid references auth.users(id)`. **Row-Level Security (RLS) is mandatory on every table** — a user only ever sees their own rows.

### Future-proofing rules (apply now, even at MVP)

These cost almost nothing to add today and unlock entire roadmap phases later. **Do them from day one.**

- **`workspace_id` on every business table.** Even though MVP is single-user, every row carries a `workspace_id` (defaults to a workspace auto-created on signup, where `workspace.owner_id = user.id`). This is what enables multi-user firms in v1.3 without a migration nightmare.
- **`profile_type` on `firm_profile`** (`architect | decorator | studio | other`, default `architect`). Drives default folder structures, contract templates, and module visibility in later phases. MVP UI hides this and defaults to `architect`.
- **`metadata jsonb`** column on `clients`, `projects`, `contracts`, `files`. Lets later phases attach feature-specific data (e.g., room tags for decorators, permit status for architects) without schema migrations.
- **Soft delete everywhere** (`archived_at timestamptz null`). Never hard-delete user data in MVP.
- **Polymorphic-ready join tables.** When a feature needs "this thing belongs to a project OR a client OR a contract," use `(resource_type, resource_id)` columns rather than three nullable FKs.

### Tables

**`workspaces`** *(future-proofing — single row per user at MVP)*
- `owner_id` (FK auth.users, unique at MVP)
- `name` (defaults to firm name)
- `plan` (enum: `solo`, `studio`, `agence`, default `solo` — billing scaffold, no enforcement at MVP)

**`firm_profile`** (one row per workspace)
- `workspace_id` (PK, FK workspaces)
- `profile_type` (enum: `architect`, `decorator`, `studio`, `other`, default `architect`)
- `firm_name`, `architect_name`, `logo_url`, `address`, `phone`, `email`
- `ice`, `rc`, `if`, `cnss`, `patente`, `iban`

**`clients`**
- `workspace_id` (FK workspaces)
- `name`, `type` (enum: `particulier`, `societe`)
- `phone`, `email`, `address`
- `ice` (nullable), `cin` (nullable)
- `notes` (text)
- `metadata` (jsonb default `'{}'`)
- `archived_at` (nullable)

**`projects`**
- `workspace_id` (FK workspaces)
- `client_id` (FK clients)
- `title`, `type` (enum), `address`, `surface_m2` (numeric)
- `phase` (enum), `status` (enum)
- `budget_estimate_centimes` (bigint), `fees_centimes` (bigint)
- `start_date`, `target_end_date` (date, nullable)
- `notes` (markdown text)
- `metadata` (jsonb default `'{}'`)
- `archived_at` (nullable)

**`contracts`**
- `workspace_id` (FK workspaces)
- `project_id` (FK, nullable for standalone), `client_id` (FK)
- `type` (enum)
- `title`
- `content_json` (jsonb — TipTap document)
- `content_html` (text — rendered for PDF)
- `ai_prompt` (text), `ai_response_raw` (text), `ai_model` (text)
- `status` (enum: `brouillon`, `finalise`, `archive`)
- `version` (int, starts at 1)
- `parent_contract_id` (FK self, nullable — for version chain)
- `metadata` (jsonb default `'{}'`)

**`files`**
- `workspace_id` (FK workspaces)
- `project_id` (FK)
- `folder` (text — `Plans`, `Rendus`, etc., or custom)
- `filename` (text — original name)
- `storage_path` (text — Supabase Storage path)
- `size_bytes` (bigint), `mime_type` (text)
- `version` (int, default 1)
- `parent_file_id` (FK self, nullable — for version chain)
- `note` (text, nullable)
- `metadata` (jsonb default `'{}'`)

**`share_links`**
- `workspace_id` (FK workspaces)
- `resource_type` (enum: `file`, `folder`)
- `resource_id` (uuid — file id or composite folder ref)
- `token` (text, unique, random 32 chars)
- `expires_at` (timestamptz, nullable)
- `accessed_count` (int default 0)
- `last_accessed_at` (timestamptz, nullable)

**`activity_log`**
- `workspace_id` (FK workspaces)
- `project_id` (FK, nullable)
- `client_id` (FK, nullable)
- `action` (text — e.g., `project.created`, `file.uploaded`, `contract.generated`)
- `metadata` (jsonb)

### RLS policy template (apply to every business table)

At MVP, `workspace_id` lookups go through the workspace's `owner_id`. This policy already supports multi-user workspaces in v1.3 — when we add a `workspace_members` table, only the policy changes, not the schema.

```sql
alter table <table> enable row level security;

create policy "workspace_select" on <table>
  for select using (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );
create policy "workspace_insert" on <table>
  for insert with check (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );
create policy "workspace_update" on <table>
  for update using (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );
create policy "workspace_delete" on <table>
  for delete using (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );
```

`share_links` allows anonymous SELECT by token (the public viewer route validates server-side). `workspaces` itself uses `auth.uid() = owner_id` directly.

---

## 7. AI contract generation — prompt engineering

The contract prompt lives in `src/lib/ai/prompts/contract.ts`. It is the single most important file for the differentiating feature. Update it as a versioned constant — never inline.

**System prompt skeleton:**

```
Tu es un assistant juridique spécialisé dans la rédaction de contrats
d'architecte au Maroc, conformes à la Loi 016-89 relative à l'exercice
de la profession d'architecte et aux usages de l'Ordre National des
Architectes.

Tu rédiges en français professionnel et juridique. Tu n'inventes jamais
de numéros d'articles de loi. Quand tu cites la Loi 016-89, fais-le
uniquement dans son cadre général. Tu n'imites pas un avocat: ta sortie
sera revue par un juriste.

Structure obligatoire du contrat:
1. Préambule (parties, qualités)
2. Objet du contrat
3. Mission de l'architecte
4. Honoraires (montant HT, TVA 20%, TTC)
5. Modalités de paiement
6. Délais
7. Obligations de l'architecte
8. Obligations du maître d'ouvrage
9. Propriété intellectuelle
10. Résiliation
11. Litiges et juridiction compétente
12. Signatures

Format de sortie: JSON strict avec les clés:
{ "title": string, "sections": [{ "heading": string, "body": string }] }

Body utilise des paragraphes en texte brut, pas de markdown.
```

**User message:** structured JSON of the form fields.

**Validation:** parse the AI response with zod. If it fails, retry once with an "your previous response was not valid JSON, return strict JSON" message. If it fails again, surface the error to the user — never display malformed content.

---

## 8. Coding conventions

- **TypeScript strict mode**, `noUncheckedIndexedAccess: true`
- **Server Components by default.** Use `"use client"` only when interactivity, browser APIs, or hooks are required
- **Server Actions** for mutations. API routes only when an external client (share link, AI) needs them
- **Zod schema = source of truth** for forms; infer types from it; reuse the same schema client + server
- **Database access only through `src/lib/db`** — no inline Supabase client calls in components
- **Money is always integers in centimes.** Convert at the edge (input → DB, DB → display)
- **Dates stored UTC, displayed in `Africa/Casablanca`**
- **All user-facing strings through `next-intl`** — no hardcoded French in JSX. Use `t('clients.empty')` etc.
- **Errors:** use `Result<T, E>` pattern from server actions, surface user-friendly French messages, log technical details server-side
- **File naming:** `kebab-case` for files, `PascalCase` for components, `camelCase` for functions
- **No `any`.** If you reach for it, stop and write the type
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`)

---

## 9. Roadmap beyond MVP (do not build now, but design for)

**The MVP scope in section 2 is frozen.** Everything below is aspirational planning so design choices today don't paint us into a corner tomorrow.

### v1.1 — Daily habit (target: 4-6 weeks after MVP launch)
The features that turn ArchiDesk from "useful" into "open every morning."

- **WhatsApp forward-to-project bot.** A dedicated WhatsApp number (Twilio or Meta Business API). Architects forward a client message, photo, or PDF — the bot uses AI to match it to a project and files it under the right folder, with the original message attached as a note. *This is the single highest-leverage feature for the Moroccan market because client communication lives on WhatsApp.*
- **Site visit mode.** Mobile-first PWA flow: snap photos, dictate voice notes (transcribed in French/Arabic via Whisper API), tag to room/zone, generate a polished site report PDF. 2-3× per week per architect.
- **Activity feed v2.** Real-time updates, filterable by project/client, with @-mentions ready (no team yet, but schema-ready).

### v1.2 — Money (target: 6-10 weeks after v1.1)
The features that justify *paying* for the product.

- **Devis (quote) builder.** Line items, quantities, unit prices, automatic TVA 20%, professional PDF, accept/reject tracking. Required before almost every Moroccan project.
- **Time tracking.** Timer + manual entries per project/phase. Optional — many architects bill fixed-fee, not hourly.
- **Invoicing.** Sequential numbering (legally required in Morocco — never skip numbers), TVA 20%, MAD formatting, PDF, mark-paid status, payment-due reminders.
- **Billing scaffold.** Stripe + (eventually) CMI for Moroccan card processing. Subscription plans wired to `workspace.plan`.

### v1.3 — Trust & external eyes (target: 4-6 weeks after v1.2)
What makes clients see the product and recommend it.

- **Client portal.** Read-only project view via signed magic link — no client account required at first. Shows project status, files, contracts, invoices. Approve/reject deliverables with comments and audit trail.
- **E-signature.** Built-in, simple. Send contract → client signs on their phone → archived with timestamp + IP. Avoids DocuSign per-doc fees.
- **Email + SMS notifications.** Out-of-product reach.

### v1.4 — The team and the second persona
- **Multi-user workspaces.** `workspace_members` table, roles (`admin`, `architect`, `collaborator`, `accountant`). RLS already accommodates this from MVP — see section 6.
- **Tasks & kanban** per project, assignments, mentions.
- **Decorator mode.** Activated by `firm_profile.profile_type = 'decorator'`. Different default folders (Inspirations, Échantillons, Mobilier, Sources), mood boards as a first-class feature, decorator-flavored contract templates.
- **Mood boards.** Pinterest-style boards inside a project. Web clipper (browser extension or paste URL), drag-rearrange, present to client. *Decorator killer feature.*
- **Product / material library.** Per-workspace database of suppliers, products, finishes, prices, lead times. Pulls into mood boards, devis, shopping lists.

### v1.5 — Localization
- **Arabic UI** (RTL) + English. Schema and i18n infrastructure already in place from MVP.
- **Multi-currency** for cross-border work.

### v2.0 — Depth
- **DWG / RVT / IFC inline preview** via Autodesk Platform Services (paid; pass-through fee on premium plans).
- **Plan annotation.** Open a PDF or image plan, mark up, comment, send to contractor. Bluebeam-lite.
- **Subcontractor / supplier CRM.** Plumbers, electricians, painters, suppliers — separate from clients. Ratings, project history, payment tracking.
- **Permis de construire tracker.** Moroccan-specific admin checklists per project (PC, autorisations, conformity certificates) with deadlines and document checklist.
- **Bank reconciliation.** Connect to CIH / Attijari / BMCE where APIs allow, auto-match incoming payments to invoices.
- **AI everywhere (carefully).** Auto-categorize uploaded files, summarize a project before a client meeting, draft email replies in the user's tone, extract devis line items from supplier PDFs.

### v2.1 — Mobile shells
- Capacitor wrappers around the PWA → real iOS / Android apps in stores.

### v3.0 — Platform / network effects
- **Marketplace of templates.** Users share contract, devis, project templates.
- **Public portfolio pages.** `archidesk.ma/anfa-architectes` — auto-generated SEO real estate.
- **Lead routing.** Clients post a brief on archidesk.ma, get matched to architects/decorators by region. ArchiDesk becomes a two-sided marketplace, not just a tool.
- **Ordre National des Architectes integration.** Verified-architect badge, official-tool credibility moat.

### Door-opening rule

When a v1.0 design decision could either help or hurt these later phases, **prefer the choice that keeps the door open** as long as it costs less than 30 minutes today. Examples already adopted: `workspace_id` on every table, `metadata jsonb` everywhere, `profile_type` on firm_profile, soft-delete via `archived_at`, scaffolded i18n. Do not invent new future-proofing features beyond these — the bar is "trivial today, expensive later."

---

## 10. Working with Claude Code — protocol

**At the start of every session:**
1. Read this file
2. Read `README.md` for setup notes
3. Run `pnpm install` and `pnpm typecheck` before changes
4. Check `git status` — never commit on top of uncommitted work without asking

**When making changes:**
- For each task, propose a plan first if it touches more than 3 files or any DB schema
- Run `pnpm typecheck && pnpm lint` after every meaningful change
- Update `README.md` when adding env vars, new commands, or external services
- Update **this file** when scope, stack, or architecture changes — *the user must approve scope changes explicitly*

**Definition of done for a feature:**
- Typescript clean, lint clean
- Manually testable from the UI (no "it works in the API")
- French strings via `next-intl`, no hardcoded text
- RLS verified (a second user cannot see the data)
- Mobile layout checked at 375px width
- Loading states + error states present
- A short note in the changelog section of `README.md`

**Never:**
- Add a dependency without justifying it
- Build something from section 3 (out of scope)
- Bypass RLS with the service role key in user-facing code paths
- Use the service role key client-side (it's server-only, period)
- Commit `.env.local` or any secret

---

## 11. Environment variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # server only, never exposed

# Anthropic
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Document any new variable in `.env.local.example` the moment it's introduced.

---

## 12. First-session task list (suggested order)

When the user starts a fresh session with Claude Code, build in this order:

1. Scaffold Next.js 15 + TS + Tailwind + shadcn/ui + pnpm
2. Wire Supabase: client/server helpers, middleware, login/signup pages. **On signup, auto-create a `workspace` row with `owner_id = user.id`** and an empty `firm_profile` linked to it.
3. Drizzle schema + first migration: `workspaces`, `firm_profile`, `clients`, `projects` (with `workspace_id` and `metadata jsonb` per section 6)
4. Settings page (firm profile CRUD)
5. Clients CRUD (list, create, edit, single page)
6. Projects CRUD (list, create, edit, single page with tabs scaffolded)
7. Files: Supabase Storage setup, upload, list, preview (PDF + images), versioning
8. Share links: generate, public viewer route, expiry
9. Contracts: schema, form, AI integration, TipTap editor, PDF export
10. Dashboard home: recent activity feed
11. PWA: manifest, service worker, install prompt
12. Polish: empty states, loading skeletons, error boundaries, mobile QA

Each item is a meaningful chunk — typically a 1-3 hour Claude Code session. Do not skip ahead; later items depend on earlier ones.

---

## 13. Long-term vision & SaaS positioning

This section is **strategic context, not implementation guidance**. It explains *why* the roadmap is shaped the way it is and *who* we're competing with. Do not build anything from this section directly — it informs design taste, not features.

### Who this is for, eventually

A Moroccan design professional running a practice of 1-10 people. Architect, decorator, interior designer, or hybrid studio. They:

- Manage 5-50 active projects, each lasting 3 months to 3 years
- Bill in MAD (occasionally EUR for expat clients) — fees are a percentage of construction cost or fixed lump sums
- Communicate primarily via WhatsApp, then email, rarely phone
- Use AutoCAD / Revit / SketchUp / Photoshop for production work
- Hate admin: contracts, devis, invoicing, permit tracking, supplier coordination
- Have no IT support and no patience for software that needs configuration

ArchiDesk wins by replacing a stack of 6+ tools (WhatsApp + Gmail + Excel + Word + Dropbox + paper) with one place.

### The four feature tiers (priority-ranked by frequency × differentiation)

**Tier 1 — daily habit (target for v1.1):**
WhatsApp forward-to-project, site visit mode, smart "Aujourd'hui" inbox, mood boards (decorators).

**Tier 2 — weekly stickiness (target for v1.2-v1.3):**
Devis builder, invoicing, client portal, e-signature, communication log per project, supplier CRM.

**Tier 3 — depth & defensibility (v2.0):**
DWG/IFC preview, plan annotation, permis tracker, bank reconciliation, AI-assisted file categorization and email drafting, AI extraction of supplier quotes into devis line items.

**Tier 4 — network effects (v3.0):**
Template marketplace, public portfolios, lead routing, Ordre National des Architectes partnership.

### Pricing model (target, subject to validation)

Three tiers, MAD/month, billed monthly or yearly (-20% yearly):

| Plan | Price | For | Limits |
|---|---|---|---|
| **Solo** | 199 MAD | Solo architect/decorator | 1 user, 10 active projects, 5 GB storage, 20 AI contracts/mo |
| **Studio** | 499 MAD | Small practice | 3 users, unlimited projects, 50 GB, 100 AI contracts, client portal, WhatsApp bot |
| **Agence** | 999 MAD | Established agency | 10 users, unlimited everything, marketplace listing, priority support |

14-day free trial, no card upfront. Schema and `workspace.plan` are scaffolded for this from MVP, but **billing enforcement is not built until v1.2**.

### Competitive landscape

We compete with:
- **Generic project tools** (Notion, Trello, Asana) — too generic, no contracts/devis/Moroccan specifics, no industry workflow
- **Vertical SaaS from Europe/US** (Monograph, Archisnapper, BQE Core) — expensive (often >$50/user/month), English-only, no MAD, no Moroccan legal/tax context
- **Local generic tools** (Sage, custom Excel) — no AI, no client portal, ugly, hard to use on mobile

Our defensible edge: **AI contracts grounded in Moroccan law** + **WhatsApp-native workflow** + **MAD/TVA/ICE/RC handled correctly** + **bilingual French/Arabic future**. None of those, individually, is hard. Together, in one polished product, it's a real moat for the Moroccan/Maghreb market.

### Vision in one sentence

**The default operating system for Moroccan design practices, the way Notion is for knowledge workers and Linear is for software teams.**

---

*Last updated: vision & decorator-readiness pass. Update this file when scope changes, never let it drift.*
