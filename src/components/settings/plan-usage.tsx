import { BadgeDollarSign, Database, FolderOpen, Sparkles, Users } from "lucide-react";
import { getPlanLimits, formatLimit, type WorkspacePlan } from "@/lib/billing/plans";
import { createBillingCheckoutAction } from "@/lib/actions/billing";
import { isLemonBillingConfigured } from "@/lib/billing/lemonsqueezy";

interface PlanUsageProps {
  plan: WorkspacePlan;
  billingError?: string | null;
  subscription?: {
    status?: string | null;
    source?: string | null;
    currentPeriodEnd?: string | null;
    trialEndsAt?: string | null;
  };
  usage: {
    seats: number;
    projects: number;
    storageBytes: number;
    aiCalls: number;
  };
}

function usagePercent(current: number, limit: number | null): number {
  if (limit === null) return 0;
  return Math.min(100, Math.round((current / limit) * 100));
}

function formatStorage(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} Go`;
}

function UsageRow({
  icon: Icon,
  label,
  current,
  limit,
  suffix,
}: {
  icon: React.ElementType;
  label: string;
  current: number;
  limit: number | null;
  suffix?: string;
}) {
  const percent = usagePercent(current, limit);
  const nearLimit = limit !== null && percent >= 80;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-[#64748B]" />
          <p className="text-[13px] font-medium text-[#0B1220]">{label}</p>
        </div>
        <p className={`text-[12px] font-semibold ${nearLimit ? "text-[#C75B2E]" : "text-[#64748B]"}`}>
          {current}{suffix ? ` ${suffix}` : ""} / {formatLimit(limit, suffix)}
        </p>
      </div>
      {limit !== null && (
        <div className="h-1.5 rounded-full bg-[#E5E7EB] overflow-hidden">
          <div
            className={`h-full rounded-full ${nearLimit ? "bg-[#C75B2E]" : "bg-[#0B1220]"}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function PlanUsage({ plan, usage, subscription, billingError }: PlanUsageProps) {
  const limits = getPlanLimits(plan);
  const billingConfigured = isLemonBillingConfigured();
  const storageLimitBytes = limits.storageGb * 1024 * 1024 * 1024;
  const storagePercent = usagePercent(usage.storageBytes, storageLimitBytes);
  const storageNearLimit = storagePercent >= 80;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">Abonnement</p>
          <div className="flex items-center gap-2 mt-1">
            <h2 className="font-fraunces text-[26px] leading-none text-[#0B1220]">{limits.label}</h2>
            <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-semibold text-[#64748B]">
              {limits.monthlyPriceMad} MAD / mois
            </span>
          </div>
          <p className="text-[12.5px] text-[#64748B] mt-2 leading-relaxed">
            Les compteurs sont prêts pour l'application des limites et la facturation marocaine.
          </p>
        </div>
        {billingConfigured ? (
          <div className="flex flex-wrap gap-2">
            {plan !== "studio" && (
              <form action={createBillingCheckoutAction}>
                <input type="hidden" name="plan" value="studio" />
                <button className="inline-flex h-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-3 text-[12.5px] font-semibold text-[#0B1220] hover:bg-[#F7F8FA]">
                  <BadgeDollarSign className="mr-1.5 h-3.5 w-3.5" />
                  Studio AI
                </button>
              </form>
            )}
            {plan !== "agence" && (
              <form action={createBillingCheckoutAction}>
                <input type="hidden" name="plan" value="agence" />
                <button className="inline-flex h-8 items-center justify-center rounded-lg bg-[#0B1220] px-3 text-[12.5px] font-semibold text-white hover:bg-[#2C2D24]">
                  Agence AI
                </button>
              </form>
            )}
          </div>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex h-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F7F8FA] px-3 text-[12.5px] font-medium text-[#ADAB9D] cursor-not-allowed"
          >
            <BadgeDollarSign className="h-3.5 w-3.5 mr-1.5" />
            Paiement à configurer
          </button>
        )}
      </div>

      {billingError && (
        <div className="rounded-lg border border-[#F0D2C1] bg-[#FCEFE6] px-3 py-2 text-[12.5px] font-medium text-[#9F3D1F]">
          {billingError}
        </div>
      )}

      <div className="grid gap-2 rounded-lg border border-[#E5E7EB] bg-[#F7F8FA] p-3 text-[12.5px] text-[#475569] sm:grid-cols-3">
        <p><span className="font-semibold text-[#0B1220]">Source:</span> {subscription?.source ?? "manual"}</p>
        <p><span className="font-semibold text-[#0B1220]">Statut:</span> {subscription?.status ?? "manual"}</p>
        <p>
          <span className="font-semibold text-[#0B1220]">Période:</span>{" "}
          {formatDate(subscription?.currentPeriodEnd) ?? formatDate(subscription?.trialEndsAt) ?? "Non définie"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <UsageRow icon={Users} label="Utilisateurs" current={usage.seats} limit={limits.seats} />
        <UsageRow icon={FolderOpen} label="Projets actifs" current={usage.projects} limit={limits.projects} />
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-[#64748B]" />
              <p className="text-[13px] font-medium text-[#0B1220]">Stockage</p>
            </div>
            <p className={`text-[12px] font-semibold ${storageNearLimit ? "text-[#C75B2E]" : "text-[#64748B]"}`}>
              {formatStorage(usage.storageBytes)} / {limits.storageGb} Go
            </p>
          </div>
          <div className="h-1.5 rounded-full bg-[#E5E7EB] overflow-hidden">
            <div
              className={`h-full rounded-full ${storageNearLimit ? "bg-[#C75B2E]" : "bg-[#0B1220]"}`}
              style={{ width: `${storagePercent}%` }}
            />
          </div>
        </div>
        {limits.aiEnabled ? (
          <UsageRow icon={Sparkles} label="Appels IA ce mois" current={usage.aiCalls} limit={limits.aiCalls} />
        ) : (
          <div className="space-y-2 rounded-lg border border-[#E5E7EB] bg-[#F7F8FA] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[#64748B]" />
                <p className="text-[13px] font-medium text-[#0B1220]">Appels IA ce mois</p>
              </div>
              <p className="text-[12px] font-semibold text-[#64748B]">Non inclus</p>
            </div>
            <p className="text-[12px] leading-relaxed text-[#64748B]">
              Le plan Basic fonctionne sans API IA. Les fonctions IA se débloquent sur les plans Studio AI et Agence AI.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
