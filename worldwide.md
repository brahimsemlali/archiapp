# ArchiDesk — Worldwide Roadmap

> **Thesis:** an architect's workflow is ~80% universal (phases, fees, permits, site
> meetings, progress billing, chasing payments). The 20% that differs per country is the
> legal / fiscal / language wrapper. We do NOT "make the app generic" — we turn the
> Moroccan layer into **country pack #1 of 50** and build the machine that stamps out
> the rest. Morocco stays the beachhead; every new feature is built as if it had to
> work in Algiers, Dubai and São Paulo tomorrow.
>
> This is a living todo file. Check items off as they ship; add notes inline.
> Engineering rule from now on (enforce in review): **config, not constants** —
> currency, tax rate, timezone, phase names and legal text must never be hardcoded in
> new code. They come from the workspace's country pack / localization settings.

---

## Part 0 — Ground truth (audited 2026-06-12)

What is already worldwide-ready (don't redo):

- [x] i18n infra: next-intl with **fr / en / ar** all wired (`src/lib/i18n/request.ts`,
      `src/messages/{fr,en,ar}.json` — CLAUDE.md §6 was stale, en.json exists and is complete)
- [x] RTL support (`dir="rtl"`, logical properties, Cairo font) — Gulf-ready, huge head start
- [x] Money as integer centimes everywhere — currency-agnostic by design
- [x] `tva_rate` stored **per document** (devis/factures/recurring) — only the *default* of 20 is hardcoded
- [x] LemonSqueezy = merchant of record — handles global payments/tax remittance
- [x] Workspace isolation via RLS — multi-tenant by construction

What is hardwired to Morocco today (the debt to unbundle):

| # | Item | Where |
|---|------|-------|
| 1 | "DH" suffix + fr-MA number format | `src/lib/format.ts` `formatMAD` (33 files use it) |
| 2 | Date formatting locked to French | `src/lib/format.ts` (`date-fns/locale/fr`) — English/Arabic UI still shows French dates |
| 3 | Default TVA = 20 | `src/lib/validators/{devis,facture}.ts`, `recurring-invoices`, `activation.ts` |
| 4 | Tax label "TVA" | PDF templates, rapports, portal |
| 5 | Phase labels/deliverables in French constants (not i18n) | `src/lib/constants.ts` |
| 6 | Phase nomenclature = French system (esquisse→DCE) | DB enum keys + UI everywhere |
| 7 | Timezone Africa/Casablanca assumption | display logic (no per-workspace TZ) |
| 8 | Invoice numbering `FA-YYYY-NNN` | factures actions |
| 9 | Firm identity fields ICE/RC/IF/CNSS/patente | `firm_profile`, settings, PDF footers |
| 10 | ONA barème page (Morocco-only) | `/bareme` |
| 11 | Bank CSV formats CIH/Attijari/BMCE | bank reconciliation |
| 12 | Contract AI grounded in Loi 016-89 only | `src/lib/ai/prompts/contract.ts` |
| 13 | Legal pages FR-only / Moroccan law | `src/lib/legal.ts` |

---

## Part 1 — Engineering track (sequenced)

### W1 — Localization foundation (country pack v1) ← **DONE 2026-06-12** (code-complete; migration pending DB restore)
The schema + helpers everything else hangs off. Morocco is pack #1 with identical
behavior (zero user-visible change for existing workspaces).

- [x] `src/lib/country-packs.ts`: `CountryPack` type + registry (MA, DZ, TN, FR, AE, SA, INTL),
      `resolveLocalization(firmProfile)`, `getCurrencyDisplay`, `SUPPORTED_CURRENCIES`
- [x] Migration **APPLIED 2026-06-15**: `supabase/migrations/20260612_worldwide_localization.sql`
      (`firm_profile` += country/currency/timezone/default_tax_rate, all defaulted).
      Verified: 4 columns present (NOT NULL + correct defaults); all 5 existing rows
      backfilled to MA/MAD/20/Africa-Casablanca. Applied via
      `node scripts/apply-migration.mjs` (Supabase project was restored from free-tier pause).
- [x] `src/lib/format.ts`: `formatMoney(centimes, currency?)`; `formatMAD` delegates;
      date fns accept optional locale param (fr default — call-site wiring is W2)
- [x] `src/lib/localization.ts`: server `getWorkspaceLocalization(supabase, workspaceId)`
- [x] `src/components/localization-provider.tsx`: `LocalizationProvider` (mounted in
      `(app)/layout.tsx`) + `useLocalization()` hook → `{ money, currency, taxLabel, defaultTaxRate }`
- [x] Settings UI: "Localisation" section (country/currency/default tax rate, fr/en/ar strings);
      country change pre-fills currency+tax; action validates + auto-derives timezone from pack
- [x] Default tax rate wired: devis/new, factures/new (devis-conversion keeps its own rate),
      recurring-invoices panel (also de-hardcoded its 0.20 math + "TVA 20%" label)
- [x] Currency wired EVERYWHERE money renders: 17 client components (via hook), 5 app pages,
      both portals, devis/factures/payment-reminder emails, AI digest, devis+facture PDF
      templates (`currency` prop) and all 5 PDF render paths (incl. invoice sent-snapshots).
      Exception by design: `/bareme` calculator stays MAD (ONA is intrinsically Moroccan).

### W2 — Locale-aware dates & timezone ← **DONE 2026-06-15**
- [x] `formatDate/formatDateShort/formatDayMonth` rewritten on **`date-fns-tz`** `formatInTimeZone`
      (new dep) — explicit `d MMMM yyyy` pattern keeps **day-first order in every locale** (no
      en-US MM/dd flip) and keeps French output byte-identical. `formatRelative` stays on
      date-fns `formatDistance` (elapsed time is tz-independent). All accept `(date, locale?, timeZone?)`.
- [x] Client wiring: `useLocalization()` now also returns `formatDate/formatDateShort/formatDayMonth/
      formatDateParts/formatRelative` bound to the current UI locale (`useLocale()`) + workspace timezone.
      Server wiring: new **`src/lib/formatters-server.ts`** `getServerFormatters(timeZone?)` →
      reads `getLocale()`; destructure with matching names so call sites stay unchanged.
- [x] Threaded through **all 102 date call sites / 39 files**: 12 client components, ~15 server pages
      (real workspace tz passed where localization already loaded; else default), 3 task components +
      calendar-view + plan-usage + smart-notifications/workload (dual-use → `locale` prop) + invite page.
- [x] Timezone: default **Africa/Casablanca** (correct for 100% of current workspaces, and fixes a
      latent bug — Vercel runs UTC, so `created_at` near midnight previously showed the wrong day).
      Real workspace tz used on money-bearing pages; `formatDateIntl` forces `timeZone` + `numberingSystem:"latn"`.
- [x] Arabic audit: date-fns `ar` renders Arabic month names with **Latin digits** ("15 يونيو 2026"),
      matching the Latin-digit money (fr-MA) — no Arabic-Indic/Latin mismatch. Verified in tests.
- [x] 5 new `format.test.ts` cases lock language, day-first order, dd/MM stability, and the
      Casablanca midnight-boundary day (34 tests pass; typecheck 0 / lint 0 / build OK).
- [ ] **Deliberate remainder (FR by design, not bugs):** PDF templates, `/admin`, AI-prompt date
      strings, the contract e-signature attestation line, and the editable default visit-title date.

### W3 — Phase system as configuration ← **DONE 2026-06-15**
- [x] DB phase keys stay stable (esquisse…termine) — kept as `PHASE_ORDER` in constants.ts;
      only *labels* localize. `PHASE_COLORS` (presentation) also stays in constants.
- [x] `PHASE_LABELS` → i18n `phase` namespace (fr/en/ar; en/ar already existed, just unconsumed).
      Migrated every consumer: 6 constants-importers (clients/[id], projects/[id], project-profitability,
      phase-checklist, phase-budget-planner, projects-kanban) + 3 local copies (time-tracker,
      persistent-time-timer, p/[slug] portfolio) + project-form & projects-filters selects +
      both portal steppers. Added the missing `phase.autre` key (time module). Removed dead `PHASE_LABELS`.
- [x] `STATUS_LABELS` constant was **dead** (zero imports) → removed. Project status now i18n via
      `status.project` (fixed a raw `{project.status}` leak in projects/[id]; localized project-form
      status select; added `status.project.termine`). Bonus: project-form **type** select → `projectType` i18n.
- [x] `PHASE_DELIVERABLES` → i18n `phaseDeliverables` namespace (fr/en/ar arrays via `t.raw()`).
      Seed-default semantics: translating only affects phases **not yet seeded** into
      `metadata.checklist`; existing projects unaffected; new/untouched phases seed in current locale.
- [~] **Country-pack nomenclature (RIBA/AIA/HOAI) — DEFERRED, deliberately.** The 8 keys are a
      Loi-MOP pipeline *with a permit stage RIBA/AIA lack*; relabeling it "RIBA" would name a
      workflow the project doesn't follow — strictly worse even for a future international firm.
      Honest fix = per-pack `PHASE_ORDER` (the schema change the plan defers). Until then the en/ar
      translation of the fr pipeline ("Sketch / Building Permit / Handover") serves Gulf/INTL UI correctly.
- [x] 5 unit tests (`src/lib/phase-i18n.test.ts`): labels translate fr/en/ar, `autre` present,
      status translates, deliverable `t.raw()` arrays per phase. 39 tests / typecheck 0 / lint 0 / build OK.
- [ ] **Remainder (separate i18n debt, not phase labels):** contract-generate-form MISSION_PHASES
      (FR contract context), project-detail tab labels, phase-checklist chrome strings, meeting-type labels.

### W4 — Tax engine v1 ← **DONE 2026-06-15**
- [x] Tax label from pack (`taxLabel`: MA/DZ/TN/FR="TVA", AE/SA="VAT", INTL="Tax") across all UI + PDFs.
      **Design (advisor-confirmed): the label is a property of the JURISDICTION (pack), not the UI
      language** — tying it to locale would put "TVA" on a Gulf firm's VAT in French UI. So it's
      pack-driven, not next-intl-translated. (Already the pattern from W1's recurring-invoices panel.)
      Migrated: devis-form, facture-form (rate input + totals), devis-detail, facture-detail
      (dropped the locale-translated `t("tva")` render), devis+facture PDF templates (`taxLabel` prop)
      wired through **all 5 PDF render paths incl. the factures sent-snapshot branch**, financial-reports.
- [x] Rapports: tax summary already computed from stored per-document `tva_centimes` (NOT recomputed
      at 20% — verified). Fixed the misleading hardcoded **"(20%)"** label in the quarterly table;
      KPI card / tab / "Déclaration {taxLabel}" / total now use the pack label.
- [x] 5 unit tests (`country-packs.test.ts`): MA→TVA/MAD/20, AE→VAT/5, SA→VAT/15, DZ/TN→TVA/19,
      null/unknown→MA fallback, stored-currency override keeps pack tax label. 44 tests / tc 0 / lint 0 / build OK.
- [ ] **Remainder:** rapports is otherwise French-only chrome (only the tax *label* is pack-driven now)
      → full rapports i18n is separate debt. Also later: multiple rates per line item; reverse-charge /
      export-exempt flags; UI-locale translation of the tax label if ever wanted (deliberately not done).

### W5 — Documents & numbering per country ← **DONE 2026-06-16**
- [x] Numbering prefix from pack: `invoicePrefix`/`quotePrefix` on CountryPack. Francophone
      (MA/DZ/TN/FR) keep **FA/DEV** (DEV, not DV — matched the existing series exactly); AE/SA/INTL
      use INV/QUO. `nextFactureNumber`/`nextDevisNumber` resolve the prefix via
      `getWorkspaceLocalization` → `getCountryPack`. **Legal sequentiality untouched**: the DB RPC
      `next_workspace_document_number` keys the counter on `document_type`, so the prefix is purely
      presentational (verified against the live RPC def).
- [x] PDF firm-identity block driven by pack: `firmIdentityFields` + `getFirmIdentityLines(firmRow)`.
      **MA enriched** to print ICE/RC/IF/Patente (was ICE-only — a real Moroccan-compliance gap),
      empties dropped. Packs without backing columns (DZ/TN/FR/AE/SA/INTL) yield no lines — **no
      invented SIRET/TRN** (same deferral discipline as W3 RIBA). Labels are jurisdiction terms,
      NOT locale-translated. Wired through both PDF templates + all 5 render paths; snapshot select
      now captures `country` so a sent invoice renders its own frozen identity.
- [~] Legal mentions per pack — **DEFERRED** (juriste-dependent, like W6 + the legal pages). No
      hook shipped; would be empty for every pack today. Add `invoiceLegalNote` when real text exists.
- [x] 5 unit tests (`country-packs.test.ts`): prefixes per pack, identity lines drop empties + no
      invented fields + MA fallback. 49 tests / tc 0 / lint 0 / build OK.

### W6 — Contract AI per jurisdiction (the meta-moat) ← **DONE 2026-06-16 (mechanism; per-market grounding juriste-gated)**
- [x] `getContractPrompt(localization)` registry in `src/lib/ai/prompts/contract.ts`. Morocco
      returns the existing Loi 016-89 prompt **byte-identically** + version "v1.1" (flagship, only
      real users — its prompt string AND userPrompt JSON are untouched; unit-test guards the byte-identity).
- [x] Fallback: `internationalContractSystemPrompt({taxLabel,currency})` — jurisdiction-NEUTRAL,
      currency/tax-aware. It **actively forbids** citing any law/code/article/decree/professional body
      (a capable model on FR/UAE data would otherwise cite real, unvetted law — the failure mode isn't
      "invents law", it's "cites real law no juriste vetted") and forces `[À COMPLÉTER : droit applicable]`
      placeholders. Used for every non-MA country.
- [x] Strong disclaimer lives **in the contract body as a section** ("Avertissement" — AI-generated,
      not jurisdiction-grounded, review by local counsel) so it survives PDF export + e-signature, not
      just UI chrome.
- [x] Stores `ai_model: …@{version}` (MA "v1.1" unchanged) + `contracts.metadata.{ai_country,
      ai_jurisdiction,ai_prompt_version}` + country in the AI-usage log. Hard "never invent articles" rule kept.
- [x] 4 unit tests (`contract.test.ts`): MA byte-identity, non-MA→neutral, neutral has no "016-89"/
      "Ordre National" + has placeholders/review/Avertissement, neutral reflects currency+tax not "TVA 20%".
      53 tests / tc 0 / lint 0 / build OK.
- [ ] **Per-market grounding (DZ/TN/FR/Gulf) = DEFERRED to a juriste** — same gate as the legal pages
      + W5 legal mentions. The mechanism is live; add a real grounded prompt per country when vetted.
      Multilingual contract bodies (currently FR-only) also future.

### W7 — Country pack #2 & #3: Algeria / Tunisia (francophone corridor)
- [ ] DZD / TND packs (currency, TVA 19%, timezone, numbering)
- [ ] Contract grounding: DZ/TN architecture practice law (needs local juriste review)
- [ ] Fee schedule equivalents of ONA barème; `/bareme` becomes pack-driven
- [ ] Bank reconciliation CSV profiles pluggable per pack

### W8 — Gulf pack (the ARPU jump)
- [ ] AED/SAR packs, English+Arabic default, VAT 5%/15%, TRN field
- [ ] Pricing tier per market (LemonSqueezy multi-currency checkout)
- [ ] Marketing/landing EN+AR variant

### W9 — Platform polish for global
- [ ] Landing page locale/market routing; pricing localized
- [ ] Legal pages framework per jurisdiction (reuse `legal-shell`)
- [ ] In-app onboarding asks country → seeds the pack

## Part 2 — Strategy track (non-code gates, in order)

- [ ] **Win Morocco first** — billing live (LemonSqueezy ✅), then a few hundred *retained*
      paying workspaces. A global product with no proven beachhead is a demo.
- [ ] Universal-wedge features that demo identically everywhere (build from the Morocco
      roadmap, they're global by nature): phase→honoraires billing loop, relances
      automatiques, PV de chantier + décomptes, WhatsApp-native flow
- [ ] Expansion order: **Algeria/Tunisia (~M12-18) → Gulf → LatAm/SEA**. France = special
      case at maturity. Do NOT lead with US/UK (entrenched competitors, no WhatsApp culture).
- [ ] Per-country legal review (contracts + CGV) before activating any new pack — budget a juriste per market
- [ ] Localized pricing experiments per market (MA 400 MAD ARPU ≠ Gulf $80+)

## Working rules

1. **Config, not constants** — every new feature reads currency/tax/timezone/phase labels
   from `getWorkspaceLocalization()` / country pack. No new `formatMAD`, no new literal `20`.
2. New user-facing strings go through next-intl **in all three locales** (fr/en/ar).
3. DB keys (phase enums, statuses) stay stable and English/French-internal; only *labels* localize.
4. Existing Moroccan workspaces must never notice a worldwide refactor (defaults = current behavior).
5. Each pack activation = engineering (cheap) + legal review (the real cost) + GTM. The
   second country is the expensive one; the fifth is a config file.

---

*Created 2026-06-12. Status: W1 DONE (migration applied 2026-06-15). W2 DONE 2026-06-15
(locale + timezone aware dates). W3 DONE 2026-06-15 (phase/status/deliverable labels →
i18n; RIBA/AIA nomenclature deferred with rationale). W4 DONE 2026-06-15 (tax label pack-driven).
W5 DONE 2026-06-16 (numbering prefix + PDF firm-identity per pack). W6 DONE 2026-06-16 (contract-AI
jurisdiction mechanism: MA byte-identical Loi 016-89; neutral fallback that actively forbids statute
citation + in-body disclaimer; per-market grounding juriste-gated; 53 tests / tc 0 / lint 0 / build OK).
Next: W7 (Algeria/Tunisia packs) and W8/W9 — but these need real legal/GTM input. **Engineering
foundation W1–W6 complete; remaining worldwide work is juriste/market-gated, not code.**
