# ArchiDesk AI Agent Handoff

This document explains what the app is, what it currently does, how it is built, and where a future AI coding agent should continue. It is intended for implementation work, not marketing.

## Product

ArchiDesk is a SaaS operating system for architecture firms, decorators, and design studios, initially focused on Moroccan architecture workflows.

Positioning:

> The AI Operating System for Architecture Firms.

The product helps architecture teams manage projects, phases, tasks, time, budgets, clients, documents, site reports, approvals, invoices, team workload, and AI-generated summaries/reports. The goal is to reduce admin work, improve project visibility, and make firms look more professional to clients.

Billing is partially scaffolded with LemonSqueezy but still needs live product/variant setup and an end-to-end payment test before launch.

## Current Stack

- Next.js 16 App Router with React 19 and TypeScript.
- Supabase Auth, PostgreSQL, Storage, RLS.
- Supabase SSR clients in `src/lib/supabase`.
- Drizzle schema in `src/lib/db/schema.ts`.
- Tailwind CSS, Base UI/shadcn-style components, lucide icons.
- Framer Motion for premium UI transitions.
- next-intl for French, English, Arabic scaffolding.
- Anthropic API for optional AI features.
- pnpm package manager.

Important repo rule:

- This project uses a newer Next.js version. Read `node_modules/next/dist/docs/` before changing App Router behavior.

## Core App Areas

### Authentication And Workspaces

- Email/password and OAuth flow via Supabase.
- Workspace-based multi-tenancy.
- Active workspace stored in `archidesk_active_workspace_id`.
- Roles: `owner`, `admin`, `member`, `viewer`.
- Superadmin panel at `/admin`.
- Superadmin access is controlled by `SUPERADMIN_EMAILS`.
- Suspended/cancelled workspaces redirect to `/account-suspended`.
- Empty workspaces can install demo architecture data from the dashboard activation card.

### Admin Panel

Route:

- `src/app/admin/page.tsx`

Capabilities:

- View workspaces.
- Search workspaces/users.
- Change plan/status/subscription metadata manually.
- Store LemonSqueezy customer/subscription IDs for later billing integration.
- View SaaS diagnostics such as storage use, AI calls, last activity, trial end, and orphan auth users.
- Suspend/cancel/reactivate workspaces.
- Ban/unban Supabase Auth users.
- View auth users and workspace memberships.

Supporting files:

- `src/lib/admin/auth.ts`
- `src/lib/admin/workspaces.ts`
- `src/lib/admin/users.ts`
- `src/lib/actions/admin.ts`

### Clients CRM

Routes:

- `/clients`
- `/clients/new`
- `/clients/[id]`
- `/clients/[id]/edit`

Features:

- Client profiles.
- Contact information.
- Notes/history.
- Linked projects, contracts, devis, factures.
- CSV import structure.

Actions:

- `src/lib/actions/clients.ts`

### Projects

Routes:

- `/projects`
- `/projects/new`
- `/projects/[id]`
- `/projects/[id]/edit`
- `/projects/[id]/files`
- `/projects/[id]/notes`
- `/projects/[id]/visites`

Architecture phases currently use French/internal values:

- `esquisse`
- `aps`
- `apd`
- `pc`
- `dce`
- `chantier`
- `reception`
- `termine`

Project detail currently includes:

- Overview and health indicator.
- Health reasons for budget burn, billing lag, collection lag, overdue work, and critical site issues.
- Linked files.
- Contracts.
- Devis.
- Factures.
- Phase checklist/livrables.
- Inspirations/moodboards.
- Permit tracker.
- Notes.
- Site visits.
- Site issues/reserves.
- BOQ.
- Meeting intelligence.
- Comments/discussion.
- Profitability/rentability.
- Linked task summary.

Actions:

- `src/lib/actions/projects.ts`
- `src/lib/actions/notes.ts`
- `src/lib/actions/permit-stages.ts`

### Tasks And Calendar

Route:

- `/tasks`

Features:

- Kanban and list views.
- Calendar tab with tasks and deadlines.
- Assignee, priority, due date, status.
- Task detail panel.
- Basic dependency/metadata support.
- Project selection auto-links the correct client.

Actions:

- `src/lib/actions/tasks.ts`

### Time Tracking And Workload

Routes:

- `/time`
- `/workload`

Features:

- Time entries linked to workspace/project/task/phase.
- Billable flag and rate.
- Team workload dashboard.

Actions:

- `src/lib/actions/time-entries.ts`

### Finance

Routes:

- `/devis`
- `/devis/new`
- `/devis/[id]`
- `/factures`
- `/factures/new`
- `/factures/[id]`
- `/rapports`

Features:

- Devis creation, edit, status, detail, PDF.
- Facture creation, edit, status, detail, PDF.
- Invoice snapshots/status event support.
- Bank reconciliation support.
- Recurring invoices support.
- Reports dashboard.

Actions:

- `src/lib/actions/devis.ts`
- `src/lib/actions/factures.ts`
- `src/lib/actions/bank-reconciliation.ts`
- `src/lib/actions/recurring-invoices.ts`
- `src/lib/actions/payment-reminders.ts`

### Files And Approvals

Routes:

- `/projects/[id]/files`
- `/share/[token]`
- `/portal/[token]`

Features:

- File upload to Supabase Storage.
- Versioning by same filename/folder.
- Signed download URLs.
- Share links.
- Project client portal links.
- File approval status: `not_required`, `pending`, `approved`, `rejected`.

Actions:

- `src/lib/actions/files.ts`
- `src/lib/actions/portal.ts`

### Client Portal

Route:

- `/portal/[token]`

Features:

- Client-facing project view.
- Project progress/files/approvals/devis/factures/messages.
- Portal messages and approval responses.
- Portal actions use service role and token validation.
- Portal message rate limiting is stored through `activity_log`.

### Site Features

Routes:

- `/projects/[id]/visites`
- `/projects/[id]/visites/new`
- `/projects/[id]/visites/[visitId]`

Features:

- Site visit reports.
- Photo upload for visit observations.
- Auto-create site issues from observations.
- Punch list / issue tracking.
- Issue statuses: `open`, `in_progress`, `resolved`.
- Assign issues to team members.
- Print/PDF-friendly site report structure.

Actions:

- `src/lib/actions/visites.ts`
- `src/lib/actions/site-issues.ts`

### BOQ, Suppliers, Subcontractors

Routes:

- `/boq`
- `/fournisseurs`
- `/subcontractors`

Features:

- BOQ/material items linked to projects.
- Supplier catalog.
- Supplier/subcontractor CRM.
- Procurement status and actual/estimated costs.

Actions:

- `src/lib/actions/boq-items.ts`
- `src/lib/actions/suppliers.ts`
- `src/lib/actions/subcontractors.ts`

### Commercial And Templates

Routes:

- `/prospects`
- `/bareme`
- `/templates`

Features:

- Prospect pipeline.
- Pricing/bareme module.
- Reusable templates.

Actions:

- `src/lib/actions/prospects.ts`
- `src/lib/actions/templates.ts`

### AI Features

AI should remain optional by subscription. The basic app must work without an AI API key.

Current AI features:

- Project summary.
- Client email generation.
- Meeting summary extraction.
- Meeting notes to task creation.
- Voice note draft structure.
- AI health digest route.
- AI usage logging/plan quota support.

Files:

- `src/lib/actions/ai.ts`
- `src/lib/actions/meeting-intelligence.ts`
- `src/lib/ai/anthropic.ts`
- `src/lib/ai/usage.ts`
- `src/app/api/ai/digest/route.ts`
- `src/app/api/visites/summarize/route.ts`

## Subscription And Billing State

Billing provider target: LemonSqueezy. Do not build a Stripe integration.

Current subscription-related state:

- Workspace columns exist for manual plan/status/source and LemonSqueezy IDs.
- Superadmin can manually change plan, account status, subscription status, source, and LemonSqueezy IDs.
- Plan limits exist in `src/lib/billing/plans.ts`.
- Guard helpers exist in `src/lib/billing/guards.ts`.
- Checkout creation exists in `src/lib/actions/billing.ts` and `src/lib/billing/lemonsqueezy.ts`.
- Webhook sync exists at `src/app/api/billing/lemonsqueezy/webhook/route.ts`.
- AI availability depends on plan limits and `ANTHROPIC_API_KEY`.

Before accepting paid users, configure real LemonSqueezy store/variant IDs, register the webhook, set the webhook secret, and test subscription create/update/cancel events in production-like mode.

## Security And SaaS Hardening Already Added

App-level role enforcement exists through:

- `src/lib/workspace.ts`
- `requireWorkspaceRole`
- `WORKSPACE_WRITE_ROLES`
- `WORKSPACE_ADMIN_ROLES`

Current behavior:

- `owner`, `admin`, `member` can write normal business records.
- `viewer` is blocked server-side from normal mutations.
- Firm profile and portfolio settings require `owner/admin`.
- Comment deletion is limited to the author, except `owner/admin` can delete others.
- Core mutations validate workspace ownership for related records such as client/project/devis/supplier where applicable.

Important: database RLS should still be reviewed and aligned with these app-level permission rules. Treat app-level checks as necessary but not sufficient.

## Important Migrations

Recent migrations include:

- `supabase/migrations/20260508_000_time_entries_base.sql`
- `supabase/migrations/20260508_001_share_links_project_resource_type.sql`
- `supabase/migrations/20260512_p0_project_health_site_issues_approvals.sql`
- `supabase/migrations/20260512_p1_boq_workload_meeting_intelligence.sql`
- `supabase/migrations/20260513_saas_hardening_*`
- `supabase/migrations/20260514_superadmin_subscriptions.sql`

Before adding schema changes:

1. Inspect current migrations.
2. Keep changes additive and safe.
3. Use RLS for any new public-schema table.
4. Do not assume a fresh Supabase project automatically exposes new tables to the Data API.

## Validation And Smoke Tests

Use these before handing work back:

```bash
pnpm exec tsc --noEmit
pnpm exec eslint
pnpm smoke:v1
pnpm exec next build
```

`pnpm smoke:v1` runs `scripts/saas-readiness-smoke.mjs`.

It creates a temporary user, workspace, client, project, task, devis, and facture; verifies core pages render them; then deletes the temporary data. It requires:

- `.env.local`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- local app running at `http://localhost:3000`, or set `SAAS_SMOKE_APP_URL`.

The script should leave `0` workspaces matching `V1 Smoke %`.

## What To Improve Next

Highest priority, excluding billing:

1. Align Supabase RLS policies with app-level role permissions.
2. Add richer Playwright/browser tests for actual UI form submission.
3. Harden uploads: MIME allowlists, virus-scan strategy, better storage RLS, image compression for site photos.
4. Polish client portal mobile experience.
5. Add notification center for overdue tasks, unpaid invoices, pending approvals, project risks.
6. Add audit log views for workspace owners.
7. Add workspace export/backup tools.
8. Add structured error boundaries to major app sections.
9. Continue removing raw runtime errors from user-facing forms.
10. Prepare LemonSqueezy integration last.

## Known Product Decisions

- The app should not become a generic project management tool.
- Architecture-specific workflow matters: phases, permits, site visits, drawings/files, approvals, BOQ, client portal.
- AI is optional and subscription-gated.
- Superadmin control is required before self-serve billing.
- Keep French UX strong; English/Arabic are scaffolded but not fully polished.
- Keep UI premium, responsive, and professional for architecture firms.

## Notes For The Next Agent

- Do not rebuild from scratch.
- Preserve existing working features.
- Check current git status before editing; the repo may have many untracked/modified files.
- Prefer existing server actions and components over new parallel abstractions.
- Use `rg` for code search.
- Use `apply_patch` for manual edits.
- Before changing Next.js routing/server action patterns, read the relevant local Next docs under `node_modules/next/dist/docs/`.
- Before changing Supabase auth/RLS/storage behavior, verify current Supabase docs/changelog.
