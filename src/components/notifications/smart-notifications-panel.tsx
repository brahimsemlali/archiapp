import Link from "next/link";
import { AlertTriangle, Bell, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { useLocalization } from "@/components/localization-provider";

export interface SmartAlert {
  id: string;
  type: "task" | "invoice" | "approval" | "risk" | "issue";
  title: string;
  detail: string;
  href?: string;
  dueDate?: string | null;
  amountCentimes?: number | null;
}

const TYPE_LABELS: Record<SmartAlert["type"], string> = {
  task: "Tâche",
  invoice: "Facture",
  approval: "Approbation",
  risk: "Risque",
  issue: "Réserve",
};

export function SmartNotificationsPanel({ alerts, loading = false, locale }: { alerts: SmartAlert[]; loading?: boolean; locale?: string }) {
  const { money } = useLocalization();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[#475569]" />
          Notifications intelligentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="rounded-xl border border-dashed border-[#D8D5CB] p-6 text-center">
            <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-[#2563EB]" />
            <p className="text-sm text-[#64748B]">Chargement des alertes…</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D8D5CB] p-6 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-[#B9DEC8]" />
            <p className="text-sm text-[#64748B]">Aucune alerte prioritaire.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => {
              const content = (
                <div className="rounded-lg border border-[#E5E7EB] bg-white p-3 transition-colors hover:bg-[#F7F8FA]">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#C75B2E]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-semibold text-[#475569]">
                          {TYPE_LABELS[alert.type]}
                        </span>
                        {alert.dueDate && <span className="text-[11px] text-[#64748B]">{formatDate(alert.dueDate, locale)}</span>}
                        {alert.amountCentimes != null && <span className="text-[11px] font-semibold text-[#0B1220]">{money(alert.amountCentimes)}</span>}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-[#0B1220]">{alert.title}</p>
                      <p className="mt-0.5 text-xs text-[#64748B]">{alert.detail}</p>
                    </div>
                  </div>
                </div>
              );
              return alert.href ? <Link key={alert.id} href={alert.href}>{content}</Link> : <div key={alert.id}>{content}</div>;
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
