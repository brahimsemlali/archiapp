import { getPlanLimits } from "@/lib/billing/plans";
import type { AdminWorkspace } from "@/lib/admin/workspaces";

/**
 * Superadmin revenue + operations metrics, computed from the already-fetched
 * workspace list (pure — no DB). Kept separate + unit-tested because the MRR
 * definition is subtle: only LemonSqueezy-billed active subscriptions are
 * "collected" cash. Manually-flipped active rows (comped friends, or bank/cash
 * billing tracked by hand) are NOT auto-collected revenue and are reported
 * separately so the headline MRR is never inflated.
 */
export interface AdminMetrics {
  totalWorkspaces: number;
  newThisMonth: number;
  /** Auto-collected recurring revenue: source=lemonsqueezy, status=active, paid plan. */
  collectedMrrMad: number;
  collectedArrMad: number;
  collectedPayingCount: number;
  /** Admin-flipped active paid plans — comped or off-platform billing, NOT collected MRR. */
  manualActiveCount: number;
  manualActiveValueMad: number;
  /** subscription_status = trialing (the trial set; do NOT derive from trial_ends_at). */
  activeTrials: number;
  /** Trials whose trial_ends_at falls within the next 7 days. */
  trialsEndingSoon: number;
  /** past_due = recoverable, urgent (dunning). */
  pastDueCount: number;
  /** account suspended (access cut). */
  suspendedCount: number;
  /** account cancelled = churned (not "at risk" — already gone). */
  churnedCount: number;
  totalAiCalls: number;
  totalStorageBytes: number;
}

const PAID_PLANS = new Set(["studio", "agence"]);
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function getAdminMetrics(workspaces: AdminWorkspace[], now: Date = new Date()): AdminMetrics {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const soonCutoff = new Date(now.getTime() + SEVEN_DAYS_MS);

  let collectedMrrMad = 0;
  let collectedPayingCount = 0;
  let manualActiveCount = 0;
  let manualActiveValueMad = 0;
  let activeTrials = 0;
  let trialsEndingSoon = 0;
  let pastDueCount = 0;
  let suspendedCount = 0;
  let churnedCount = 0;
  let newThisMonth = 0;
  let totalAiCalls = 0;
  let totalStorageBytes = 0;

  for (const ws of workspaces) {
    totalAiCalls += ws.aiCallsThisMonth;
    totalStorageBytes += ws.storageBytes;
    if (ws.createdAt && new Date(ws.createdAt) >= monthStart) newThisMonth += 1;

    const price = getPlanLimits(ws.plan).monthlyPriceMad;
    const paidPlan = PAID_PLANS.has(ws.plan);

    if (paidPlan && ws.subscriptionStatus === "active") {
      if (ws.subscriptionSource === "lemonsqueezy") {
        collectedMrrMad += price;
        collectedPayingCount += 1;
      } else {
        manualActiveCount += 1;
        manualActiveValueMad += price;
      }
    }

    if (ws.subscriptionStatus === "trialing") {
      activeTrials += 1;
      if (ws.trialEndsAt) {
        const ends = new Date(ws.trialEndsAt);
        if (ends >= now && ends <= soonCutoff) trialsEndingSoon += 1;
      }
    }

    if (ws.subscriptionStatus === "past_due") pastDueCount += 1;
    if (ws.accountStatus === "suspended") suspendedCount += 1;
    if (ws.accountStatus === "cancelled") churnedCount += 1;
  }

  return {
    totalWorkspaces: workspaces.length,
    newThisMonth,
    collectedMrrMad,
    collectedArrMad: collectedMrrMad * 12,
    collectedPayingCount,
    manualActiveCount,
    manualActiveValueMad,
    activeTrials,
    trialsEndingSoon,
    pastDueCount,
    suspendedCount,
    churnedCount,
    totalAiCalls,
    totalStorageBytes,
  };
}

/** Workspaces needing a superadmin's attention today, with the reason + urgency. */
export interface AttentionItem {
  workspace: AdminWorkspace;
  reason: "trial_ending" | "past_due" | "suspended";
  detail: string;
}

export function getAttentionList(workspaces: AdminWorkspace[], now: Date = new Date()): AttentionItem[] {
  const soonCutoff = new Date(now.getTime() + SEVEN_DAYS_MS);
  const items: AttentionItem[] = [];

  for (const ws of workspaces) {
    if (ws.subscriptionStatus === "past_due") {
      items.push({ workspace: ws, reason: "past_due", detail: "Paiement échoué — relancer" });
    } else if (ws.accountStatus === "suspended") {
      items.push({ workspace: ws, reason: "suspended", detail: ws.suspendedReason ?? "Accès suspendu" });
    } else if (ws.subscriptionStatus === "trialing" && ws.trialEndsAt) {
      const ends = new Date(ws.trialEndsAt);
      if (ends >= now && ends <= soonCutoff) {
        const days = Math.max(0, Math.ceil((ends.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
        items.push({ workspace: ws, reason: "trial_ending", detail: `Essai se termine dans ${days} j` });
      }
    }
  }

  // past_due first (recoverable + urgent), then suspended, then trials ending
  const order = { past_due: 0, suspended: 1, trial_ending: 2 } as const;
  return items.sort((a, b) => order[a.reason] - order[b.reason]);
}
