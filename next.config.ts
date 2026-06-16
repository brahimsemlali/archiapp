import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  experimental: {
    // Server Actions default to a 1 MB body — far below the 2–100 MB the upload
    // validators allow, so every real photo/file upload failed. Raise to cover
    // photos + typical documents. NOTE: Vercel serverless caps request bodies at
    // ~4.5 MB in production — large uploads there need direct-to-storage signed URLs.
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

// Sentry build-time config. Source-map upload only runs when SENTRY_AUTH_TOKEN +
// org/project are set (CI/prod); otherwise it's a no-op and the build is unaffected.
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
