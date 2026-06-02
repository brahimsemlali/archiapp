# ArchiDesk — V1 launch runbook

_Readiness audit + sequenced go-live steps. Written 2026-06-02._

## Verdict

**The application is functionally V1-ready.** Verified this session, not assumed:

| Check | Result |
|---|---|
| Production build (`next build`) | ✅ exit 0, **0 warnings**, all 48 routes compile |
| End-to-end smoke (`pnpm smoke:v1`) | ✅ all 10 core pages render real data; workspace consistency holds |
| AI path (Anthropic `claude-sonnet-4-6`) | ✅ live, HTTP 200 |
| First-run / empty states | ✅ dashboard shows a 5-step setup banner; lists have real CTAs |
| Onboarding flow | ✅ signup → confirm → `OnboardingForm` → dashboard |
| Legal pages (5) | ✅ shipped; finalize = fill `src/lib/legal.ts` |
| RLS / workspace isolation | ✅ (verified in prior audits + smoke consistency check) |

**The gate to welcoming users is operational, not code.** One item is a true blocker; the
rest are "switch on when ready."

---

## 🔴 The one blocker — the signup email gate

A brand-new user must confirm their email before they can log in, but that email won't
reliably arrive yet:

- Supabase Auth `mailer_autoconfirm = false` → **email confirmation is required**.
- `RESEND_FROM_EMAIL = onboarding@resend.dev` → the sandbox sender only delivers to the
  account owner; Supabase's own confirmation mail uses its built-in mailer (free-tier:
  ~2–4/hour, spam-prone, "testing only" per Supabase).
- Google OAuth is **off** (`external.google = false`) → no fallback signup path.

Net: a cohort that signs up will get stuck unconfirmed. **This must be resolved before
inviting anyone.** Two paths — pick by cohort size:

### Path A — invite-only V1 (recommended for the first 5–20 users) — _do now, 1 toggle_
Supabase Dashboard → **Authentication → Providers → Email → turn OFF "Confirm email"**
(equivalently `mailer_autoconfirm = true`). New users sign in immediately, no email needed.
Trade-off: emails aren't verified — fine for hand-picked, trusted architects. Transactional
emails (devis/facture/portal notifications) stay dormant; the app + client portal still work
fully in-product.

### Path B — public launch — _do before opening signup broadly_
Requires a domain (the master key — unlocks everything email):
1. Register a domain → verify it in **Resend** (see [go-live-email.md](go-live-email.md)).
2. Set `RESEND_FROM_EMAIL` to `…@yourdomain` → transactional email turns on automatically.
3. Supabase Dashboard → **Authentication → Emails → SMTP Settings** → point at Resend SMTP →
   re-enable "Confirm email". Confirmation mail now delivers reliably.

> CEO call: **ship Path A for the invite cohort this week; do Path B before public signup.**

---

## Sequenced go-live checklist

### 1. Deploy to Vercel (not yet done)
- Import the repo in Vercel. Framework auto-detected (Next.js).
- Set **all** env vars below for Production (and Preview).
- `NEXT_PUBLIC_APP_URL` → your Vercel/prod URL (drives portal links, email links, legal page
  domain display). Currently `http://localhost:3000`.

### 2. Supabase → paid tier
Free projects **auto-pause after inactivity** (this already bit us once — NXDOMAIN on a paused
project). Upgrade to **Pro ($25/mo)** before real users depend on it.

### 3. Email gate → Path A or B (see above)

### 4. Billing (LemonSqueezy) — keys are absent locally
None of the `LEMON_SQUEEZY_*` vars are set. Billing code is built but inert until:
- `LEMON_SQUEEZY_API_KEY`, `LEMON_SQUEEZY_STORE_ID`, `LEMON_SQUEEZY_WEBHOOK_SECRET`
- `LEMON_SQUEEZY_STUDIO_VARIANT_ID`, `LEMON_SQUEEZY_AGENCE_VARIANT_ID`
- Point the LemonSqueezy webhook at `https://<prod>/api/billing/lemonsqueezy/webhook`.
- The 14-day trial works **without** billing (trial → Basic downgrade), so a cohort can start
  before billing is live; needed only when you want to take money.

### 5. Sentry → production
`NEXT_PUBLIC_SENTRY_DSN` is in local env and active. Add the **same DSN** to Vercel env so
prod reports too. _(Optional: `SENTRY_ORG` + `SENTRY_PROJECT` + `SENTRY_AUTH_TOKEN` for
un-minified stack traces.)_

### 6. Legal → finalize + lawyer glance
- Fill the `TODO(...)` éditeur fields in [`src/lib/legal.ts`](../src/lib/legal.ts) (raison
  sociale, forme, RC, ICE, IF, siège, directeur de publication). The "à compléter" notice then
  disappears on all 5 pages.
- Have a juriste glance, especially **CGV §5** (no pro-rata refund) — with LemonSqueezy as
  Merchant of Record, their buyer-refund terms may govern; reconcile the wording.

---

## Env var matrix (Vercel, Production)

| Var | Status | Needed for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | ✅ set | core |
| `ANTHROPIC_API_KEY` | ✅ live | AI features |
| `NEXT_PUBLIC_APP_URL` | ⚠️ localhost → set to prod | portal/email/legal links |
| `NEXT_PUBLIC_SENTRY_DSN` | ✅ local → add to Vercel | error monitoring |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | ⚠️ sandbox sender | email (Path B) |
| `LEMON_SQUEEZY_*` (5 vars) | ❌ missing | billing |
| `VAPID_*` | ✅ set | push notifications |

---

## Cohort-1 definition & day-one value path

**Who:** Moroccan solo architects & small studios (1–10), French, MAD, 5–30 active projects.

**The one path they must complete on day one (verified working):**
`Create client → create project → generate AI devis/contract → share client portal.`
AI is enabled during the 14-day trial (studio-level limits), so a trial user gets the full
value before any payment. After trial → Basic → AI gated (the intended upgrade trigger).

## Known degradations acceptable for an invite V1
- **Email notifications off** until a domain (devis/facture/portal mails log as `skipped`,
  don't send) — in-app + portal unaffected.
- **Billing off** until LemonSqueezy keys — trial covers the cohort.
- **Prod performance unmeasured** — the dev smoke timings (p95 ~20s) are Turbopack
  cold-compile, not signal; measure against the deployed build, fine to defer for a small cohort.
- **CLAUDE.md says "email + Google OAuth"** but Google is not enabled in this project.
