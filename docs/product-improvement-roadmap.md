# Product Improvement Roadmap

This roadmap turns the current broad feature set into a tighter paid product.

## 1. Foundation

- Keep `README.md`, `CLAUDE.md`, migrations, and `src/lib/db/schema.ts` aligned.
- Add seed/demo data for a complete architect workflow.
- Keep `pnpm typecheck`, `pnpm lint`, and `pnpm build` clean before product work lands.
- Audit RLS whenever a new workspace-scoped table is added.

## 2. Onboarding

- Guide new users through firm profile, first client, first project, first devis, and first PDF export.
- Add CSV import for clients and projects.
- Add empty states that create the next useful record directly from each module.
- Provide a demo workspace so prospects can evaluate the product without data entry.

## 3. Monetization

- Add trial state, plan limits, and usage metering before payment collection.
- Support Moroccan-first payment paths instead of assuming Stripe availability.
- Gate high-cost features such as AI, storage, team seats, and public portal depth by plan.

## 4. Client Portal

- Make portal links close work: devis approval, contract signature, facture status, file review, comments, and document upload.
- Add an architect-side audit trail for portal access, signatures, and approvals.

## 5. Invoicing Compliance

- Preserve immutable facture snapshots once sent.
- Store structured tax and legal numbering data separately from presentation data.
- Prepare adapter boundaries for future DGI or certified-provider e-invoicing integration.

## 6. WhatsApp And AI

- Build WhatsApp as an intake workflow: classify forwarded files, create notes, create tasks, and attach messages to projects.
- Use AI for specific operational work: supplier PDF extraction, site visit summaries, project health digests, and contract drafts.
- Track AI usage per workspace from the start.
