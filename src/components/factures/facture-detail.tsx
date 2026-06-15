"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { updateFactureStatusAction, deleteFactureAction } from "@/lib/actions/factures";
import { useLocalization } from "@/components/localization-provider";
import { Check, Send, X, Trash2, Loader2, Download, Receipt, Edit, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { DevisItem } from "@/lib/validators/devis";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type FactureStatus = "brouillon" | "envoyee" | "payee" | "annulee";

const STATUS_VARIANT: Record<FactureStatus, "default" | "secondary" | "outline" | "destructive"> = {
  brouillon: "secondary", envoyee: "outline", payee: "default", annulee: "destructive",
};

interface FactureDetailProps {
  facture: {
    id: string; number: string; title: string; status: FactureStatus;
    items: DevisItem[]; subtotalCentimes: number; tvaRate: number;
    tvaCentimes: number; totalCentimes: number; notes?: string | null;
    dueDate?: string | null; paidAt?: string | null; createdAt: string;
    devisId?: string | null;
  };
  client: { id: string; name: string; address?: string; ice?: string; cin?: string } | null;
  project: { id: string; title: string } | null;
  firmProfile: { firm_name?: string | null; architect_name?: string | null; address?: string | null; ice?: string | null; email?: string | null; phone?: string | null } | null;
  sentSnapshot: { id: string; created_at: string } | null;
  statusEvents: Array<{
    id: string;
    previous_status: string | null;
    next_status: string;
    source: string;
    created_at: string;
  }>;
}

export function FactureDetail({ facture: initial, client, project, firmProfile, sentSnapshot, statusEvents }: FactureDetailProps) {
  const { money, formatDate, taxLabel } = useLocalization();
  const [status, setStatus] = useState<FactureStatus>(initial.status);
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();
  const t = useTranslations("factures.detail");
  const ts = useTranslations("status.facture");
  const tc = useTranslations("common");

  async function changeStatus(next: FactureStatus) {
    setLoading(next);
    const result = await updateFactureStatusAction(initial.id, next);
    setLoading(null);
    if (!result.ok) { toast.error(result.error); return; }
    setStatus(next);
    toast.success(t("statusUpdated", { status: ts(next) }));
  }

  async function handleDelete() {
    setLoading("delete");
    await deleteFactureAction(initial.id);
    toast.success(t("deleted"));
    router.push("/factures");
  }

  const isOverdue = status === "envoyee" && initial.dueDate && new Date(initial.dueDate) < new Date();

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex items-center gap-3 flex-wrap bg-white border rounded-xl p-4">
        <Badge variant={STATUS_VARIANT[status]}>{ts(status)}</Badge>
        {isOverdue && <Badge variant="destructive">{t("overdue")}</Badge>}
        <div className="flex gap-2 ml-auto flex-wrap">
          {status === "brouillon" && (
            <>
              <Link href={`/factures/${initial.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />{tc("edit")}
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => changeStatus("envoyee")} disabled={!!loading}>
                {loading === "envoyee" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                {t("markSent")}
              </Button>
            </>
          )}
          {status === "envoyee" && (
            <>
              <Button variant="outline" size="sm" className="text-green-600 border-green-300" onClick={() => changeStatus("payee")} disabled={!!loading}>
                {loading === "payee" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                {t("markPaid")}
              </Button>
              <Button variant="outline" size="sm" className="text-destructive border-destructive/30" onClick={() => changeStatus("annulee")} disabled={!!loading}>
                {loading === "annulee" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
                {t("cancel")}
              </Button>
            </>
          )}
          <a href={`/api/factures/${initial.id}/pdf`} download>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />{t("downloadPdf")}
            </Button>
          </a>
          {status === "brouillon" && (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmDelete(true)} disabled={!!loading}>
              {loading === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {initial.paidAt && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 flex items-center gap-2">
          <Check className="h-4 w-4" />
          {t("paidOn", { date: formatDate(initial.paidAt) })}
        </div>
      )}

      {sentSnapshot && (
        <div className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#1E293B] flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#2F8F5C]" />
          {t("snapshotCaptured", { date: formatDate(sentSnapshot.created_at) })}
        </div>
      )}

      {statusEvents.length > 0 && (
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm font-semibold mb-3">{t("auditHistory")}</p>
          <div className="space-y-2">
            {statusEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                <div>
                  <p className="text-sm text-gray-700">
                    {event.previous_status ? `${(["brouillon","envoyee","payee","annulee"] as const).includes(event.previous_status as FactureStatus) ? ts(event.previous_status as FactureStatus) : event.previous_status} → ` : ""}
                    <span className="font-semibold">{(["brouillon","envoyee","payee","annulee"] as const).includes(event.next_status as FactureStatus) ? ts(event.next_status as FactureStatus) : event.next_status}</span>
                  </p>
                  <p className="text-xs text-gray-400">{t("auditSource", { source: event.source })}</p>
                </div>
                <p className="text-xs text-gray-400 shrink-0">{formatDate(event.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Printable document */}
      <div id="devis-print" className="bg-white border rounded-xl p-8 shadow-sm print:shadow-none print:border-none print:rounded-none">
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-lg font-bold">{firmProfile?.firm_name ?? t("firm")}</p>
            {firmProfile?.architect_name && <p className="text-sm text-gray-600">{firmProfile.architect_name}</p>}
            {firmProfile?.address && <p className="text-sm text-gray-500">{firmProfile.address}</p>}
            {firmProfile?.ice && <p className="text-sm text-gray-500">ICE : {firmProfile.ice}</p>}
            {firmProfile?.phone && <p className="text-sm text-gray-500">{firmProfile.phone}</p>}
            {firmProfile?.email && <p className="text-sm text-gray-500">{firmProfile.email}</p>}
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-2 bg-gray-900 text-white rounded-lg px-3 py-1.5 mb-3">
              <Receipt className="h-4 w-4" />
              <span className="text-sm font-semibold">{t("docLabel")}</span>
            </div>
            <p className="text-base font-bold">{initial.number}</p>
            <p className="text-sm text-gray-500">{t("dateLabel")} {formatDate(initial.createdAt)}</p>
            {initial.dueDate && <p className={`text-sm ${isOverdue ? "text-red-600 font-medium" : "text-gray-500"}`}>{t("dueDateLabel")} {formatDate(initial.dueDate)}</p>}
            {initial.devisId && <p className="text-xs text-gray-400 mt-1">{t("linkedDevis")}</p>}
          </div>
        </div>

        {client && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 inline-block min-w-[200px]">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{t("billTo")}</p>
            <p className="font-semibold">{client.name}</p>
            {client.address && <p className="text-sm text-gray-600">{client.address}</p>}
            {client.ice && <p className="text-sm text-gray-500">ICE : {client.ice}</p>}
            {client.cin && <p className="text-sm text-gray-500">CIN : {client.cin}</p>}
          </div>
        )}

        {project && <p className="text-sm text-gray-500 mb-6">{t("projectRef")} <span className="font-medium text-gray-700">{project.title}</span></p>}

        <h2 className="text-lg font-bold mb-6 border-b pb-2">{initial.title}</h2>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="bg-gray-900 text-white">
              <th className="text-left px-3 py-2 rounded-tl-lg">{t("colDescription")}</th>
              <th className="text-center px-3 py-2">{t("colQty")}</th>
              <th className="text-center px-3 py-2">{t("colUnit")}</th>
              <th className="text-right px-3 py-2">{t("colUnitPrice")}</th>
              <th className="text-right px-3 py-2 rounded-tr-lg">{t("colTotal")}</th>
            </tr>
          </thead>
          <tbody>
            {initial.items.map((item, idx) => (
              <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-3 py-2">{item.description}</td>
                <td className="px-3 py-2 text-center">{item.quantity}</td>
                <td className="px-3 py-2 text-center text-gray-500">{item.unit}</td>
                <td className="px-3 py-2 text-right">{money(item.unitPriceCentimes)}</td>
                <td className="px-3 py-2 text-right font-medium">{money(Math.round(item.quantity * item.unitPriceCentimes))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-64 space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-gray-500">{t("subtotal")}</span><span>{money(initial.subtotalCentimes)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">{taxLabel} {initial.tvaRate}%</span><span>{money(initial.tvaCentimes)}</span></div>
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>{t("totalTTC")}</span><span className="text-primary">{money(initial.totalCentimes)}</span>
            </div>
            {status === "payee" && initial.paidAt && (
              <div className="flex justify-between text-sm text-green-600 font-medium pt-1 border-t border-green-200">
                <span>{t("paidLabel")}</span><span>{formatDate(initial.paidAt)}</span>
              </div>
            )}
          </div>
        </div>

        {initial.notes && (
          <div className="mt-6 border-t pt-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{t("paymentConditions")}</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{initial.notes}</p>
          </div>
        )}

        <div className="mt-10 pt-6 border-t text-xs text-gray-400 text-center">
          {firmProfile?.firm_name} · {firmProfile?.address} · {firmProfile?.phone}
        </div>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("deleteTitle")}
        description={t("deleteDescription")}
        confirmLabel={t("deleteConfirm")}
        onConfirm={handleDelete}
      />
    </div>
  );
}
