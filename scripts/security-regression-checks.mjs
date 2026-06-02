import { readFile } from "node:fs/promises";

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`${label}: expected to find ${needle}`);
  }
}

const meetingActions = await readFile("src/lib/actions/meeting-intelligence.ts", "utf8");
assertIncludes(
  meetingActions,
  '.in("resource_type", ["project", "client"])',
  "meeting PV signatures must reject unrelated portal token types"
);
assertIncludes(
  meetingActions,
  "meeting.project_id !== shareLink.resource_id",
  "project portal PV signatures must be bound to the shared project"
);
assertIncludes(
  meetingActions,
  '.eq("client_id", shareLink.resource_id)',
  "client portal PV signatures must be bound to the shared client"
);
assertIncludes(
  meetingActions,
  '.eq("project_id", meeting.project_id)',
  "PV signature update must retain the authorized project scope"
);

const emailTemplates = await readFile("src/lib/email/templates.ts", "utf8");
assertIncludes(emailTemplates, "function escapeHtml", "email templates must escape HTML text");
assertIncludes(emailTemplates, "function safeHref", "email templates must sanitize href attributes");
assertIncludes(emailTemplates, "escapeTextBlock(opts.messageBody)", "email message bodies must be escaped");

const moodboards = await readFile("src/lib/actions/moodboards.ts", "utf8");
assertIncludes(moodboards, "fetchPublicHttpUrl", "moodboard page fetches must use guarded fetch");

const p0SecurityMigration = await readFile(
  "supabase/migrations/20260521_p0_security_rate_limits_share_links.sql",
  "utf8"
);
assertIncludes(
  p0SecurityMigration,
  'drop policy if exists "share_links_select_anon"',
  "share link tokens must not be listable through the anon Data API policy"
);
assertIncludes(
  p0SecurityMigration,
  "create table if not exists public.rate_limit_events",
  "durable rate limit event table must exist"
);
assertIncludes(
  p0SecurityMigration,
  "revoke all privileges on public.rate_limit_events from anon",
  "rate limit events must not be exposed through client roles"
);
assertIncludes(
  p0SecurityMigration,
  "revoke all privileges on public.rate_limit_events from authenticated",
  "rate limit events must not be exposed through authenticated client role"
);

const authActions = await readFile("src/lib/actions/auth.ts", "utf8");
assertIncludes(authActions, "auth.password_reset", "password reset must be rate limited");

const aiUsage = await readFile("src/lib/ai/usage.ts", "utf8");
assertIncludes(aiUsage, "ai.workspace_call", "AI calls must have a workspace burst limit");

const portalActions = await readFile("src/lib/actions/portal.ts", "utf8");
assertIncludes(portalActions, "assertRateLimit", "portal client actions must be attempt-rate-limited");

console.log("Security regression checks passed.");
