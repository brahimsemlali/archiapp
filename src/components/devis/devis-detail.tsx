"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { updateDevisStatusAction, deleteDevisAction } from "@/lib/actions/devis";
import { formatDate, formatMAD } from "@/lib/format";
import { Check, Send, X, Trash2, Loader2, Download, Edit, FileText } from "lucide-react";
import Link from "next/link";
import type { DevisItem } from "@/lib/validators/devis";
import { useRouter } from "next/navigation";

type DevisStatus = "brouillon" | "envoye" | "accepte" | "refuse" | "expire";

const STATUS_LABELS: Record<DevisStatus, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  accepte: "Accepté",
  refuse: "Refusé",
  expire: "Expiré",
};

const STATUS_VARIANT: Record<DevisStatus, "default" | "secondary" | "outline" | "destructive"> = {
  brouillon: "secondary",
  envoye: "outline",
  accepte: "default",
  refuse: "destructive",
  expire: "outline",
};

interface DevisDetailProps {
  devis: {
    id: string;
    number: string;
    title: string;
    status: DevisStatus;
    items: DevisItem[];
    subtotalCentimes: number;
    tvaRate: number;
    tvaCentimes: number;
    totalCentimes: number;
    notes?: string | null;
    validUntil?: string | null;
    createdAt: string;
  };
  client: { id: string; name: string; address?: string; ice?: string; cin?: string } | null;
  project: { id: string; title: string } | null;
  firmProfile: {
    firm_name?: string | null;
    architect_name?: string | null;
    address?: string | null;
    ice?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
}

export function DevisDetail({ devis: initial, client, project, firmProfile }: DevisDetailProps) {
  const [status, setStatus] = useState<DevisStatus>(initial.status);
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  async function changeStatus(next: DevisStatus) {
    setLoading(next);
    const result = await updateDevisStatusAction(initial.id, next);
    setLoading(null);
    if (!result.ok) { toast.error(result.error); return; }
    setStatus(next);
    toast.success(`Statut mis à jour : ${STATUS_LABELS[next]}`);
  }

  async function handleDelete() {
    if (!confirm("Supprimer ce devis ? Cette action est irréversible.")) return;
    setLoading("delete");
    await deleteDevisAction(initial.id);
    toast.success("Devis supprimé.");
    router.push("/devis");
  }

  const handlePrint = () => window.print();

  return (
    <div className="space-y-4">
      {/* Status + actions */}
      <div className="flex items-center gap-3 flex-wrap bg-white border rounded-xl p-4">
        <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>
        <div className="flex gap-2 ml-auto flex-wrap">
          {status === "brouillon" && (
            <>
              <Link href={`/devis/${initial.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />Modifier
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => changeStatus("envoye")} disabled={!!loading}>
                {loading === "envoye" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Marquer envoyé
              </Button>
            </>
          )}
          {status === "envoye" && (
            <>
              <Button variant="outline" size="sm" className="text-green-600 border-green-300" onClick={() => changeStatus("accepte")} disabled={!!loading}>
                {loading === "accepte" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Accepté
              </Button>
              <Button variant="outline" size="sm" className="text-destructive border-destructive/30" onClick={() => changeStatus("refuse")} disabled={!!loading}>
                {loading === "refuse" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
                Refusé
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Download className="h-4 w-4 mr-2" />PDF / Imprimer
          </Button>
          {status === "brouillon" && (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={handleDelete} disabled={!!loading}>
              {loading === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Printable devis document */}
      <div id="devis-print" className="bg-white border rounded-xl p-8 shadow-sm print:shadow-none print:border-none print:rounded-none">
        {/* Firm header */}
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
            <div className="inline-flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5 mb-3">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">DEVIS</span>
            </div>
            <p className="text-base font-bold">{initial.number}</p>
            <p className="text-sm text-gray-500">Date : {formatDate(initial.createdAt)}</p>
            {initial.validUntil && (
              <p className="text-sm text-gray-500">Valable jusqu'au : {formatDate(initial.validUntil)}</p>
            )}
          </div>
        </div>

        {/* Client info */}
        {client && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 inline-block min-w-[200px]">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Destinataire</p>
            <p className="font-semibold">{client.name}</p>
            {client.address && <p className="text-sm text-gray-600">{client.address}</p>}
            {client.ice && <p className="text-sm text-gray-500">ICE : {client.ice}</p>}
            {client.cin && <p className="text-sm text-gray-500">CIN : {client.cin}</p>}
          </div>
        )}

        {/* Project ref */}
        {project && (
          <p className="text-sm text-gray-500 mb-6">
            Réf. projet : <span className="font-medium text-gray-700">{project.title}</span>
          </p>
        )}

        {/* Title */}
        <h2 className="text-lg font-bold mb-6 border-b pb-2">{initial.title}</h2>

        {/* Items table */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="bg-gray-100">
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
                <td className="px-3 py-2 text-right font-medium">
                  {formatMAD(Math.round(item.quantity * item.unitPriceCentimes))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Sous-total HT</span>
              <span>{formatMAD(initial.subtotalCentimes)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">TVA {initial.tvaRate}%</span>
              <span>{formatMAD(initial.tvaCentimes)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Total TTC</span>
              <span className="text-primary">{formatMAD(initial.totalCentimes)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {initial.notes && (
          <div className="mt-6 border-t pt-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Conditions</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{initial.notes}</p>
          </div>
        )}

        {/* Signature area */}
        <div className="mt-10 grid grid-cols-2 gap-8">
          <div>
            <p className="text-xs text-gray-400 mb-6">Cachet et signature de l'architecte</p>
            <div className="border-t border-dashed border-gray-300 pt-2">
              <p className="text-xs text-gray-400">{firmProfile?.architect_name ?? ""}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-6">Bon pour accord — Signature du client</p>
            <div className="border-t border-dashed border-gray-300 pt-2">
              <p className="text-xs text-gray-400">{client?.name ?? ""}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
