import { describe, it, expect } from "vitest";
import { getAdminMetrics, getAttentionList } from "./metrics";
import type { AdminWorkspace } from "./workspaces";

function ws(overrides: Partial<AdminWorkspace>): AdminWorkspace {
  return {
    id: "w", name: "W", ownerId: "o", ownerEmail: null, ownerBannedUntil: null,
    plan: "solo", accountStatus: "active", subscriptionStatus: "manual", subscriptionSource: "manual",
    lemonSqueezyCustomerId: null, lemonSqueezySubscriptionId: null, currentPeriodEnd: null,
    trialEndsAt: null, suspendedAt: null, suspendedReason: null,
    createdAt: "2020-01-01T00:00:00Z", updatedAt: "2020-01-01T00:00:00Z",
    membersCount: 1, projectsCount: 0, clientsCount: 0, storageBytes: 0, aiCallsThisMonth: 0,
    lastActivityAt: null,
    ...overrides,
  };
}

const NOW = new Date("2026-06-15T12:00:00Z");

describe("admin MRR metrics (collected vs comped)", () => {
  it("counts ONLY LemonSqueezy-billed active paid plans as collected MRR", () => {
    const m = getAdminMetrics([
      ws({ plan: "studio", subscriptionStatus: "active", subscriptionSource: "lemonsqueezy" }), // +399
      ws({ plan: "agence", subscriptionStatus: "active", subscriptionSource: "lemonsqueezy" }), // +799
    ], NOW);
    expect(m.collectedMrrMad).toBe(399 + 799);
    expect(m.collectedArrMad).toBe((399 + 799) * 12);
    expect(m.collectedPayingCount).toBe(2);
  });

  it("EXCLUDES manual/comped active rows from collected MRR (the headline must not inflate)", () => {
    const m = getAdminMetrics([
      ws({ plan: "studio", subscriptionStatus: "active", subscriptionSource: "manual" }), // comped
      ws({ plan: "agence", subscriptionStatus: "active", subscriptionSource: "manual" }),
    ], NOW);
    expect(m.collectedMrrMad).toBe(0);
    expect(m.collectedPayingCount).toBe(0);
    expect(m.manualActiveCount).toBe(2);
    expect(m.manualActiveValueMad).toBe(399 + 799);
  });

  it("does not count trialing or past_due paid plans as collected", () => {
    const m = getAdminMetrics([
      ws({ plan: "studio", subscriptionStatus: "trialing", subscriptionSource: "lemonsqueezy" }),
      ws({ plan: "studio", subscriptionStatus: "past_due", subscriptionSource: "lemonsqueezy" }),
    ], NOW);
    expect(m.collectedMrrMad).toBe(0);
    expect(m.activeTrials).toBe(1);
    expect(m.pastDueCount).toBe(1);
  });
});

describe("admin trial / risk metrics", () => {
  it("trials = subscription_status trialing; ending-soon only within 7 days", () => {
    const m = getAdminMetrics([
      ws({ subscriptionStatus: "trialing", trialEndsAt: "2026-06-18T12:00:00Z" }), // in 3d → soon
      ws({ subscriptionStatus: "trialing", trialEndsAt: "2026-06-30T12:00:00Z" }), // 15d → not soon
      ws({ subscriptionStatus: "trialing", trialEndsAt: null }),                    // trial, no date
      // converted row that still carries a trial_ends_at must NOT count as a trial
      ws({ plan: "studio", subscriptionStatus: "active", subscriptionSource: "lemonsqueezy", trialEndsAt: "2026-06-18T12:00:00Z" }),
    ], NOW);
    expect(m.activeTrials).toBe(3);
    expect(m.trialsEndingSoon).toBe(1);
  });

  it("separates past_due (recoverable), suspended, and churned", () => {
    const m = getAdminMetrics([
      ws({ subscriptionStatus: "past_due" }),
      ws({ accountStatus: "suspended" }),
      ws({ accountStatus: "cancelled" }),
    ], NOW);
    expect(m.pastDueCount).toBe(1);
    expect(m.suspendedCount).toBe(1);
    expect(m.churnedCount).toBe(1);
  });

  it("counts new workspaces created this month", () => {
    const m = getAdminMetrics([
      ws({ createdAt: "2026-06-10T00:00:00Z" }),
      ws({ createdAt: "2026-05-15T00:00:00Z" }),
    ], NOW);
    expect(m.newThisMonth).toBe(1);
  });
});

describe("attention list", () => {
  it("surfaces past_due first, then suspended, then trials ending soon", () => {
    const list = getAttentionList([
      ws({ id: "trial", subscriptionStatus: "trialing", trialEndsAt: "2026-06-17T12:00:00Z" }),
      ws({ id: "due", subscriptionStatus: "past_due" }),
      ws({ id: "susp", accountStatus: "suspended" }),
      ws({ id: "fine", plan: "studio", subscriptionStatus: "active", subscriptionSource: "lemonsqueezy" }),
    ], NOW);
    expect(list.map((i) => i.workspace.id)).toEqual(["due", "susp", "trial"]);
  });
});
