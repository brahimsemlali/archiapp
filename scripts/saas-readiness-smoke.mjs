import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import ssrUtils from "@supabase/ssr/dist/main/utils/index.js";

const { createChunks, stringToBase64URL } = ssrUtils;

const APP_URL = process.env.SAAS_SMOKE_APP_URL ?? "http://localhost:3000";
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const MARK = `V1 Smoke ${RUN_ID}`;

function parseEnvFile(input) {
  return Object.fromEntries(
    input
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index);
        const raw = line.slice(index + 1);
        return [key, raw.replace(/^['"]|['"]$/g, "")];
      })
  );
}

async function loadEnv() {
  const localEnv = await readFile(".env.local", "utf8").catch(() => "");
  return { ...parseEnvFile(localEnv), ...process.env };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function summarizeHtml(body) {
  const text = body.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const notFoundIndex = text.indexOf("Page introuvable");
  if (notFoundIndex >= 0) return text.slice(Math.max(0, notFoundIndex - 80), notFoundIndex + 220);
  return text.slice(0, 300);
}

async function insertOne(supabase, table, payload) {
  const { data, error } = await supabase.from(table).insert(payload).select("id").single();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data.id;
}

async function fetchPage(path, cookieHeader) {
  const startedAt = performance.now();
  const response = await fetch(`${APP_URL}${path}`, {
    redirect: "manual",
    headers: { cookie: cookieHeader },
  });
  const body = await response.text();
  const durationMs = Math.round(performance.now() - startedAt);
  return {
    status: response.status,
    url: response.url,
    location: response.headers.get("location"),
    body,
    durationMs,
    bytes: Buffer.byteLength(body),
  };
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

async function assertWorkspaceConsistency(service) {
  const [
    { data: usersResult, error: usersError },
    { data: memberships, error: membershipsError },
    { data: workspaces, error: workspacesError },
    { data: profiles, error: profilesError },
  ] = await Promise.all([
    service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    service.from("workspace_members").select("workspace_id, user_id, role"),
    service.from("workspaces").select("id, owner_id, name"),
    service.from("firm_profile").select("workspace_id"),
  ]);

  if (usersError) throw new Error(`auth users consistency: ${usersError.message}`);
  if (membershipsError) throw new Error(`workspace_members consistency: ${membershipsError.message}`);
  if (workspacesError) throw new Error(`workspaces consistency: ${workspacesError.message}`);
  if (profilesError) throw new Error(`firm_profile consistency: ${profilesError.message}`);

  const memberUserIds = new Set((memberships ?? []).map((member) => member.user_id));
  const orphanUsers = usersResult.users.filter((user) => !memberUserIds.has(user.id));
  assert(
    orphanUsers.length === 0,
    `Found auth users without workspace membership: ${orphanUsers.map((user) => user.email ?? user.id).join(", ")}`
  );

  const ownerMemberships = new Set(
    (memberships ?? [])
      .filter((member) => member.role === "owner")
      .map((member) => `${member.workspace_id}:${member.user_id}`)
  );
  const workspacesWithoutOwnerMembership = (workspaces ?? []).filter(
    (workspace) => !ownerMemberships.has(`${workspace.id}:${workspace.owner_id}`)
  );
  assert(
    workspacesWithoutOwnerMembership.length === 0,
    `Found workspaces without owner membership: ${workspacesWithoutOwnerMembership.map((workspace) => workspace.name ?? workspace.id).join(", ")}`
  );

  const profileWorkspaceIds = new Set((profiles ?? []).map((profile) => profile.workspace_id));
  const workspacesWithoutProfile = (workspaces ?? []).filter((workspace) => !profileWorkspaceIds.has(workspace.id));
  assert(
    workspacesWithoutProfile.length === 0,
    `Found workspaces without firm_profile: ${workspacesWithoutProfile.map((workspace) => workspace.name ?? workspace.id).join(", ")}`
  );
}

async function main() {
  const env = await loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  assert(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL is missing.");
  assert(anonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.");
  assert(serviceKey, "SUPABASE_SERVICE_ROLE_KEY is missing.");

  const service = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const publicClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId;
  let workspaceId;

  try {
    const email = `saas-smoke-${RUN_ID}@archidesk.test`;
    const password = `Smoke-${RUN_ID}-123456!`;
    const { data: userResult, error: userError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { smoke_test: true, run_id: RUN_ID },
    });
    if (userError || !userResult.user) {
      throw new Error(userError?.message ?? "Could not create smoke test auth user.");
    }
    userId = userResult.user.id;

    workspaceId = await insertOne(service, "workspaces", {
      owner_id: userId,
      name: `${MARK} Studio`,
      plan: "studio",
      account_status: "active",
      subscription_status: "manual",
      subscription_source: "manual",
    });

    await service.from("workspace_members").insert({
      workspace_id: workspaceId,
      user_id: userId,
      role: "owner",
    }).throwOnError();

    await service.from("firm_profile").insert({
      workspace_id: workspaceId,
      profile_type: "architect",
      firm_name: `${MARK} Architecture`,
      architect_name: "Smoke Architect",
      email,
    }).throwOnError();

    const clientId = await insertOne(service, "clients", {
      workspace_id: workspaceId,
      name: `${MARK} Client`,
      type: "particulier",
      email: `client-${RUN_ID}@archidesk.test`,
    });

    const projectId = await insertOne(service, "projects", {
      workspace_id: workspaceId,
      client_id: clientId,
      title: `${MARK} Project`,
      type: "villa",
      phase: "aps",
      status: "actif",
      budget_estimate_centimes: 15000000,
      fees_centimes: 1200000,
      target_end_date: "2026-12-31",
    });

    await insertOne(service, "tasks", {
      workspace_id: workspaceId,
      client_id: clientId,
      project_id: projectId,
      assigned_to: userId,
      title: `${MARK} Task`,
      priority: "haute",
      status: "a_faire",
      due_date: "2026-06-15",
    });

    const item = {
      id: crypto.randomUUID(),
      description: `${MARK} Design mission`,
      quantity: 1,
      unit: "forfait",
      unitPriceCentimes: 1000000,
    };

    const devisId = await insertOne(service, "devis", {
      workspace_id: workspaceId,
      client_id: clientId,
      project_id: projectId,
      number: `DEV-SMOKE-${RUN_ID}`,
      title: `${MARK} Devis`,
      status: "envoye",
      items: [item],
      subtotal_centimes: 1000000,
      tva_rate: 20,
      tva_centimes: 200000,
      total_centimes: 1200000,
      valid_until: "2026-07-15",
    });

    const factureId = await insertOne(service, "factures", {
      workspace_id: workspaceId,
      client_id: clientId,
      project_id: projectId,
      devis_id: devisId,
      number: `FA-SMOKE-${RUN_ID}`,
      title: `${MARK} Facture`,
      status: "envoyee",
      items: [item],
      subtotal_centimes: 1000000,
      tva_rate: 20,
      tva_centimes: 200000,
      total_centimes: 1200000,
      due_date: "2026-08-15",
    });

    const { data: sessionResult, error: sessionError } = await publicClient.auth.signInWithPassword({
      email,
      password,
    });
    if (sessionError || !sessionResult.session) {
      throw new Error(sessionError?.message ?? "Could not create smoke test session.");
    }

    await assertWorkspaceConsistency(service);

    const projectRef = new URL(supabaseUrl).host.split(".")[0];
    const sessionCookieName = `sb-${projectRef}-auth-token`;
    const sessionCookieValue = `base64-${stringToBase64URL(JSON.stringify(sessionResult.session))}`;
    const cookieHeader = [
      ...createChunks(sessionCookieName, sessionCookieValue).map((cookie) => `${cookie.name}=${cookie.value}`),
      `archidesk_active_workspace_id=${workspaceId}`,
    ].join("; ");

    const checks = [
      { path: "/dashboard", includes: [`${MARK} Project`] },
      { path: "/clients", includes: [`${MARK} Client`] },
      { path: `/clients/${clientId}`, includes: [`${MARK} Client`, `${MARK} Project`, `${MARK} Devis`, `${MARK} Facture`] },
      { path: "/projects", includes: [`${MARK} Project`] },
      { path: `/projects/${projectId}`, includes: [`${MARK} Project`, `${MARK} Task`, `${MARK} Devis`, `${MARK} Facture`] },
      { path: "/tasks", includes: [`${MARK} Task`] },
      { path: "/devis", includes: [`${MARK} Devis`, `DEV-SMOKE-${RUN_ID}`] },
      { path: `/devis/${devisId}`, includes: [`${MARK} Devis`, `DEV-SMOKE-${RUN_ID}`] },
      { path: "/factures", includes: [`${MARK} Facture`, `FA-SMOKE-${RUN_ID}`] },
      { path: `/factures/${factureId}`, includes: [`${MARK} Facture`, `FA-SMOKE-${RUN_ID}`] },
    ];

    const timings = [];
    for (const check of checks) {
      const page = await fetchPage(check.path, cookieHeader);
      timings.push({ path: check.path, durationMs: page.durationMs, bytes: page.bytes });
      assert(page.status === 200, `${check.path} returned ${page.status}${page.location ? ` -> ${page.location}` : ""}.`);
      const pageSummary = summarizeHtml(page.body);
      assert(
        !pageSummary.includes("Page introuvable"),
        `${check.path} rendered the not-found UI at ${page.url}. Body: ${pageSummary}`
      );
      for (const expectedText of check.includes) {
        assert(
          page.body.includes(expectedText),
          `${check.path} did not render "${expectedText}". Body: ${summarizeHtml(page.body)}`
        );
      }
      console.log(`ok ${check.path} ${page.durationMs}ms ${Math.round(page.bytes / 1024)}KB`);
    }

    const durations = timings.map((timing) => timing.durationMs);
    const slowest = [...timings].sort((a, b) => b.durationMs - a.durationMs).slice(0, 5);
    console.log("\nTiming summary");
    console.log(`avg ${Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)}ms`);
    console.log(`p50 ${percentile(durations, 50)}ms`);
    console.log(`p95 ${percentile(durations, 95)}ms`);
    console.log("slowest");
    for (const timing of slowest) {
      console.log(`- ${timing.path}: ${timing.durationMs}ms (${Math.round(timing.bytes / 1024)}KB)`);
    }

    console.log(`\nSaaS readiness smoke passed for ${MARK}.`);
  } finally {
    if (workspaceId) {
      await service.from("workspaces").delete().eq("id", workspaceId);
    }
    if (userId) {
      await service.auth.admin.deleteUser(userId);
    }
  }
}

main().catch((error) => {
  console.error(`\nSaaS readiness smoke failed: ${error.message}`);
  process.exit(1);
});
