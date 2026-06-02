# Go-live: email & domain checklist

Transactional email (devis sent, facture sent, contract signed, portal message, payment
reminders, welcome/invite/reset) is **wired and safe to ship without a domain**:

- Until a verified sending domain is configured, `sendEmail()` **records intent in
  `email_log` (status `"skipped"`) and does not send.** This protects sender reputation
  and avoids blasting Resend's `onboarding@resend.dev` sandbox (which only delivers to the
  account owner anyway). See `isEmailDeliverable()` in `src/lib/email/client.ts`.
- The switch is automatic: the moment `RESEND_FROM_EMAIL` points at a verified domain,
  emails start sending. No code change.

## When you have a domain

1. **Register a domain** (`.com` is easiest globally; `.ma` via a Moroccan registrar — may
   require a registered business). It does **not** have to be `archidesk.ma`.
2. **Resend** → Domains → Add domain → it gives you ~3 DNS records (SPF / DKIM, and a
   return-path/MX). Add them at your registrar's DNS. Wait for "Verified".
3. **Set env vars** (Vercel → Project → Settings → Environment Variables):
   - `RESEND_API_KEY=` (from Resend)
   - `RESEND_FROM_EMAIL=ArchiDesk <noreply@yourdomain>`
   - `NEXT_PUBLIC_APP_URL=https://yourdomain` (used in email links, portal links, the
     `/p/` portfolio prefix)
4. Redeploy. Send yourself a test devis to confirm delivery + inbox placement.

## Notes
- App + portal links and the portfolio URL prefix are all driven by `NEXT_PUBLIC_APP_URL` —
  no hardcoded domain. Until then they fall back to `localhost:3000` (dev) / your Vercel URL.
- Legal pages (`/terms`, `/privacy`, `/cookies`) still contain `archidesk.ma` /
  `support@archidesk.ma` placeholders — update these during the lawyer review pass.
- For a support **inbox** (replies), add the domain to Google Workspace / Zoho / etc.
  separately — Resend is send-only.
