"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { updateFactureStatusAction, deleteFactureAction } from "@/lib/actions/factures";
import { formatDate, formatMAD } from "@/lib/format";
import { Check, Send, X, Trash2, Loader2, Download, Receipt } from "lucide-react";
import Link from "next/link";
import type { DevisItem } from "@/lib/validators/devis";
import { useRouter } from "next/navigation";

type FactureStatus = "brouillon" | "envoyee" | "payee" | "annulee";

const STATUS_LABELS: Record<FactureStatus, string> = {
  brouillon: "Brouillon", envoyee: "Envoyée", payee: "Payée", annulee: "Annulée",
};
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
}

export function FactureDetail({ facture: initial, client, project, firmProfile }: FactureDetailProps) {
  const [status, setStatus] = useState<FactureStatus>(initial.status);
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  async function changeStatus(next: FactureStatus) {
    setLoading(next);
    const result = await updateFactureStatusAction(initial.id, next);
    setLoading(null);
    if (!result.ok) { toast.error(result.error); return; }
    setStatus(next);
    toast.success(`Facture ${STATUS_LABELS[next].toLowerCase()}.`);
  }

  async function handleDelete() {
    if (!confirm("Supprimer cette facture ?")) return;
    setLoading("delete");
    await deleteFactureAction(initial.id);
    toast.success("Facture supprimée.");
    router.push("/factures");
  }

  const isOverdue = status === "envoyee" && initial.dueDate && new Date(initial.dueDate) < new Date();

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex items-center gap-3 flex-wrap bg-white border rounded-xl p-4">
        <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>
        {isOverdue && <Badge variant="destructive">En retard</Badge>}
        <div className="flex gap-2 ml-auto flex-wrap">
          {status === "brouillon" && (
            <Button variant="outline" size="sm" onClick={() => changeStatus("envoyee")} disabled={!!loading}>
              {loading === "envoyee" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Marquer envoyée
            </Button>
          )}
          {status === "envoyee" && (
            <>
              <Button variant="outline" size="sm" className="text-green-600 border-green-300" onClick={() => changeStatus("payee")} disabled={!!loading}>
                {loading === "payee" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Marquer payée
              </Button>
              <Button variant="outline" size="sm" className="text-destructive border-destructive/30" onClick={() => changeStatus("annulee")} disabled={!!loading}>
                {loading === "annulee" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
                Annuler
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Download className="h-4 w-4 mr-2" />PDF / Imprimer
          </Button>
          {status === "brouillon" && (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={handleDelete} disabled={!!loading}>
              {loading === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {initial.paidAt && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 flex items-center gap-2">
          <Check className="h-4 w-4" />
          Paiement reçu le {formatDate(initial.paidAt)}
        </div>
      )}

      {/* Printable document */}
      <div id="devis-print" className="bg-white border rounded-xl p-8 shadow-sm print:shadow-none print:border-none print:rounded-none">
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-lg font-bold">{firmProfile?.firm_name ?? "Cabinet d'architecture"}</p>
            {firmProfile?.architect_name && <p className="text-sm text-gray-600">{firmProfile.architect_name}</p>}
            {firmProfile?.address && <p className="text-sm text-gray-500">{firmProfile.address}</p>}
            {firmProfile?.ice && <p className="text-sm text-gray-500">ICE : {firmProfile.ice}</p>}
            {firmProfile?.phone && <p className="text-sm text-gray-500">{firmProfile.phone}</p>}
            {firmProfile?.email && <p className="text-sm text-gray-500">{firmProfile.email}</p>}
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-2 bg-gray-900 text-white rounded-lg px-3 py-1.5 mb-3">
              <Receipt className="h-4 w-4" />
              <span className="text-sm font-semibold">FACTURE</span>
            </div>
            <p className="text-base font-bold">{initial.number}</p>
            <p className="text-sm text-gray-500">Date : {formatDate(initial.createdAt)}</p>
            {initial.dueDate && <p className={`text-sm ${isOverdue ? "text-red-600 font-medium" : "text-gray-500"}`}>Échéance : {formatDate(initial.dueDate)}</p>}
            {initial.devisId && <p className="text-xs text-gray-400 mt-1">Réf. devis lié</p>}
          </div>
        </div>

        {client && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 inline-block min-w-[200px]">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Facturé à</p>
            <p className="font-semibold">{client.name}</p>
            {client.address && <p className="text-sm text-gray-600">{client.address}</p>}
            {client.ice && <p className="text-sm text-gray-500">ICE : {client.ice}</p>}
            {client.cin && <p className="text-sm text-gray-500">CIN : {client.cin}</p>}
          </div>
        )}

        {project && <p className="text-sm text-gray-500 mb-6">Réf. projet : <span className="font-medium text-gray-700">{project.title}</span></p>}

        <h2 className="text-lg font-bold mb-6 border-b pb-2">{initial.title}</h2>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="bg-gray-900 text-white">
              <th className="text-left px-3 py-2 rounded-tl-lg">Description</th>
              <th className="text-center px-3 py-2">Qté</th>
              <th className="text-center px-3 py-2">Unité</th>
              <th className="text-right px-3 py-2">P.U. HT</th>
              <th className="text-right px-3 py-2 rounded-tr-lg">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {initial.items.map((item, idx) => (
              <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-3 py-2">{item.description}</td>
                <td className="px-3 py-2 text-center">{item.quantity}</td>
                <td className="px-3 py-2 text-center text-gray-500">{item.unit}</td>
                <td className="px-3 py-2 text-right">{formatMAD(item.unitPriceCentimes)}</td>
                <td className="px-3 py-2 text-right font-medium">{formatMAD(Math.round(item.quantity * item.unitPriceCentimes))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-64 space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Sous-total HT</span><span>{formatMAD(initial.subtotalCentimes)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">TVA {initial.tvaRate}%</span><span>{formatMAD(initial.tvaCentimes)}</span></div>
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Total TTC</span><span className="text-primary">{formatMAD(initial.totalCentimes)}</span>
            </div>
            {status === "payee" && initial.paidAt && (
              <div className="flex justify-between text-sm text-green-600 font-medium pt-1 border-t border-green-200">
                <span>Payé le</span><span>{formatDate(initial.paidAt)}</span>
              </div>
            )}
          </div>
        </div>

        {initial.notes && (
          <div className="mt-6 border-t pt-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Conditions de paiement</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{initial.notes}</p>
          </div>
        )}

        <div className="mt-10 pt-6 border-t text-xs text-gray-400 text-center">
          {firmProfile?.firm_name} · {firmProfile?.address} · {firmProfile?.phone}
        </div>
      </div>
    </div>
  );
}
