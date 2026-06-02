export type WorkspacePlan = "solo" | "studio" | "agence";

export interface PlanLimits {
  label: string;
  monthlyPriceMad: number;
  seats: number;
  projects: number | null;
  storageGb: number;
  aiCalls: number;
  aiEnabled: boolean;
  lemonSqueezyVariantEnv?: string;
}

export const PLAN_LIMITS: Record<WorkspacePlan, PlanLimits> = {
  solo: {
    label: "Basic",
    monthlyPriceMad: 0,
    seats: 1,
    projects: 10,
    storageGb: 5,
    aiCalls: 0,
    aiEnabled: false,
  },
  studio: {
    label: "Studio AI",
    monthlyPriceMad: 399,
    seats: 3,
    projects: null,
    storageGb: 50,
    aiCalls: 100,
    aiEnabled: true,
    lemonSqueezyVariantEnv: "LEMON_SQUEEZY_STUDIO_VARIANT_ID",
  },
  agence: {
    label: "Agence AI",
    monthlyPriceMad: 799,
    seats: 10,
    projects: null,
    storageGb: 200,
    aiCalls: 300,
    aiEnabled: true,
    lemonSqueezyVariantEnv: "LEMON_SQUEEZY_AGENCE_VARIANT_ID",
  },
};

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  if (plan === "studio" || plan === "agence" || plan === "solo") {
    return PLAN_LIMITS[plan];
  }
  return PLAN_LIMITS.solo;
}

export function formatLimit(value: number | null, unit = ""): string {
  if (value === null) return "Illimité";
  return `${value}${unit ? ` ${unit}` : ""}`;
}

export function isAiEnabledForPlan(plan: string | null | undefined): boolean {
  return getPlanLimits(plan).aiEnabled;
}
