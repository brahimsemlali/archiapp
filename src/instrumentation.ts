import * as Sentry from "@sentry/nextjs";

// Server + edge Sentry init. Completely inert until NEXT_PUBLIC_SENTRY_DSN is set —
// drop the DSN into the env and error reporting turns on, no code change.
export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      // Don't capture expected control-flow redirects/not-found as errors.
      ignoreErrors: ["NEXT_REDIRECT", "NEXT_NOT_FOUND"],
    });
  }
}

// Lets Next.js report nested React Server Component errors to Sentry.
export const onRequestError = Sentry.captureRequestError;
