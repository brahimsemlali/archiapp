# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> This file is the source of truth for Claude Code. Read it at the start of every session before writing code. If something here is wrong or out of date, fix this file first, then code.

---

## 1. What we're building

**ArchiDesk** is a **vertical SaaS platform** for architects, decorators, and design studios across Morocco and the Maghreb. It is not a side project — the goal is a **$1M ARR business** within 24 months of launch.

The product replaces the chaos of WhatsApp + Excel + paper contracts + random Dropbox folders with one operating system where an entire design practice runs: from first client contact to final delivery, from initial devis to last payment, from site visit photos to signed invoices.

**Primary market:** Moroccan solo architects and small studios (1–10 people), working in French, billing in MAD, managing 5–30 active projects.

**Expansion market (18 months):** All of Morocco (architects + decorators + interior designers) → Algeria → Tunisia → Gulf (Arabic + multi-currency).

**Revenue model:** Subscription SaaS, 3 tiers. Target blended ARPU: 400 MAD/month. At 2,500 paying workspaces = 1M MAD/month ≈ $1M ARR.

**Positioning:** The operating system for Moroccan design professionals — the way Linear is for software teams, the way QuickBooks is for accountants. Category-defining, not feature-matching.

**Defensible moat:** AI contracts grounded in Moroccan law (Loi 016-89 + ONA barème) + WhatsApp-native workflow + MAD/TVA/ICE/RC handled correctly + bilingual French/Arabic. No European or American SaaS does all four.

---

## 2. Current product state — what is built

Everything listed here is **already in production** and must not be broken. Build on top of it.

### 2.1 Core modules (live)

**Projects & Clients**
- Full CRUD with soft delete (`archived_at`)
- Project phases: esquisse → APS → APD → PC → DCE → chantier → réception → terminé
- Kanban board view + list view (persisted in `localStorage`)
- Phase deliverables checklist (stored in `projects.metadata.checklist`)
- Inspiration board per project (images stored in `projects.metadata.inspirations`, grid layout)
- Permis de construire tracker — 5-stage PC workflow with doc checklists, deadlines, notes (stored in `permit_stages` table)
- Single project page tabs: Vue d'ensemble, Fichiers, Contrats, Devis, Factures, Livrables, Inspirations, Permis de construire, Notes, Chantier, Discussion
- Client detail page tabs: Projets, Contrats, Devis, Factures, Activité, Informations, **Portail** (with green dot indicator when active)

**Contracts**
- AI generation via Claude (`claude-sonnet-4-6`) anchored in Loi 016-89
- TipTap rich-text editor
- PDF export with firm letterhead
- Version history
- **E-signature**: canvas signature pad (mouse/touch) → SVG stored in `signatures` table; shown on client portal for finalized contracts; signature status shown on architect's contract page

**Files**
- Drag-and-drop upload, Supabase Storage
- Per-project folders (Plans, Rendus, Documents, Photos, Autre + custom)
- File versioning (v1, v2, …)
- PDF + image inline preview
- Signed share links (public, no login, configurable expiry)
- Client approval flow: `approval_status` (not_required / pending / approved / rejected), `approved_at`, `approval_note` on `files` table

**Devis (quotes)**
- Line-item builder, TVA 20%, PDF with letterhead
- Status flow: brouillon → envoyé → accepté / refusé / expiré
- Accept/reject tracking, expiry alerts

**Factures (invoices)**
- Sequential legally-required numbering (FA-YYYY-NNN)
- Mark-paid flow with `paid_at` timestamp
- PDF with payment banner
- Overdue highlighting + dashboard alerts
- Convert accepted devis → facture
- Edit page: `/factures/[id]/edit`

**Visites chantier (site visits)**
- Mobile-first entry: title, date, weather, attendees
- Per-zone observations with photos
- AI summary generation (Claude API)
- PDF report export

**Tasks & Agenda**
- Task CRUD: title, description, due date, priority (haute/moyenne/basse), status (à faire/en cours/terminé)
- Linked to project and/or client
- Task assignment to workspace members; "Mes tâches" filter
- Grouped list view with collapsible status sections, overdue alerts
- Unified calendar view (month grid): tasks + project deadlines + devis expiry + facture due dates + visites
- Selected-day side panel with event detail
- **Quick-create task from calendar**: "Nouvelle tâche" button in calendar header + "+" in right panel + "Ajouter une tâche ce jour" in day popup — all open a Dialog with `TaskForm` pre-filled with the selected date (`defaultDueDate` prop); `router.refresh()` on success
- `TaskForm` accepts `defaultDueDate?: string` prop to pre-fill date without triggering edit mode

**Time tracking**
- Real-time stopwatch (start/stop) with project + description
- Manual entry: project, phase, hours/mins, date, billable/non-billable
- Monthly stats: total / billable / non-billable
- Entries grouped by date, stored in `time_entries` table

**Financial reports** (`/rapports`)
- KPI cards: encaissé TTC, en attente, en retard, TVA collectée
- Monthly bar chart (billed vs paid)
- Quarterly TVA table (T1–T4) for tax declaration
- Aging buckets (current / 0–30 / 31–60 / >60 days) + overdue invoice list
- **Bank reconciliation** tab: CSV import (CIH/Attijari/BMCE format), auto-match to unpaid invoices by amount (exact or ±5%), one-click mark-paid

**Dashboard** (`/dashboard`)
- 4 financial KPI cards: encaissé ce mois (with % delta vs last month), à encaisser (with overdue badge), devis envoyés (total value), CA annuel
- Expiring devis alert strip (chips with days remaining, only shown when relevant)
- 3-column main panel: Facturation (overdue invoices red + pending invoices with due-date countdown), Projets actifs (phase badge + deadline countdown), right column (urgent tasks + next site visit + quick stats + activity feed)
- Firm setup banner when `firm_name` is null
- Quick-action buttons in header: "+ Devis" and "+ Projet"
- Route: `src/app/(app)/dashboard/page.tsx` (the old `src/app/(app)/page.tsx` was deleted)

**Global Search**
- Cmd+K command palette
- Searches: clients, projects, contracts, devis, factures
- Grouped results, keyboard-navigable

**Project portal** (`/portal/[token]`)
- Magic-link access via `share_links` table (`resource_type='project'`), no client account needed
- Shows: project phase progress, files by folder (with signed download URLs), contracts, firm contact info
- **E-signature**: finalized contracts show signature pad; signed contracts show confirmation with signer name + date
- Client can upload documents, respond to devis, send messages, approve/reject files
- Access counter tracked on `share_links`
- Components: `src/components/portal/portal-actions.tsx`

**Client portal** (`/portal/client/[token]`)
- Magic-link access via `share_links` table (`resource_type='client'`), no client account needed
- Aggregates **all** data associated with the client across all projects
- Sections: Projets (phase stepper per project), Contrats (e-signature), Devis (accept/refuse + PDF download), Factures (status + PDF download), Comptes-rendus (site visits + meeting notes), Inspirations (linked moodboards), Historique (activity timeline), Discussion (messaging)
- Sticky header (firm branding + logo) + sticky section nav bar
- PDF downloads: `/api/portal/client/[token]/devis/[id]/pdf` and `/api/portal/client/[token]/factures/[id]/pdf`
- Client sends messages → stored in `portal_messages` with `client_id`, `project_id=null`
- Architect replies from client profile "Portail" tab → `replyToClientPortalAction`
- Activity timeline with color-coded icons per action type
- Components: `src/components/portal/client-portal-actions.tsx`
- **Manage from client profile**: "Portail" tab in `/clients/[id]` — create/regenerate/revoke link, copy URL, see access count + last visit, message thread with reply form

**Multi-user workspaces**
- `workspace_members` + `workspace_invites` tables
- Roles: owner / admin / member / viewer
- Invite by email → token link → `src/app/invite/[token]/page.tsx`
- Team management UI in settings
- All RLS uses `workspace_members` (not `owner_id`) — zero schema change needed for future role extensions

**Comments**
- `comments` table: polymorphic `(resource_type, resource_id)` — works on any entity
- `CommentsSection` component wired into project "Discussion" tab
- Author initials avatar, relative timestamps, delete own comments

**Subcontractor CRM**
- `subcontractors` table with trade categories (19 options), star ratings (1–5), CNSS/RIB
- Card grid layout with search by name/trade
- Inline edit via Sheet

**Moodboards** (`/moodboards`)
- Standalone moodboards (not project-scoped), optionally linked to a client
- `moodboards` table: `workspace_id`, `client_id`, `title`, `description`, `items jsonb`, `created_at`, `updated_at`
- `items` is a JSONB array of `InspirationItem` (`id`, `url`, `caption`, `source`, `uploadedAt`)
- Masonry grid display using CSS `columns-*`; images rendered via plain `<img>` (not `<Image>`) to avoid Next.js domain restrictions
- Two ways to add images:
  1. **Upload**: drag/click file → uploaded to `project-files` Supabase Storage at `{workspaceId}/moodboards/{moodboardId}/{timestamp}.{ext}`; public URL stored in `items[].url`
  2. **Paste a link**: any web page URL → server fetches `og:image` + `og:title` from HTML; direct image URLs used as-is — the external URL is stored directly in `items[].url` (no server-side re-hosting); original URL stored in `items[].source`
- `addMoodboardLinkAction` in `src/lib/actions/moodboards.ts`: validates URL, extracts og:image/title, stores URL directly (no download/re-host)
- `MoodboardBoard` component: two-tab form (Télécharger / Coller un lien), optimistic UI updates, trash-to-remove with rollback
- Moodboards linked to a client are shown in the client portal under "Inspirations"

**AI features**
- Project summary: reads project + tasks + devis + factures + visits → 150-200 word French briefing via `AiSummaryButton` on project overview
- Client email draft: context-aware professional French email (`generateClientEmailAction`)
- File classification: rule-based folder suggestion (no AI call), `classifyFileAction`
- Site visit summary: Claude generates structured summary from observations
- Meeting intelligence: AI summary + decisions extraction from meeting notes

**Settings**
- Firm profile: logo, name, architect name, ICE, RC, IF, CNSS, patente, address, phone, email, IBAN
- **Localisation section**: country (pack), currency, default tax rate — drives money display + tax defaults app-wide (timezone auto-derived from country)
- **Portfolio settings**: slug, enabled toggle, tagline, specialties — controls public portfolio page
- Team members management

**Public portfolio pages** (`/p/[slug]`)
- Publicly accessible, no auth
- Shows firm branding, project cards with cover image from inspiration board
- Configurable via settings: slug, tagline, specialties
- Pulls from `firm_profile.slug + portfolio_enabled + portfolio_featured_project_ids`
- SEO metadata via `generateMetadata`

**Localization (French + English + Arabic)**
- `src/messages/fr.json` — complete French
- `src/messages/en.json` — complete English
- `src/messages/ar.json` — complete Arabic translation
- Locale stored in cookie (`locale`), switched via `setLocaleAction`
- `dir="rtl"` set dynamically on `<html>` when `locale === "ar"`
- Cairo font for Arabic, Plus Jakarta Sans for French/Latin
- Language switcher in sidebar bottom section

**Push notifications (browser)**
- `push_subscriptions` table
- `PushNotificationToggle` in sidebar — requests permission, subscribes via `PushManager`
- Service worker handles `push` + `notificationclick` events
- Server-side sender in `src/lib/push.ts` (requires `web-push` package + VAPID keys)
- VAPID config via `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY`

**PWA**
- `manifest.json`, service worker (`public/sw.js` — cache-first static, network-first navigation)

**Additional modules (live)**
- `/bareme` — ONA fee schedule reference
- `/boq` — Bill of quantities (BOQ) with line items, linked to projects
- `/workload` — Team workload view
- `/prospects` — Lead/prospect CRM
- `/fournisseurs` — Supplier management
- `/templates` — Contract/devis template library

### 2.2 Infrastructure

- Supabase Auth (email + Google OAuth)
- RLS on every table — workspace isolation via `workspace_members`
- `workspace_id` on every business row
- `metadata jsonb` on clients, projects, contracts, files (extension-ready)
- Soft delete everywhere (`archived_at`)
- Activity log for all mutations (`activity_log.client_id` populated when action is client-scoped)
- next-intl i18n (French + Arabic, locale cookie-based)
- PWA manifest + service worker with push notification support
- **Next.js 16 middleware**: `src/proxy.ts` (NOT `src/middleware.ts` — that file must not exist, it conflicts with Next.js 16)

---

## 3. Database tables (all live in Supabase)

| Table | Key columns |
|---|---|
| `workspaces` | `id`, `owner_id`, `name`, `plan`, `trial_ends_at`, `stripe_customer_id`, `account_status` |
| `workspace_members` | `workspace_id`, `user_id`, `role` (owner\|admin\|member\|viewer), `joined_at` |
| `workspace_invites` | `workspace_id`, `email`, `role`, `token`, `status` (pending\|accepted\|revoked), `expires_at` |
| `firm_profile` | `workspace_id` PK, `firm_name`, `architect_name`, `logo_url`, `iban`, `ice`, `rc`, `if_number`, `cnss`, `patente`, `address`, `phone`, `email`, `slug`, `portfolio_enabled`, `portfolio_tagline`, `portfolio_specialties`, `portfolio_featured_project_ids`, `country`, `currency`, `timezone`, `default_tax_rate` (last 4 = localization, migration `20260612_worldwide_localization.sql` — **applied 2026-06-15**, all defaulted to Morocco pack) |
| `clients` | `workspace_id`, `name`, `type`, `phone`, `email`, `address`, `ice`, `cin`, `notes`, `metadata jsonb`, `archived_at` |
| `projects` | `workspace_id`, `client_id`, `title`, `type`, `address`, `surface_m2`, `phase`, `status`, `budget_estimate_centimes`, `fees_centimes`, `start_date`, `target_end_date`, `notes`, `metadata jsonb` (checklist + inspirations), `archived_at` |
| `contracts` | `workspace_id`, `project_id`, `client_id`, `type`, `title`, `content_json`, `content_html`, `ai_model`, `status`, `version`, `parent_contract_id` |
| `signatures` | `contract_id` (unique), `signer_name`, `signer_email`, `signed_at`, `svg_data`, `ip_address` — RLS via contracts join |
| `files` | `workspace_id`, `project_id`, `folder`, `filename`, `storage_path`, `size_bytes`, `mime_type`, `version`, `parent_file_id`, `note`, `approval_status`, `approved_at`, `approval_note` |
| `share_links` | `workspace_id`, `resource_type` (enum: project\|client\|file), `resource_id`, `token`, `expires_at`, `accessed_count`, `last_accessed_at` |
| `activity_log` | `workspace_id`, `project_id`, `client_id`, `action`, `metadata jsonb` |
| `devis` | `workspace_id`, `project_id`, `client_id`, `number`, `title`, `items jsonb`, `subtotal_centimes`, `tva_rate`, `tva_centimes`, `total_centimes`, `valid_until`, `status`, `metadata jsonb`, `updated_at` |
| `factures` | `workspace_id`, `project_id`, `client_id`, `devis_id`, `number`, `title`, `items jsonb`, `subtotal_centimes`, `tva_centimes`, `total_centimes`, `due_date`, `paid_at`, `status` |
| `site_visits` | `workspace_id`, `project_id`, `title`, `visit_date`, `weather`, `attendees`, `observations jsonb`, `summary` |
| `meeting_notes` | `workspace_id`, `project_id`, `title`, `meeting_date`, `summary`, `decisions jsonb` |
| `tasks` | `workspace_id`, `project_id`, `client_id`, `title`, `description`, `due_date`, `priority`, `status`, `assigned_to` (FK auth.users), `archived_at` |
| `time_entries` | `workspace_id`, `project_id`, `user_id`, `phase`, `description`, `duration_minutes`, `date`, `billable`, `rate_centimes` |
| `comments` | `workspace_id`, `resource_type`, `resource_id`, `author_id`, `body`, `mentions jsonb`, `resolved_at` |
| `permit_stages` | `workspace_id`, `project_id`, `stage`, `status`, `deadline`, `docs jsonb`, `notes`, `completed_at` |
| `subcontractors` | `workspace_id`, `name`, `trade`, `phone`, `email`, `address`, `cnss`, `rib`, `rating`, `notes`, `archived_at` |
| `moodboards` | `workspace_id`, `client_id` (nullable), `title`, `description`, `items jsonb`, `created_at`, `updated_at` |
| `portal_messages` | `workspace_id`, `project_id` (nullable), `client_id` (nullable), `share_token`, `sender` (client\|architect), `sender_name`, `body` |
| `push_subscriptions` | `workspace_id`, `user_id`, `endpoint`, `p256dh`, `auth` |
| `templates` | `workspace_id`, `type`, `title`, `content_json`, `content_html` |
| `prospects` | `workspace_id`, `name`, `email`, `phone`, `status`, `notes`, `metadata jsonb` |
| `suppliers` | `workspace_id`, `name`, `trade`, `phone`, `email`, `address`, `notes`, `archived_at` |

### RLS pattern (current — workspace_members-based)

```sql
create policy "ws_select" on <table>
  for select using (workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));
```

**Special RLS cases:**
- `signatures`: no `workspace_id` — RLS via `contracts` join: `exists (select 1 from contracts c join workspace_members wm on wm.workspace_id = c.workspace_id where c.id = signatures.contract_id and wm.user_id = auth.uid())`
- `portal_messages`: workspace_members-based for architect reads/writes; public portal inserts use service client (bypasses RLS)
- Public portal pages (`/portal/*`, `/share/*`): use `createServiceClient()` — explicitly bypass RLS

---

## 4. What to build next — roadmap

> **Internationalization track:** `worldwide.md` (repo root) is the living roadmap for going global (country packs, W1–W9). W1 (localization foundation) shipped 2026-06-12. Its "config, not constants" rule applies to ALL new code (see §9).

### Phase A — Monetization (BUILT — on LemonSqueezy, not Stripe; remaining: go-live verification)

**Billing & subscriptions — LIVE on LemonSqueezy** (merchant of record)
- Checkout + webhook: `src/lib/billing/lemonsqueezy.ts` + `src/app/api/billing/lemonsqueezy/webhook/route.ts`
- Env: `LEMON_SQUEEZY_API_KEY`, `LEMON_SQUEEZY_STORE_ID`, `LEMON_SQUEEZY_STUDIO_VARIANT_ID`, `LEMON_SQUEEZY_AGENCE_VARIANT_ID`, `LEMON_SQUEEZY_WEBHOOK_SECRET`, `LEMON_SQUEEZY_TEST_MODE`
- Plan limits enforced: `src/lib/billing/guards.ts` (`assertSeatAvailable`, `assertProjectAvailable`, `assertStorageAvailable`) + `PLAN_LIMITS` in `src/lib/billing/plans.ts` — Solo (1 user, 10 projects, 5 GB, 20 AI calls/mo), Studio (3 users, unlimited projects, 50 GB, 100 AI calls), Agence (10 users, unlimited)
- AI usage metering: `src/lib/ai/usage.ts` (`assertAiUsageAvailable` / `recordAiUsage`)
- 14-day free trial, no card upfront (`workspaces.trial_ends_at` + `TrialBanner` in app layout); plan usage indicators in settings (`plan-usage.tsx`)
- **REMAINING:** production go-live check (real store keys, `LEMON_SQUEEZY_TEST_MODE=false`); CMI or PayDunya for Moroccan cards (later, alternative payment method)

### Phase B — AI depth

**WhatsApp bot** (highest-leverage Moroccan feature)
- Meta Cloud API: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`
- Architect forwards message/photo/PDF → Claude matches project → files + notes it
- AI devis extraction: upload supplier PDF → extract `{description, quantity, unit, unitPriceCentimes}[]` → pre-populate devis builder

**Push notifications — activate**
- `web-push` package not yet installed (`pnpm add web-push @types/web-push`)
- Generate VAPID keys: `npx web-push generate-vapid-keys`
- Add to `.env.local`: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- Wire `sendPushNotification()` from `src/lib/push.ts` to: task due today, facture overdue, devis about to expire, new comment mention

### Phase C — Client portal depth (core portal is LIVE — remaining items below)

**E-signature improvements**
- Embed signature as visual element in contract PDF export
- Email notification to client when signature is complete
- Audit trail page in architect view

**Client-facing invoice payment**
- Payment link (LemonSqueezy or CMI) in portal invoice view
- Auto-mark facture paid on webhook

**Project portal PDF downloads**
- Add `/api/portal/[token]/devis/[id]/pdf` and `/api/portal/[token]/factures/[id]/pdf` routes
- Currently only client portal (`/portal/client/[token]`) has these; project portal (`/portal/[token]`) does not

### Phase D — Operations depth

**DWG / IFC / RVT preview**
- Autodesk Platform Services (APS): `APS_CLIENT_ID`, `APS_CLIENT_SECRET`
- Server-side token exchange, pass-through to client
- Premium plan feature

**Plan annotation**
- Fabric.js or Konva canvas layer over PDF plans
- Rectangles, circles, lines, text labels, arrows
- Save as separate annotation layer; export annotated PDF

### Phase E — Mobile

**Capacitor app**
- Wrap PWA → App Store + Google Play
- Native camera (site visits), biometric auth, haptic feedback

**Email + SMS notifications**
- `RESEND_API_KEY` for transactional email
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` for SMS

### Phase F — Platform

**Template marketplace**
- Architects share/sell contract templates, devis templates, phase checklist presets
- `templates` table, 70/30 revenue share

**Lead routing**
- `archidesk.ma/trouver-un-architecte` — clients post briefs, architects respond
- Phase F only after 500+ active workspaces

---

## 5. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16** (currently v16.2.4) App Router | Server components, server actions |
| Language | **TypeScript strict** | `noUncheckedIndexedAccess: true` |
| Styling | **Tailwind CSS v4** + **shadcn/ui** | Blue primary `oklch(0.488 0.243 264.376)` |
| Fonts | **Plus Jakarta Sans** (app LTR) + **Cairo** (Arabic/RTL) + **Fraunces** (in-app page titles) + **Geist / Geist Mono** (landing) | Variables `--font-jakarta`, `--font-cairo`, `--font-fraunces`, `--font-geist`, `--font-geist-mono` (all in `src/app/layout.tsx`) |
| Forms | **react-hook-form** + **zod v4** | Zod = single source of truth |
| DB / Auth / Storage | **Supabase** | RLS via workspace_members, mandatory |
| AI | **Anthropic SDK** `@anthropic-ai/sdk`, model `claude-sonnet-4-6` | |
| Rich text | **TipTap v3** | Contract editor |
| PDF | **@react-pdf/renderer** server-side | All PDF templates |
| i18n | **next-intl v4** | French + Arabic, locale from cookie |
| Dates | **date-fns v4** `fr` locale | Africa/Casablanca timezone |
| Billing | **LemonSqueezy** (merchant of record) | LIVE — checkout + webhook (`src/lib/billing/`); CMI/PayDunya later for local cards |
| Email | **Resend** | Phase E — NOT YET BUILT |
| SMS | **Twilio** | Phase E — NOT YET BUILT |
| WhatsApp | **Meta Cloud API** | Phase B — NOT YET BUILT |
| Push | **web-push** | Package NOT YET INSTALLED — run `pnpm add web-push @types/web-push` |
| CAD preview | **Autodesk Platform Services** | Phase D — NOT YET BUILT |
| Mobile | **Capacitor** | Phase E — NOT YET BUILT |
| Deployment | **Vercel** | |
| Package manager | **pnpm** | |

---

## 6. Directory structure

```
src/
├── app/
│   ├── (app)/                    # Authenticated app (auth guard in layout)
│   │   ├── layout.tsx            # Sidebar + Header + PwaRegister + LanguageSwitcher
│   │   ├── dashboard/            # Dashboard (stats, alerts, activity) — at /dashboard
│   │   ├── bareme/               # ONA fee schedule reference
│   │   ├── boq/                  # Bill of quantities
│   │   ├── clients/              # Clients CRUD + detail (with Portail tab)
│   │   ├── contracts/            # Contracts list + detail (TipTap editor)
│   │   ├── devis/                # Quotes list + detail + edit
│   │   ├── factures/             # Invoices list + detail + edit
│   │   ├── fournisseurs/         # Supplier management
│   │   ├── moodboards/           # Standalone moodboards
│   │   ├── projects/             # Projects list (kanban+list), detail (9 tabs), files, notes, visites
│   │   ├── prospects/            # Lead/prospect CRM
│   │   ├── rapports/             # Financial reports + bank reconciliation
│   │   ├── settings/             # Firm profile + portfolio + team members
│   │   ├── subcontractors/       # Subcontractor CRM
│   │   ├── tasks/                # Tasks list + calendar
│   │   ├── templates/            # Contract/devis templates
│   │   ├── time/                 # Time tracking
│   │   └── workload/             # Team workload view
│   ├── (auth)/                   # login, signup
│   ├── api/
│   │   ├── ai/digest/            # AI digest streaming
│   │   ├── contracts/[id]/pdf/   # Authenticated contract PDF
│   │   ├── devis/[id]/pdf/       # Authenticated devis PDF
│   │   ├── factures/[id]/pdf/    # Authenticated facture PDF
│   │   ├── portal/client/[token]/devis/[id]/pdf/    # Public client portal devis PDF
│   │   ├── portal/client/[token]/factures/[id]/pdf/ # Public client portal facture PDF
│   │   └── visites/summarize/    # AI site visit summary
│   ├── invite/[token]/           # Team invite acceptance (public, no auth guard)
│   ├── onboarding/               # Firm setup (redirects to /dashboard when done)
│   ├── account-suspended/        # Suspended workspace page
│   ├── p/[slug]/                 # Public portfolio pages (ISR-ready)
│   ├── portal/
│   │   ├── [token]/              # Project portal (service role, public)
│   │   └── client/[token]/       # Client portal — all client data aggregated
│   ├── share/[token]/            # File share viewer
│   └── layout.tsx                # Root layout (Cairo+Jakarta+Fraunces fonts, dir RTL/LTR, next-intl)
├── components/
│   ├── localization-provider.tsx # LocalizationProvider + useLocalization() — workspace currency/tax in client components
│   ├── comments/                 # CommentsSection (polymorphic)
│   ├── contracts/                # ContractEditor, SignaturePad, SignaturePadPortal
│   ├── layout/                   # Sidebar, Header, MobileNav, SearchModal, LanguageSwitcher, PushNotificationToggle
│   ├── portal/
│   │   ├── portal-actions.tsx    # Project portal client components (PortalDevisResponse, PortalMessageForm, etc.)
│   │   └── client-portal-actions.tsx  # Client portal components (ClientPortalShare, ArchitectReplyForm, etc.)
│   ├── projects/                 # PhaseChecklist, InspirationBoard, PermitTracker, AiSummaryButton, Kanban
│   ├── rapports/                 # FinancialReports, BankReconciliation
│   ├── settings/                 # SettingsForm, TeamMembers, PortfolioSettings
│   └── [other modules]/          # clients, devis, factures, files, subcontractors, tasks, time, visites
├── lib/
│   ├── actions/                  # All server actions (one file per domain)
│   ├── ai/                       # anthropic.ts (model constant), prompts/contract.ts
│   ├── billing/                  # guards.ts (assertSeatAvailable, assertProjectAvailable, assertStorageAvailable), plans.ts
│   ├── constants.ts              # PHASE_ORDER (stable DB keys), PHASE_COLORS. Phase/status/deliverable LABELS are i18n (messages: phase, status.project, phaseDeliverables) — see worldwide.md W3
│   ├── country-packs.ts          # CountryPack registry (MA/DZ/TN/FR/AE/SA/INTL) + resolveLocalization — see worldwide.md
│   ├── format.ts                 # formatMoney (currency-aware), formatMAD (deprecated), formatDate/formatDateShort/formatDayMonth/formatDateIntl (locale+tz aware via date-fns-tz), formatRelative, formatFileSize
│   ├── formatters-server.ts      # getServerFormatters(timeZone?) — locale-aware date formatters for server components
│   ├── localization.ts           # getWorkspaceLocalization(supabase, workspaceId) — server helper
│   ├── i18n/request.ts           # next-intl config — locale from cookie
│   ├── push.ts                   # sendPushNotification() server utility
│   ├── supabase/                 # client.ts, server.ts (createClient + createServiceClient), middleware.ts
│   ├── validators/               # Zod schemas per entity
│   └── workspace.ts              # getWorkspaceId() — reads workspace_members, shared by all actions
└── messages/
    ├── fr.json                   # French (complete)
    ├── en.json                   # English (complete)
    └── ar.json                   # Arabic (complete)
```

---

## 7. AI usage guide

**Model:** always `claude-sonnet-4-6` (constant `AI_MODEL` in `src/lib/ai/anthropic.ts`). Use `claude-haiku-4-5` for background classification where speed matters.

**Active AI features:**
- Contract generation — `src/lib/ai/prompts/contract.ts` — versioned prompt, Moroccan law anchored
- Site visit summary — `generateSiteSummaryAction` — observations → 300-word French summary
- Project summary — `generateProjectSummaryAction` — project context → 150-200 word French briefing
- Client email draft — `generateClientEmailAction` — context → professional French email
- File classification — `classifyFileAction` — rule-based (no API call), fast and free
- Meeting intelligence — AI summary + decisions from meeting notes

**AI rules (never break):**
- Never invent legal article numbers
- Always show "Ce document est généré par IA" disclaimer on contracts
- Store `ai_model` + `ai_prompt_version` on every AI-generated document
- Cap AI costs: check plan limits before calling the API (Phase A billing required)

---

## 8. Design system

**Style:** Swiss/minimalism — clean whitespace, no decorative elements.

**Primary color:** `#2563EB` blue — unified across the app **and** the landing (in-app was `#2A45F0` before the 2026-06 cohesion repaint).

**Background:** cool `#F7F8FA` body, `white` cards, `#E5E7EB` borders. The app uses a **cool slate/blue** neutral ramp — ink `#0B1220`, ink-2 `#1E293B`, muted `#475569`/`#64748B`. Realigned from the earlier warm-ivory palette in the 2026-06 repaint. Theme tokens live in `src/app/globals.css` (`:root`). **Don't reintroduce warm hexes** (`#16170E`, `#82806F`, `#E8E6DF`, `#F7F7F4`).

**Sidebar:** White, 256px, grouped nav sections, blue active state with left border indicator, language switcher + push toggle + settings + logout at bottom.

**Typography:** In-app — Plus Jakarta Sans (LTR), Cairo (Arabic), Fraunces (page titles via `.page-title` / `.section-title`). Landing — Geist + Geist Mono (scoped under `.adl`). Scale: 10/11/12/13/14/16/18/24/32.

**Motion:** 150–300ms ease-out for entrances, no decorative animation.

**Icons:** Lucide React only.

**Cards:** `border-slate-100 bg-white`, `hover:shadow-md hover:-translate-y-0.5` on interactive cards.

**RTL:** `dir="rtl"` on `<html>` for Arabic. Tailwind logical properties (`start-*`, `end-*`) for RTL-safe spacing. Toaster position flips to `top-left`.

**Portal pages** (`/portal/*`): `bg-[#F7F6F3]`, max-w-3xl, sticky firm header + sticky section nav, card-based sections with `rounded-2xl border-gray-100 shadow-sm`.

**Landing page** (`/` → `src/components/landing/landing-page.tsx`): a faithful React port of the Claude Design handoff — **Geist + Geist Mono**, blueprint motifs, `#2563EB`, an animated Gantt dashboard mockup + cycling AI insight feed. **All landing CSS is scoped under a `.adl` root** (a `<style>` block in the component) so it never collides with the app theme — keep it that way. Trilingual **FR (default) / EN** with a locale switcher; pricing tiers render from `PLAN_LIMITS`; all marketing copy is **grounded in real, shipped features** (no fabricated firms or unbuilt claims). Responsive (the heavy dashboard hides below 1024px).

**Client-facing surfaces intentionally stay warm** and were excluded from the cool repaint: the client/project portals (`/portal/*`, `bg-[#F7F6F3]`) and the public portfolio (`/p/*`). Don't sweep them cool without a deliberate decision.

---

## 9. Coding conventions

- **TypeScript strict**, `noUncheckedIndexedAccess: true` — no `any`, no `!` assertions without a comment
- **Server Components by default.** `"use client"` only for interactivity, browser APIs, hooks
- **Server Actions for all mutations.** API routes only for: webhooks, public share-link PDF export, AI streaming
- **Zod schema = single source of truth** — infer types, reuse client + server
- **Money = integers in centimes** — convert only at input edge and display edge. Display via `formatMoney(centimes, currency)` (`src/lib/format.ts`); in client components use `useLocalization().money` (provider in `(app)/layout.tsx`); in server code resolve currency via `resolveLocalization(firmProfileRow)` (`src/lib/country-packs.ts`) or `getWorkspaceLocalization(supabase, workspaceId)` (`src/lib/localization.ts`). `formatMAD` is a deprecated MAD-only shorthand.
- **Config, not constants (worldwide.md rule):** currency, tax rate/label, timezone come from the workspace's country pack (`firm_profile.country/currency/timezone/default_tax_rate`, fallback = Morocco pack). Never hardcode "DH", literal TVA `20`, or `Africa/Casablanca` in new code. When selecting from `firm_profile`, use `select("*")` (named selects break on pre-migration databases).
- **Dates UTC in DB, displayed locale + workspace-timezone aware.** Never call `toLocaleDateString("fr-FR")` or hardcode a locale in new code. Client: `useLocalization().formatDate/formatDateShort/formatDayMonth/formatDateParts/formatRelative`. Server components: `const { formatDate, … } = await getServerFormatters(timezone)` (`src/lib/formatters-server.ts`) — destructure with the same names so call sites read normally. Default timezone Africa/Casablanca; pass the real workspace tz where localization is already loaded. PDFs / `/admin` / AI-prompt strings stay FR by design.
- **All strings via next-intl** — no hardcoded French in JSX
- **Result<T> pattern** from `src/types/index.ts` — all server actions return `{ ok: true, data }` or `{ ok: false, error: string }`
- **`getWorkspaceId(supabase)`** from `src/lib/workspace.ts` — use in every action, never inline the query
- **No inline Supabase calls in components** — mutations via `src/lib/actions/`, reads in server components
- **File naming:** `kebab-case` files, `PascalCase` components, `camelCase` functions
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`)

### Portal-specific conventions

- **Project portal actions** (`/lib/actions/portal.ts`): `getValidProjectShareLink(token)` validates `resource_type='project'`; `getValidClientShareLink(token)` validates `resource_type='client'`
- **Client portal revoke** = `update expires_at = now()` (keeps history), not delete
- **Client-level messages**: insert `portal_messages` with `client_id`, `project_id=null`
- **Architect replies to client portal**: require active share link (`is("expires_at", null)`) to find the token for `share_token` field

---

## 10. Environment variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only — createServiceClient()

# Anthropic
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Billing (LemonSqueezy — LIVE)
LEMON_SQUEEZY_API_KEY=
LEMON_SQUEEZY_STORE_ID=
LEMON_SQUEEZY_STUDIO_VARIANT_ID=
LEMON_SQUEEZY_AGENCE_VARIANT_ID=
LEMON_SQUEEZY_WEBHOOK_SECRET=
LEMON_SQUEEZY_TEST_MODE=true     # set to false for production go-live

# Push Notifications (generate: npx web-push generate-vapid-keys)
# Also install: pnpm add web-push @types/web-push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=mailto:admin@archidesk.ma

# Email (Phase E)
RESEND_API_KEY=

# SMS (Phase E)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# WhatsApp (Phase B)
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=

# CAD preview (Phase D)
APS_CLIENT_ID=
APS_CLIENT_SECRET=
```

---

## 11. Working with Claude Code

**At the start of every session:**
1. Read this file
2. Run `pnpm typecheck && pnpm lint` — must be clean before any changes
3. Check `git status` — never commit on top of uncommitted work

**When making changes:**
- For tasks touching > 3 files or DB schema: propose a plan first
- Run `pnpm typecheck && pnpm lint` after every meaningful change
- Update `.env.local.example` when adding env vars
- Update this file when scope or architecture changes

**Definition of done:**
- `pnpm typecheck` → 0 errors
- `pnpm lint` → 0 errors (pre-existing warnings acceptable)
- Feature manually testable from the UI
- Loading + error states present
- Mobile layout works at 375px
- RLS isolation verified (another workspace cannot see the data)

**Known pre-existing lint warnings (ignore):**
- `@typescript-eslint/no-unused-vars` on some Supabase query destructuring
- `PC_STAGES` in permit-stages.ts assigned but only used as type

**Critical architecture facts:**
- Next.js 16 uses `src/proxy.ts` as the middleware entry point — **`src/middleware.ts` must NOT exist** (causes conflict)
- Authenticated users on `/login` or `/signup` are redirected to `/dashboard` (not `/onboarding`)
- The dashboard is at `/dashboard` — there is no `src/app/(app)/page.tsx`
- `createServiceClient()` is ONLY for: public portal routes, admin panel, service-level ops where RLS must be bypassed. Never use it in authenticated user-facing pages where regular RLS works.
- `signatures` table has no `workspace_id` — its RLS policy joins through `contracts`. Use `createClient()` (not service client) for reading signatures in the authenticated app.

**Never:**
- Use the Supabase service role key in client-side or user-facing server code (`createServiceClient()` is server-only — used for admin API and public portal pages that bypass RLS)
- Hard-code French strings in JSX (use next-intl)
- Store money as floats
- Call the Anthropic API without checking plan limits first (Phase A)
- Bypass RLS in authenticated app routes
- Create `src/middleware.ts` — it conflicts with `src/proxy.ts` in Next.js 16

---

## 12. Competitive intelligence

| Competitor | Price | Gap ArchiDesk fills |
|---|---|---|
| Monograph (US) | $49/user/mo | English-only, no MAD, no Moroccan law, no WhatsApp |
| Archisnapper (BE) | €39/user/mo | Site visits only, no contracts/devis/invoicing |
| BQE Core (US) | $29+/user/mo | Enterprise-focused, complex, no Morocco/Maghreb |
| Notion / Asana | $10–20/user/mo | Generic, no industry workflow, no AI contracts |
| Local Excel/Word | Free | No AI, no client portal, no PDF, no search |

---

## 13. Revenue milestones

| Milestone | Target | Key features required |
|---|---|---|
| First 10 paying users | Month 1–2 | Core app (current) + billing |
| 100 paying workspaces | Month 4–6 | Billing + client portal e-signature + push notifications |
| 500 paying workspaces | Month 9–12 | Multi-user + WhatsApp + mobile app |
| 2,500 workspaces (~$1M ARR) | Month 18–24 | Full platform + Arabic + marketplace |

---

*Last updated: 2026-06-01 — **Landing page fully rebuilt** (faithful Claude Design port in `src/components/landing/landing-page.tsx`: Geist + Geist Mono, blueprint motifs, animated Gantt mockup + AI feed, trilingual FR/EN, pricing from `PLAN_LIMITS`, all copy grounded in real features; CSS scoped under `.adl`). **In-app cohesion repaint** warm-ivory → cool slate/blue, accent unified to `#2563EB`; client portal + public portfolio deliberately kept warm. Added **Geist/Geist Mono** fonts. **AI subsystem hardening**: safe message-text extraction (`messageText`), try/catch on `/api/ai/*` routes, meeting-JSON `safeParse` + retry. **UX fixes**: dashboard greeting uses architect/firm name (not email prefix); devis + facture line-items reflow on mobile; dashboard stat chips moved to next-intl ICU plurals (fr/en/ar). **Note:** billing is on **LemonSqueezy** (checkout + webhook live), not Stripe — §4 (roadmap Phase A) and §5 (tech-stack Billing row) still said Stripe at the time *(fixed 2026-06-12: §4/§5/§10 now reflect LemonSqueezy)*. Next priority: confirm billing env/go-live readiness.*

*Update 2026-06-02 — **Legal pages completed**: full set of 5 public routes (`/mentions-legales`, `/terms` CGU, `/cgv`, `/privacy`, `/cookies`) sharing `src/components/legal/legal-shell.tsx`, all driven by a single source of truth `src/lib/legal.ts` (fill its `TODO(...)` éditeur fields to "finalize" → `isLegalEntityConfigured()` then hides the completeness notice on every page; CGV pricing renders from `PLAN_LIMITS`). Dropped the orange "brouillon" banner per founder decision (lawyer-review caveat kept as a code comment — still needs a juriste). Added a **required consent checkbox** to signup (auth i18n `acceptTerms`/`acceptRequired`, fr/en/ar) + legal links in landing footer (FR/EN) and settings. **Fixed:** legal routes are now in the `isLegalPage` allowlist in `src/lib/supabase/middleware.ts` — previously the auth middleware bounced logged-out visitors to `/login`, silently breaking even the pre-existing `/terms` footer links. Legal page bodies are FR-only (jurisdiction language) by design.*

*Update 2026-06-04 — **Moodboard PDF export** (the "well-presented planche to send the client"). New: `src/lib/pdf/moodboard-template.tsx` (warm client-facing palette — cover page + uniform 2-col grid that paginates cleanly, tiles `wrap={false}`, fixed footer + page numbers), `src/lib/pdf/moodboard-images.ts` (server-side normalization — uploaded items via `storage.download(path)`, links via SSRF-safe `fetchPublicHttpUrl`; every image transcoded to JPEG with **sharp** so webp/avif uploads + Pinterest links all render; per-image try/catch skips dead links; bounded concurrency 6; **`normalizeLogo()`** transcodes the firm logo to a PNG data URI — a webp logo passed raw to react-pdf `<Image>` renders as a blank reserved box, not a crash, so the cover lost its branding + gained an empty gap; null fallback omits it cleanly), authed route `src/app/api/moodboards/[id]/pdf/route.ts` (`runtime="nodejs"`, `maxDuration=60`), and a "Télécharger le PDF" button on the moodboard detail page (shown when `items.length>0`). **New dependency: `sharp`** (added as a direct dep; was already a transitive dep of Next, so no new binary). **Fixed a latent SSRF-fetch bug:** `requestWithPinnedLookup` in `src/lib/server/url-safety.ts` used the legacy 3-arg `lookup` callback, which throws `Invalid IP address: undefined` under Node 20+ `autoSelectFamily` (default-on) — i.e. `fetchPublicHttpUrl` was broken for **every** host (also breaks moodboard link og:image extraction). Now passes the verified-public address array (`callback(null, addresses)`), preserving the SSRF pin. **Known v1 gaps:** PDF body is FR-only + the button label is hardcoded French (matches the moodboards module, which is not yet i18n'd); failed images drop silently (cover "RÉFÉRENCES" reflects only what rendered — no "N couldn't load" notice yet); not wired into the client portal "Inspirations" section (architect downloads + sends manually). `maxDuration=60` needs Vercel Pro (hobby caps at 10s).*

*Update 2026-06-04b — **Logo fix extended to ALL PDF routes.** The webp-logo→blank-box bug wasn't moodboard-specific: `devis`, `facture`, and `meeting` templates all render `<Image src={firm.logo_url}>` raw (contract template has no logo). Extracted the helper to **`src/lib/pdf/logo.ts`** (`normalizeLogo()` + generic **`withNormalizedLogo(firm)`** that returns the firm with `logo_url` swapped for a PDF-safe PNG data URI). Applied `withNormalizedLogo` in every logo-bearing route: `api/devis/[id]/pdf`, `api/factures/[id]/pdf` (both the sent-snapshot **and** live paths), `api/meeting-notes/[id]/pdf`, and the public `api/portal/client/[token]/{devis,factures}/[id]/pdf`. Templates unchanged (they just receive a safe `firm.logo_url`). **Verified live** by rendering the portal devis PDF for the one real firm that has `logo.webp` (Semlali Archi / ws `151e9b1a`) — logo now renders in the header instead of a blank gap. moodboard route keeps its explicit `logoDataUri` prop (imports `normalizeLogo` from the shared module).*

*Update 2026-06-15 — **W4 shipped: tax label pack-driven** (worldwide.md W4). The tax word ("TVA"/"VAT"/"Tax") now comes from the country pack's `taxLabel` (jurisdiction property, NOT UI-locale-translated — tying it to language would put "TVA" on a Gulf firm's VAT). Replaced hardcoded "TVA" in devis/facture forms + details (dropped the locale `t("tva")` render), financial-reports, and the devis/facture PDF templates (new `taxLabel` prop) wired through all 5 PDF render paths incl. the factures sent-snapshot. Tax computation was already correct (rapports sums stored per-doc `tva_centimes`, never recomputes 20%); fixed only the misleading hardcoded "(20%)" label. Convention: render tax as `{taxLabel} {rate}%` via `useLocalization().taxLabel` (client) / `resolveLocalization(firm).taxLabel` (server/PDF) — never hardcode "TVA". `/bareme` stays TVA (Moroccan). 5 new tests (44 total). Next: W5 (documents & numbering per country).*

*Update 2026-06-15 — **W3 shipped: phase/status/deliverable labels → i18n** (worldwide.md W3). DB phase keys stay stable (`PHASE_ORDER` in constants); only labels localize via the `phase`, `status.project` (both already existed in fr/en/ar, just unconsumed) and new `phaseDeliverables` (arrays via `t.raw()`) namespaces. Migrated all consumers off the hardcoded `PHASE_LABELS` constant (now removed) — main pages, time module, portfolio, project-form/projects-filters selects, both portal steppers; added `phase.autre`. Dead `STATUS_LABELS` constant removed; fixed a raw `{project.status}` leak; project-form type/status selects localized (`projectType`/`status.project`). **RIBA/AIA nomenclature deferred deliberately** — the 8 keys are a Loi-MOP pipeline (with a permit stage RIBA lacks); relabeling would mislead until per-pack `PHASE_ORDER` is modeled. New convention: never hardcode phase/status labels — use the `phase`/`status.project` namespaces (`useTranslations`/`getTranslations`). 5 new tests (39 total). Next: W4 (tax engine).*

*Update 2026-06-15 — **W2 shipped: locale + timezone aware dates** (worldwide.md W2). `formatDate/formatDateShort/formatDayMonth` rewritten on **`date-fns-tz`** (new dep) `formatInTimeZone` — explicit `d MMMM yyyy` pattern keeps day-first order in every locale + French byte-identical; added `formatDateIntl` for custom shapes (weekday etc., Latin digits in Arabic). `useLocalization()` now exposes the date formatters (bound to `useLocale()` + workspace tz); new `src/lib/formatters-server.ts` `getServerFormatters(timeZone?)` for server components (destructure-same-names trick → 102 call sites unchanged). Threaded through all 39 date files incl. tasks/calendar/dashboard/time-tracker + dual-use components via a `locale` prop. Default tz Africa/Casablanca (also fixes a latent UTC-on-Vercel midnight-day bug). 5 new format tests (34 total). Localization migration (W1) was applied + verified 2026-06-15. Next: W3 (phase labels → i18n).*

*Update 2026-06-12 — **Worldwide foundation (W1) shipped** (see `worldwide.md`, the living roadmap for going global). New: `src/lib/country-packs.ts` (CountryPack registry MA/DZ/TN/FR/AE/SA/INTL + `resolveLocalization`), `src/lib/localization.ts` (`getWorkspaceLocalization`), `src/components/localization-provider.tsx` (`LocalizationProvider` in `(app)/layout.tsx` + `useLocalization()` hook), `formatMoney(centimes, currency)` in format.ts (`formatMAD` now a deprecated delegate; MAD output byte-identical). Settings → new "Localisation" section (country/currency/default tax rate, fr/en/ar). Currency now flows through every money surface (17 client components, all app/portal pages, emails, AI digest, devis+facture PDFs incl. snapshots); `/bareme` deliberately stays MAD. Default TVA de-hardcoded (devis/factures/recurring read `firm_profile.default_tax_rate`; recurring panel's 0.20 math fixed). **Migration `supabase/migrations/20260612_worldwide_localization.sql` is written but NOT applied** — the Supabase project (`rerngnimuseebidbixuw`) was found **paused** (free-tier auto-pause, DNS NXDOMAIN → production login/data dead; user notified to restore via dashboard). Apply with `node scripts/apply-migration.mjs <file>` (new script; falls back to Supavisor pooler probing since direct db.* hosts are IPv6-only). All new code tolerates the missing columns (select `*` + Morocco-pack fallbacks). Also fixed stale doc: `en.json` exists (app is trilingual fr/en/ar).*

*Update 2026-06-04c — **Moodboard PDF reaches the client portal + two follow-ups.** (1) **Portal PDF route**: new token-scoped `api/portal/client/[token]/moodboards/[id]/pdf` — mirrors the portal devis route's security (validates the `client` share link, checks expiry + `requireWorkspaceAccountActive`, scopes the board by `client_id`), renders via the same `MoodboardPdf`. A "PDF" download button now sits in the client portal **Inspirations** section. (2) **"Couldn't load" notice**: `normalizeMoodboardImages` now returns `{ images, failed }` (was `NormalizedImage[]`); `MoodboardPdf` takes a `failedCount` prop and prints "N références n'ont pas pu être chargées … ne figurent pas dans ce document" on the cover when `failed>0` (correct FR plural) — closes the silent-drop gap noted in 06-04. Both moodboard PDF routes pass `failedCount: normalized.failed`. (3) **Portal image-expiry bug fixed**: the portal Inspirations section rendered moodboard `item.url` raw — for uploaded items that's a 1 h signed URL, so client-facing images 404'd after ~1 h. Now re-signed on render via `signInspirationItems` (same helper the in-app moodboard page uses). **Shipping note:** the moodboard/PDF code (route, template, helper, notice) landed on branch `feat/moodboard-pdf-export`; the two **portal-page** edits (the Inspirations PDF button + the re-sign) currently live uncommitted in `src/app/portal/client/[token]/page.tsx`, intermixed with a separate in-progress "client portal sharing" feature — commit them together with that work.*
