import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "ArchiDesk <onboarding@resend.dev>";

/**
 * True only when a real, verified sending domain is configured.
 * The `onboarding@resend.dev` sandbox can only deliver to the account owner's own
 * address — sending from it in production damages sender reputation and confuses
 * users. Until `RESEND_FROM_EMAIL` points at a verified domain, we record email
 * intent in `email_log` (status "skipped") instead of sending. One env var flips it on.
 */
export function isEmailDeliverable(): boolean {
  return Boolean(process.env.RESEND_API_KEY) && !FROM_EMAIL.includes("resend.dev");
}
