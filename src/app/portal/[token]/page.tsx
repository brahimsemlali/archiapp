import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { requireWorkspaceAccountActive } from "@/lib/workspace";
import { formatDate, formatMAD, formatFileSize } from "@/lib/format";
import { Download, FileText, FileImage, File, Building2, Ruler, Calendar, CheckCircle2, Circle, Clock, MessageCircle, Receipt, Upload } from "lucide-react";
import Image from "next/image";
import { SignaturePadPortal } from "@/components/contracts/signature-pad-portal";
import { PortalDevisResponse, PortalDocumentUpload, PortalFileApproval, PortalMessageForm } from "@/components/portal/portal-actions";

const STORAGE_BUCKET = "project-files";

const PHASES = [
  { key: "esquisse", label: "Esquisse" },
  { key: "aps", label: "APS" },
  { key: "apd", label: "APD" },
  { key: "pc", label: "PC" },
  { key: "dce", label: "DCE" },
  { key: "chantier", label: "Chantier" },
  { key: "reception", label: "Réception" },
  { key: "termine", label: "Terminé" },
];

const TYPE_LABELS: Record<string, string> = {
  villa: "Villa", appartement: "Appartement", immeuble: "Immeuble",
  commercial: "Commercial", renovation: "Rénovation", amenagement: "Aménagement", autre: "Autre",
};

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  mission_complete: "Mission complète",
  mission_partielle: "Mission partielle",
  etude_faisabilite: "Étude de faisabilité",
  suivi_chantier: "Suivi de chantier",
  autre: "Autre",
};

const DEVIS_STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  envoye: "En attente",
  accepte: "Accepté",
  refuse: "Refusé",
  expire: "Expiré",
};

const FACTURE_STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  envoyee: "À régler",
  payee: "Payée",
  annulee: "Annulée",
};

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <FileImage className="h-4 w-4 text-blue-500" />;
  if (mimeType === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
  return <File className="h-4 w-4 text-gray-400" />;
}

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createServiceClient();

  const { data: shareLink } = await supabase
    .from("share_links")
    .select("*")
    .eq("token", token)
    .eq("resource_type", "project")
    .single();

  if (!shareLink) notFound();

  if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <Clock className="h-12 w-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-lg font-semibold">Lien expiré</h1>
          <p className="text-sm text-gray-500 mt-2">
            Ce lien de partage n'est plus valide. Contactez votre architecte pour un nouveau lien.
          </p>
        </div>
      </div>
    );
  }

  const workspaceStatus = await requireWorkspaceAccountActive(supabase, shareLink.workspace_id);
  if (!workspaceStatus.ok) notFound();

  // Track access
  await supabase
    .from("share_links")
    .update({
      accessed_count: shareLink.accessed_count + 1,
      last_accessed_at: new Date().toISOString(),
    })
    .eq("id", shareLink.id);

  const projectId = shareLink.resource_id;

  const [
    { data: project },
    { data: files },
    { data: contracts },
    { data: devisList },
    { data: facturesList },
    { data: messages },
    { data: firmProfile },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("*, clients!projects_client_id_fkey(name, phone, email)")
      .eq("id", projectId)
      .eq("workspace_id", shareLink.workspace_id)
      .single(),
    supabase
      .from("files")
      .select("id, filename, folder, size_bytes, mime_type, storage_path, version, approval_status, approval_note, created_at")
      .eq("workspace_id", shareLink.workspace_id)
      .eq("project_id", projectId)
      .in("approval_status", ["pending", "approved"])
      .is("parent_file_id", null)
      .order("folder")
      .order("created_at", { ascending: false }),
    supabase
      .from("contracts")
      .select("id, title, type, status, version, created_at")
      .eq("workspace_id", shareLink.workspace_id)
      .eq("project_id", projectId)
      .eq("status", "finalise")
      .order("created_at", { ascending: false }),
    supabase
      .from("devis")
      .select("id, number, title, status, total_centimes, valid_until, created_at")
      .eq("workspace_id", shareLink.workspace_id)
      .eq("project_id", projectId)
      .neq("status", "brouillon")
      .order("created_at", { ascending: false }),
    supabase
      .from("factures")
      .select("id, number, title, status, total_centimes, due_date, paid_at, created_at")
      .eq("workspace_id", shareLink.workspace_id)
      .eq("project_id", projectId)
      .neq("status", "brouillon")
      .order("created_at", { ascending: false }),
    supabase
      .from("portal_messages")
      .select("id, sender, sender_name, body, created_at")
      .eq("workspace_id", shareLink.workspace_id)
      .eq("project_id", projectId)
      .eq("share_token", token)
      .order("created_at", { ascending: true }),
    supabase
      .from("firm_profile")
      .select("firm_name, architect_name, logo_url, address, phone, email")
      .eq("workspace_id", shareLink.workspace_id)
      .single(),
  ]);

  const contractIds = (contracts ?? []).map((c) => c.id);
  const { data: signatures } = contractIds.length > 0
    ? await supabase.from("signatures").select("id, contract_id, signer_name, signed_at").in("contract_id", contractIds)
    : { data: [] };

  if (!project) notFound();

  const signatureByContract: Record<string, { signer_name: string; signed_at: string }> = {};
  for (const sig of signatures ?? []) {
    signatureByContract[sig.contract_id] = { signer_name: sig.signer_name, signed_at: sig.signed_at };
  }

  const currentPhaseIndex = PHASES.findIndex((p) => p.key === project.phase);

  // Group files by folder
  const filesByFolder: Record<string, typeof files> = {};
  for (const file of files ?? []) {
    if (!filesByFolder[file.folder]) filesByFolder[file.folder] = [];
    filesByFolder[file.folder]!.push(file);
  }

  // Generate signed URLs for files that were intentionally exposed to the client portal.
  const fileUrls: Record<string, string> = {};
  const portalFiles = files ?? [];
  if (portalFiles.length > 0) {
    const signedUrls = await Promise.all(
      portalFiles.map((file) =>
        supabase.storage.from(STORAGE_BUCKET).createSignedUrl(file.storage_path, 3600)
      )
    );
    portalFiles.forEach((file, index) => {
      const signedUrl = signedUrls[index]?.data?.signedUrl;
      if (signedUrl) fileUrls[file.id] = signedUrl;
    });
  }

  return (
    <div className="client-portal-shell min-h-screen">
      {/* Header / Firm branding */}
      <header className="sticky top-0 z-10 border-b border-[#E8E6DF]/90 bg-white/84 shadow-[0_10px_32px_rgba(22,23,14,0.06)] backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {firmProfile?.logo_url ? (
              <Image
                src={firmProfile.logo_url}
                alt={firmProfile.firm_name ?? "Logo"}
                width={40}
                height={40}
                className="rounded-xl object-contain ring-1 ring-[#E8E6DF]"
              />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#16170E] via-[#2A45F0] to-[#2F8F5C] flex items-center justify-center shadow-[0_12px_28px_rgba(42,69,240,0.22)]">
                <Building2 className="h-5 w-5 text-white" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold leading-tight">
                {firmProfile?.firm_name ?? "Cabinet d'architecture"}
              </p>
              {firmProfile?.architect_name && (
                <p className="text-xs text-gray-500">{firmProfile.architect_name}</p>
              )}
            </div>
          </div>
          <span className="rounded-full border border-[#E8E6DF] bg-[#F7F7F4]/90 px-2.5 py-1 text-[11px] font-semibold text-[#6B6B5A]">
            Espace client
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Project title */}
        <div className="client-portal-card relative overflow-hidden rounded-3xl p-5 sm:p-6">
          <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full border border-[#2A45F0]/15 bg-[#E7F0FF]/50" />
          <div className="relative">
            <p className="eyebrow mb-1">Votre projet</p>
            <h1 className="page-title text-3xl text-[#16170E]">{project.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-[#6B6B5A]">
              {TYPE_LABELS[project.type] ?? project.type}
              {project.address && ` · ${project.address}`}
            </p>
          </div>
        </div>

        {/* Phase progress */}
        <div className="client-portal-card rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
            Avancement du projet
          </p>
          <div className="space-y-2">
            {PHASES.map((phase, idx) => {
              const done = idx < currentPhaseIndex;
              const current = idx === currentPhaseIndex;
              return (
                <div key={phase.key} className="flex items-center gap-3">
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  ) : current ? (
                    <div className="h-5 w-5 rounded-full border-2 border-blue-500 bg-blue-50 shrink-0 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                    </div>
                  ) : (
                    <Circle className="h-5 w-5 text-gray-200 shrink-0" />
                  )}
                  <span
                    className={`text-sm ${
                      current
                        ? "font-semibold text-blue-600"
                        : done
                        ? "text-gray-400 line-through"
                        : "text-gray-400"
                    }`}
                  >
                    {phase.label}
                    {current && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-normal">
                        En cours
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Key info */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {project.surface_m2 && (
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <Ruler className="h-4 w-4 text-gray-400 mb-2" />
              <p className="text-xs text-gray-400">Surface</p>
              <p className="text-sm font-semibold">{project.surface_m2} m²</p>
            </div>
          )}
          {project.start_date && (
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <Calendar className="h-4 w-4 text-gray-400 mb-2" />
              <p className="text-xs text-gray-400">Début</p>
              <p className="text-sm font-semibold">{formatDate(project.start_date)}</p>
            </div>
          )}
          {project.target_end_date && (
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <Calendar className="h-4 w-4 text-gray-400 mb-2" />
              <p className="text-xs text-gray-400">Fin prévue</p>
              <p className="text-sm font-semibold">{formatDate(project.target_end_date)}</p>
            </div>
          )}
          {project.fees_centimes && (
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <p className="text-xs text-gray-400 mb-2">Honoraires</p>
              <p className="text-sm font-semibold">{formatMAD(project.fees_centimes)}</p>
            </div>
          )}
        </div>

        {/* Contracts */}
        {contracts && contracts.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b">
              <p className="text-sm font-semibold">Contrats</p>
            </div>
            <div className="divide-y">
              {contracts.map((contract) => {
                const sig = signatureByContract[contract.id];
                return (
                  <div key={contract.id} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{contract.title}</p>
                          <p className="text-xs text-gray-400">
                            {CONTRACT_TYPE_LABELS[contract.type] ?? contract.type} · {formatDate(contract.created_at)}
                          </p>
                        </div>
                      </div>
                      {sig ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Signé
                        </span>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${contract.status === "finalise" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                          {contract.status === "finalise" ? "Finalisé" : "Brouillon"}
                        </span>
                      )}
                    </div>

                    {sig ? (
                      <div className="mt-2 p-2 bg-emerald-50 rounded-lg flex items-center gap-2 text-xs text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        Signé par {sig.signer_name} le {formatDate(sig.signed_at)}
                      </div>
                    ) : contract.status === "finalise" ? (
                      <div className="mt-3">
                        <SignaturePadPortal
                          contractId={contract.id}
                          contractTitle={contract.title}
                          portalToken={token}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Devis */}
        {devisList && devisList.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b">
              <p className="text-sm font-semibold">Devis</p>
              <p className="text-xs text-gray-400 mt-0.5">Validez ou refusez les propositions envoyées par le cabinet.</p>
            </div>
            <div className="divide-y">
              {devisList.map((devis) => (
                <div key={devis.id} className="px-5 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <Receipt className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{devis.title}</p>
                        <p className="text-xs text-gray-400">
                          {devis.number} · {formatMAD(devis.total_centimes)}
                          {devis.valid_until && ` · valable jusqu'au ${formatDate(devis.valid_until)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        devis.status === "accepte"
                          ? "bg-emerald-100 text-emerald-700"
                          : devis.status === "refuse"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      }`}>
                        {DEVIS_STATUS_LABELS[devis.status] ?? devis.status}
                      </span>
                      {devis.status === "envoye" && (
                        <PortalDevisResponse token={token} devisId={devis.id} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Factures */}
        {facturesList && facturesList.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b">
              <p className="text-sm font-semibold">Factures</p>
              <p className="text-xs text-gray-400 mt-0.5">Suivi des montants à régler et paiements reçus.</p>
            </div>
            <div className="divide-y">
              {facturesList.map((facture) => {
                const overdue = facture.status === "envoyee" && facture.due_date && new Date(facture.due_date) < new Date();
                return (
                  <div key={facture.id} className="px-5 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <Receipt className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{facture.title}</p>
                        <p className="text-xs text-gray-400">
                          {facture.number} · {formatMAD(facture.total_centimes)}
                          {facture.due_date && ` · échéance ${formatDate(facture.due_date)}`}
                        </p>
                        {facture.paid_at && (
                          <p className="text-xs text-emerald-600 mt-1">Paiement reçu le {formatDate(facture.paid_at)}</p>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium self-start sm:self-center ${
                      facture.status === "payee"
                        ? "bg-emerald-100 text-emerald-700"
                        : overdue
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                    }`}>
                      {overdue ? "En retard" : FACTURE_STATUS_LABELS[facture.status] ?? facture.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Files */}
        {Object.keys(filesByFolder).length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b">
              <p className="text-sm font-semibold">Documents & Fichiers</p>
              <p className="text-xs text-gray-400 mt-0.5">Cliquez sur un fichier pour le télécharger</p>
            </div>
            {Object.entries(filesByFolder).map(([folder, folderFiles]) => (
              <div key={folder}>
                <div className="px-5 py-2 bg-gray-50 border-b">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{folder}</p>
                </div>
                <div className="divide-y">
                  {(folderFiles ?? []).map((file) => (
                    <div key={file.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                      <a
                        href={fileUrls[file.id] ?? "#"}
                        download={file.filename}
                        className="flex items-center gap-3 group"
                      >
                        <FileIcon mimeType={file.mime_type} />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium truncate">{file.filename}</p>
                            <ApprovalBadge status={file.approval_status ?? "not_required"} />
                          </div>
                          <p className="text-xs text-gray-400">
                            {formatFileSize(file.size_bytes)} · v{file.version}
                          </p>
                        </div>
                        <Download className="h-4 w-4 text-gray-300 group-hover:text-gray-600 transition-colors shrink-0" />
                      </a>
                      {file.approval_status === "pending" && (
                        <PortalFileApproval token={token} fileId={file.id} />
                      )}
                      {file.approval_note && file.approval_status !== "pending" && (
                        <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                          Commentaire: {file.approval_note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty files state */}
        {Object.keys(filesByFolder).length === 0 && (
          <div className="bg-white rounded-xl border p-8 text-center shadow-sm">
            <File className="h-8 w-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Aucun document partagé pour l'instant.</p>
          </div>
        )}

        {/* Client upload */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <Upload className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm font-semibold">Envoyer un document</p>
              <p className="text-xs text-gray-400 mt-0.5">Déposez un justificatif, une photo ou un document demandé.</p>
            </div>
          </div>
          <div className="p-5">
            <PortalDocumentUpload token={token} />
          </div>
        </div>

        {/* Messages */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm font-semibold">Discussion</p>
              <p className="text-xs text-gray-400 mt-0.5">Laissez un message lié à ce projet.</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {(messages ?? []).length > 0 ? (
              <div className="space-y-3">
                {(messages ?? []).map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-xl px-3 py-2.5 ${
                      message.sender === "client"
                        ? "bg-blue-50 border border-blue-100"
                        : "bg-gray-50 border border-gray-100"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <p className="text-xs font-semibold text-gray-700">
                        {message.sender === "client" ? (message.sender_name || "Client") : "Cabinet"}
                      </p>
                      <p className="text-[11px] text-gray-400">{formatDate(message.created_at)}</p>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{message.body}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Aucun message pour l'instant.</p>
            )}
            <PortalMessageForm token={token} />
          </div>
        </div>

        {/* Contact */}
        {(firmProfile?.phone || firmProfile?.email) && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-600 mb-2">Contacter votre architecte</p>
            <div className="flex flex-wrap gap-4">
              {firmProfile.phone && (
                <a href={`tel:${firmProfile.phone}`} className="text-sm text-blue-700 hover:underline font-medium">
                  📞 {firmProfile.phone}
                </a>
              )}
              {firmProfile.email && (
                <a href={`mailto:${firmProfile.email}`} className="text-sm text-blue-700 hover:underline font-medium">
                  ✉️ {firmProfile.email}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-300 pb-4">
          Espace client sécurisé · Propulsé par ArchiDesk
        </p>
      </main>
    </div>
  );
}

function ApprovalBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    not_required: { label: "Info", className: "bg-gray-100 text-gray-500" },
    pending: { label: "À approuver", className: "bg-amber-100 text-amber-700" },
    approved: { label: "Approuvé", className: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "Correction demandée", className: "bg-red-100 text-red-700" },
  };
  const item = config[status] ?? config.not_required!;
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.className}`}>{item.label}</span>;
}
