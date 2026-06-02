import { describe, it, expect } from "vitest";
import { getPlanLimits, formatLimit, isAiEnabledForPlan, PLAN_LIMITS } from "./plans";

describe("getPlanLimits", () => {
  it("returns the matching plan", () => {
    expect(getPlanLimits("studio")).toBe(PLAN_LIMITS.studio);
    expect(getPlanLimits("agence")).toBe(PLAN_LIMITS.agence);
  });

  it("falls back to solo for unknown/null/undefined plans", () => {
    expect(getPlanLimits(null)).toBe(PLAN_LIMITS.solo);
    expect(getPlanLimits(undefined)).toBe(PLAN_LIMITS.solo);
    expect(getPlanLimits("enterprise-typo")).toBe(PLAN_LIMITS.solo);
  });
});

describe("plan AI gating", () => {
  it("disables AI on the free solo plan, enables it on paid plans", () => {
    expect(isAiEnabledForPlan("solo")).toBe(false);
    expect(isAiEnabledForPlan("studio")).toBe(true);
    expect(isAiEnabledForPlan("agence")).toBe(true);
  });

  it("treats unknown plans as the free plan (AI off)", () => {
    expect(isAiEnabledForPlan(null)).toBe(false);
  });

  it("solo plan has zero AI calls (so the quota guard rejects)", () => {
    expect(PLAN_LIMITS.solo.aiCalls).toBe(0);
  });
});

describe("formatLimit", () => {
  it("renders unlimited for null", () => {
    expect(formatLimit(null)).toBe("Illimité");
  });
  it("renders the value with an optional unit", () => {
    expect(formatLimit(10)).toBe("10");
    expect(formatLimit(50, "Go")).toBe("50 Go");
  });
});
