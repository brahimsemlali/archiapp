import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { requireWorkspaceAccountActive } from "@/lib/workspace";
import Image from "next/image";
import { formatDate, formatMAD } from "@/lib/format";
import {
  Building2, Calendar, CheckCircle2, Circle, Clock, FileText,
  MessageCircle, Receipt, Ruler, Image as ImageIcon, Activity,
  Hammer, Download, PenLine, FolderOpen, UserPlus, Briefcase,
  AlertCircle,
} from "lucide-react";
import { SignaturePadPortal } from "@/components/contracts/signature-pad-portal";
import { ClientPortalDevisResponse, ClientPortalMessageForm, ClientPortalFileApproval, PortalMeetingPvSign } from "@/components/portal/client-portal-actions";

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

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  mission_complete: "Mission complète", mission_partielle: "Mission partielle",
  etude_faisabilite: "Étude de faisabilité", suivi_chantier: "Suivi de chantier", autre: "Autre",
};

const DEVIS_STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon", envoye: "En attente", accepte: "Accepté", refuse: "Refusé", expire: "Expiré",
};

const FACTURE_STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon", envoyee: "À régler", payee: "Payée", annulee: "Annulée",
};

const TYPE_LABELS: Record<string, string> = {
  villa: "Villa", appartement: "Appartement", immeuble: "Immeuble",
  commercial: "Commercial", renovation: "Rénovation", amenagement: "Aménagement", autre: "Autre",
};

type ActivityEntry = { id: string; action: string; metadata: unknown; created_at: string };

function activityIcon(action: string) {
  if (action.startsWith("contract")) return { icon: FileText, color: "text-blue-500 bg-blue-50" };
  if (action.startsWith("signature")) return { icon: PenLine, color: "text-purple-500 bg-purple-50" };
  if (action.startsWith("devis")) return { icon: Receipt, color: "text-amber-500 bg-amber-50" };
  if (action.startsWith("facture")) return { icon: Receipt, color: "text-green-500 bg-green-50" };
  if (action.startsWith("file")) return { icon: FolderOpen, color: "text-gray-500 bg-gray-50" };
  if (action.startsWith("portal.message")) return { icon: MessageCircle, color: "text-blue-400 bg-blue-50" };
  if (action.startsWith("project")) return { icon: Briefcase, color: "text-indigo-500 bg-indigo-50" };
  if (action.startsWith("client")) return { icon: UserPlus, color: "text-teal-500 bg-teal-50" };
  if (action.startsWith("site_visit") || action.startsWith("visite")) return { icon: Hammer, color: "text-orange-500 bg-orange-50" };
  return { icon: Activity, color: "text-gray-400 bg-gray-50" };
}

const ACTIVITY_LABELS: Record<string, string> = {
  "client.created": "Dossier client ouvert",
  "project.created": "Projet créé",
  "contract.generated": "Contrat généré",
  "file.uploaded": "Fichier déposé",
  "devis.created": "Devis émis",
  "devis.sent": "Devis envoyé",
  "facture.created": "Facture émise",
  "facture.paid": "Facture encaissée",
  "devis.portal_response_attempt": "Réponse au devis",
  "signature.portal_created": "Contrat signé",
  "portal.message_created": "Message envoyé",
  "site_visit.created": "Visite chantier",
};

function activityLabel(action: string, metadata: Record<string, unknown>): string {
  const base = ACTIVITY_LABELS[action] ?? action;
  const name = (metadata.name ?? metadata.title ?? metadata.filename ?? metadata.number) as string | undefined;
  return name ? `${base} — ${name}` : base;
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
    .eq("resource_type", "client")
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

  await supabase
    .from("share_links")
    .update({ accessed_count: shareLink.accessed_count + 1, last_accessed_at: new Date().toISOString() })
    .eq("id", shareLink.id);

  const clientId = shareLink.resource_id;
  const workspaceId = shareLink.workspace_id;

  const [
    { data: client },
    { data: projects },
    { data: contracts },
    { data: devisList },
    { data: facturesList },
    { data: moodboards },
    { data: activityLog },
    { data: firmProfile },
    { data: messages },
  ] = await Promise.all([
    supabase.from("clients").select("name, type, phone, email").eq("id", clientId).eq("workspace_id", workspaceId).single(),
    supabase.from("projects").select("id, title, phase, address, surface_m2, start_date, target_end_date, type, fees_centimes").eq("workspace_id", workspaceId).eq("client_id", clientId).is("archived_at", null).order("created_at", { ascending: false }),
    supabase.from("contracts").select("id, title, type, status, version, created_at").eq("workspace_id", workspaceId).eq("client_id", clientId).eq("status", "finalise").order("created_at", { ascending: false }),
    supabase.from("devis").select("id, number, title, status, total_centimes, valid_until, created_at").eq("workspace_id", workspaceId).eq("client_id", clientId).neq("status", "brouillon").order("created_at", { ascending: false }),
    supabase.from("factures").select("id, number, title, status, total_centimes, due_date, paid_at, created_at").eq("workspace_id", workspaceId).eq("client_id", clientId).neq("status", "brouillon").order("created_at", { ascending: false }),
    supabase.from("moodboards").select("id, title, description, items, created_at").eq("workspace_id", workspaceId).eq("client_id", clientId).order("created_at", { ascending: false }),
    supabase.from("activity_log").select("id, action, metadata, created_at").eq("workspace_id", workspaceId).eq("client_id", clientId).order("created_at", { ascending: false }).limit(40),
    supabase.from("firm_profile").select("firm_name, architect_name, logo_url, address, phone, email, iban").eq("workspace_id", workspaceId).single(),
    supabase.from("portal_messages").select("id, sender, sender_name, body, created_at").eq("workspace_id", workspaceId).eq("client_id", clientId).eq("share_token", token).order("created_at", { ascending: true }),
  ]);

  if (!client) notFound();

  const projectIds = (projects ?? []).map((p) => p.id);

  const [{ data: siteVisits }, { data: meetingNotes }, { data: sharedFiles }] = await Promise.all([
    projectIds.length > 0
      ? supabase.from("site_visits").select("id, title, visit_date, weather, attendees, summary, observations, project_id").eq("workspace_id", workspaceId).in("project_id", projectIds).not("summary", "is", null).order("visit_date", { ascending: false })
      : { data: [] as { id: string; title: string; visit_date: string; weather: string | null; attendees: string[] | null; summary: string | null; observations: unknown; project_id: string }[] },
    projectIds.length > 0
      ? supabase.from("meeting_notes").select("id, title, meeting_date, meeting_type, attendees, summary, decisions, project_id, pv_signed_at, pv_signer_name").eq("workspace_id", workspaceId).in("project_id", projectIds).order("meeting_date", { ascending: false })
      : { data: [] as { id: string; title: string; meeting_date: string; meeting_type: string | null; attendees: unknown; summary: string | null; decisions: unknown[]; project_id: string; pv_signed_at: string | null; pv_signer_name: string | null }[] },
    projectIds.length > 0
      ? supabase.from("files").select("id, filename, folder, size_bytes, mime_type, storage_path, approval_status, approved_at, approval_note, project_id, created_at").eq("workspace_id", workspaceId).in("project_id", projectIds).in("approval_status", ["pending", "approved"]).order("created_at", { ascending: false })
      : { data: [] as { id: string; filename: string; folder: string; size_bytes: number | null; mime_type: string | null; storage_path: string; approval_status: string; approved_at: string | null; approval_note: string | null; project_id: string; created_at: string }[] },
  ]);

  // Generate signed download URLs for shared files
  type FileWithUrl = { id: string; filename: string; folder: string; size_bytes: number | null; mime_type: string | null; approval_status: string; approved_at: string | null; approval_note: string | null; project_id: string; created_at: string; downloadUrl: string | null };
  const filesWithUrls: FileWithUrl[] = await Promise.all(
    (sharedFiles ?? []).map(async (file) => {
      const { data } = await supabase.storage.from("project-files").createSignedUrl(file.storage_path, 3600);
      return { ...file, downloadUrl: data?.signedUrl ?? null };
    })
  );

  // Generate signed URLs for site visit observation photos
  type ObsWithUrl = { zone?: string; description: string; photoUrl?: string; signedPhotoUrl?: string };
  const visitsWithPhotos = await Promise.all(
    (siteVisits ?? []).map(async (visit) => {
      const obs = Array.isArray(visit.observations) ? (visit.observations as ObsWithUrl[]) : [];
      const photosWithUrls = await Promise.all(
        obs.map(async (o) => {
          if (!o.photoUrl) return { ...o, signedPhotoUrl: undefined };
          if (o.photoUrl.startsWith("http")) return { ...o, signedPhotoUrl: o.photoUrl };
          const { data } = await supabase.storage.from("project-files").createSignedUrl(o.photoUrl, 3600);
          return { ...o, signedPhotoUrl: data?.signedUrl ?? undefined };
        })
      );
      return { ...visit, photosWithUrls };
    })
  );

  const contractIds = (contracts ?? []).map((c) => c.id);
  const { data: signatures } = contractIds.length > 0
    ? await supabase.from("signatures").select("id, contract_id, signer_name, signed_at").in("contract_id", contractIds)
    : { data: [] };

  const signatureByContract: Record<string, { signer_name: string; signed_at: string }> = {};
  for (const sig of signatures ?? []) {
    signatureByContract[sig.contract_id] = { signer_name: sig.signer_name, signed_at: sig.signed_at };
  }

  const projectById = Object.fromEntries((projects ?? []).map((p) => [p.id, p]));

  const totalFees = (projects ?? []).reduce((s, p) => s + (p.fees_centimes ?? 0), 0);
  const totalPaid = (facturesList ?? []).filter((f) => f.status === "payee").reduce((s, f) => s + f.total_centimes, 0);
  const totalPending = (facturesList ?? []).filter((f) => f.status === "envoyee").reduce((s, f) => s + f.total_centimes, 0);
  const totalRemaining = Math.max(0, totalFees - totalPaid);

  // Action required items
  const pendingDevis = (devisList ?? []).filter((d) => d.status === "envoye");
  const unsignedContracts = (contracts ?? []).filter((c) => !signatureByContract[c.id]);
  const overdueFactures = (facturesList ?? []).filter((f) => f.status === "envoyee" && f.due_date && new Date(f.due_date) < new Date());
  const pendingFiles = filesWithUrls.filter((f) => f.approval_status === "pending");
  const unsignedPvs = (meetingNotes ?? []).filter((m) => !m.pv_signed_at);
  const actionCount = pendingDevis.length + unsignedContracts.length + overdueFactures.length + pendingFiles.length + unsignedPvs.length;

  const navItems = [
    { id: "projets", label: "Projets", show: (projects ?? []).length > 0 },
    { id: "contrats", label: "Contrats", show: (contracts ?? []).length > 0 },
    { id: "devis", label: "Devis", show: (devisList ?? []).length > 0 },
    { id: "factures", label: "Factures", show: (facturesList ?? []).length > 0 },
    { id: "fichiers", label: "Fichiers", show: filesWithUrls.length > 0 },
    { id: "chantier", label: "Comptes-rendus", show: (siteVisits ?? []).length > 0 || (meetingNotes ?? []).length > 0 },
    { id: "inspirations", label: "Inspirations", show: (moodboards ?? []).length > 0 },
    { id: "historique", label: "Historique", show: (activityLog ?? []).length > 0 },
    { id: "discussion", label: "Discussion", show: true },
  ].filter((n) => n.show);

  return (
    <div className="client-portal-shell min-h-screen">
      {/* Firm header */}
      <header className="sticky top-0 z-20 border-b border-[#E8E6DF]/90 bg-white/84 shadow-[0_10px_32px_rgba(22,23,14,0.06)] backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {firmProfile?.logo_url ? (
              <Image src={firmProfile.logo_url} alt={firmProfile.firm_name ?? "Logo"} width={40} height={40} className="rounded-xl object-contain ring-1 ring-[#E8E6DF]" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#16170E] via-[#2A45F0] to-[#2F8F5C] flex items-center justify-center shrink-0 shadow-[0_12px_28px_rgba(42,69,240,0.22)]">
                <Building2 className="h-4 w-4 text-white" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold leading-tight text-gray-900">{firmProfile?.firm_name ?? "Cabinet d'architecture"}</p>
              {firmProfile?.architect_name && <p className="text-xs text-gray-400">{firmProfile.architect_name}</p>}
            </div>
          </div>
          <span className="rounded-full border border-[#E8E6DF] bg-[#F7F7F4]/90 px-2.5 py-1 text-[11px] font-semibold text-[#6B6B5A]">Espace client</span>
        </div>
      </header>

      {/* Section nav */}
      {navItems.length > 1 && (
        <nav className="sticky top-[65px] z-10 border-b border-[#E8E6DF]/80 bg-white/76 backdrop-blur-xl">
          <div className="max-w-3xl mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-[#6B6B5A] transition-colors hover:bg-[#F2F2EE] hover:text-[#16170E]"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </nav>
      )}

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Client hero */}
        <div className="client-portal-card relative overflow-hidden rounded-3xl p-5 sm:p-6">
          <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full border border-[#2A45F0]/15 bg-[#E7F0FF]/50" />
          <div className="relative">
            <p className="eyebrow mb-1">Votre dossier</p>
            <h1 className="page-title text-3xl text-[#16170E]">{client.name}</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#6B6B5A]">
              Avancement, documents, validations et échanges avec votre cabinet.
            </p>
          </div>
          {(totalFees > 0 || totalPaid > 0 || totalPending > 0) && (
            <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {totalFees > 0 && (
                <div className="rounded-2xl border border-[#E8E6DF] bg-white/78 px-3 py-2.5 shadow-sm">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Honoraires</p>
                  <p className="text-sm font-bold text-gray-800">{formatMAD(totalFees)}</p>
                </div>
              )}
              {totalPaid > 0 && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-3 py-2.5 shadow-sm">
                  <p className="text-[10px] text-emerald-600 uppercase tracking-wide mb-0.5">Réglé</p>
                  <p className="text-sm font-bold text-emerald-700">{formatMAD(totalPaid)}</p>
                </div>
              )}
              {totalPending > 0 && (
                <div className="rounded-2xl bg-amber-50 border border-amber-100 px-3 py-2.5 shadow-sm">
                  <p className="text-[10px] text-amber-600 uppercase tracking-wide mb-0.5">En attente</p>
                  <p className="text-sm font-bold text-amber-700">{formatMAD(totalPending)}</p>
                </div>
              )}
              {totalFees > 0 && totalRemaining > 0 && (
                <div className="rounded-2xl bg-blue-50 border border-blue-100 px-3 py-2.5 shadow-sm">
                  <p className="text-[10px] text-blue-600 uppercase tracking-wide mb-0.5">Solde restant</p>
                  <p className="text-sm font-bold text-blue-700">{formatMAD(totalRemaining)}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action required banner */}
        {actionCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-sm font-semibold text-amber-900">
                {actionCount} action{actionCount > 1 ? "s" : ""} en attente
              </p>
            </div>
            <ul className="space-y-1.5">
              {unsignedContracts.length > 0 && (
                <li className="flex items-center gap-2 text-sm text-amber-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                  <a href="#contrats" className="hover:underline font-medium">
                    {unsignedContracts.length} contrat{unsignedContracts.length > 1 ? "s" : ""} à signer
                  </a>
                </li>
              )}
              {pendingDevis.length > 0 && (
                <li className="flex items-center gap-2 text-sm text-amber-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                  <a href="#devis" className="hover:underline font-medium">
                    {pendingDevis.length} devis en attente de réponse
                  </a>
                </li>
              )}
              {overdueFactures.length > 0 && (
                <li className="flex items-center gap-2 text-sm text-red-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                  <a href="#factures" className="hover:underline font-medium">
                    {overdueFactures.length} facture{overdueFactures.length > 1 ? "s" : ""} en retard de paiement
                  </a>
                </li>
              )}
              {pendingFiles.length > 0 && (
                <li className="flex items-center gap-2 text-sm text-amber-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                  <a href="#fichiers" className="hover:underline font-medium">
                    {pendingFiles.length} document{pendingFiles.length > 1 ? "s" : ""} à approuver
                  </a>
                </li>
              )}
              {unsignedPvs.length > 0 && (
                <li className="flex items-center gap-2 text-sm text-amber-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                  <a href="#chantier" className="hover:underline font-medium">
                    {unsignedPvs.length} PV de réunion à signer
                  </a>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Projects */}
        {(projects ?? []).length > 0 && (
          <section id="projets">
            <SectionTitle icon={<Ruler className="h-4 w-4" />} title="Projets" count={(projects ?? []).length} />
            <div className="space-y-3 mt-3">
              {(projects ?? []).map((project) => {
                const currentPhaseIndex = PHASES.findIndex((p) => p.key === project.phase);
                return (
                  <div key={project.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                      <div>
                        <p className="font-semibold text-gray-900">{project.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {TYPE_LABELS[project.type] ?? project.type}
                          {project.address && ` · ${project.address}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                        {project.surface_m2 && <span className="bg-gray-50 px-2 py-0.5 rounded">{project.surface_m2} m²</span>}
                        {project.start_date && <span className="bg-gray-50 px-2 py-0.5 rounded flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(project.start_date)}</span>}
                        {project.fees_centimes && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">{formatMAD(project.fees_centimes)}</span>}
                      </div>
                    </div>
                    {/* Horizontal phase stepper */}
                    <div className="relative">
                      <div className="flex items-center">
                        {PHASES.map((phase, idx) => {
                          const done = idx < currentPhaseIndex;
                          const current = idx === currentPhaseIndex;
                          const last = idx === PHASES.length - 1;
                          return (
                            <div key={phase.key} className="flex items-center flex-1 min-w-0">
                              <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                                <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-emerald-500" : current ? "bg-blue-500 ring-2 ring-blue-200" : "bg-gray-100"}`}>
                                  {done ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                                  ) : current ? (
                                    <div className="h-2 w-2 rounded-full bg-white" />
                                  ) : (
                                    <Circle className="h-3.5 w-3.5 text-gray-300" />
                                  )}
                                </div>
                                <span className={`text-[9px] font-medium text-center leading-tight px-0.5 truncate w-full text-center ${current ? "text-blue-600" : done ? "text-emerald-600" : "text-gray-300"}`}>
                                  {phase.label}
                                </span>
                              </div>
                              {!last && (
                                <div className={`h-0.5 flex-1 mx-1 mb-4 ${done ? "bg-emerald-300" : "bg-gray-100"}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Contracts */}
        {(contracts ?? []).length > 0 && (
          <section id="contrats">
            <SectionTitle icon={<FileText className="h-4 w-4" />} title="Contrats" count={(contracts ?? []).length} />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-3">
              <div className="divide-y divide-gray-50">
                {(contracts ?? []).map((contract) => {
                  const sig = signatureByContract[contract.id];
                  return (
                    <div key={contract.id} className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{contract.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {CONTRACT_TYPE_LABELS[contract.type] ?? contract.type} · {formatDate(contract.created_at)}
                          </p>
                        </div>
                        {sig ? (
                          <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Signé
                          </span>
                        ) : (
                          <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-medium bg-blue-100 text-blue-700">Finalisé</span>
                        )}
                      </div>
                      {sig ? (
                        <div className="p-3 bg-emerald-50 rounded-xl flex items-center gap-2 text-xs text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          Signé par <strong>{sig.signer_name}</strong> le {formatDate(sig.signed_at)}
                        </div>
                      ) : (
                        <div className="mt-2">
                          <SignaturePadPortal contractId={contract.id} contractTitle={contract.title} portalToken={token} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Devis */}
        {(devisList ?? []).length > 0 && (
          <section id="devis">
            <SectionTitle icon={<Receipt className="h-4 w-4" />} title="Devis" count={(devisList ?? []).length} />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-3">
              <div className="divide-y divide-gray-50">
                {(devisList ?? []).map((devis) => (
                  <div key={devis.id} className="p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{devis.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {devis.number} · <strong>{formatMAD(devis.total_centimes)}</strong>
                          {devis.valid_until && ` · valable jusqu'au ${formatDate(devis.valid_until)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={`/api/portal/client/${token}/devis/${devis.id}/pdf`}
                          target="_blank"
                          className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 px-2 py-1 rounded border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          <Download className="h-3 w-3" /> PDF
                        </a>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          devis.status === "accepte" ? "bg-emerald-100 text-emerald-700"
                            : devis.status === "refuse" ? "bg-red-100 text-red-700"
                            : devis.status === "expire" ? "bg-gray-100 text-gray-400"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {DEVIS_STATUS_LABELS[devis.status] ?? devis.status}
                        </span>
                      </div>
                    </div>
                    {devis.status === "envoye" && (
                      <div className="mt-3">
                        <ClientPortalDevisResponse token={token} devisId={devis.id} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Factures */}
        {(facturesList ?? []).length > 0 && (
          <section id="factures">
            <SectionTitle icon={<Receipt className="h-4 w-4" />} title="Factures" count={(facturesList ?? []).length} />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-3">
              <div className="divide-y divide-gray-50">
                {(facturesList ?? []).map((facture) => {
                  const overdue = facture.status === "envoyee" && facture.due_date && new Date(facture.due_date) < new Date();
                  return (
                    <div key={facture.id} className="p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{facture.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {facture.number} · <strong>{formatMAD(facture.total_centimes)}</strong>
                            {facture.due_date && ` · échéance ${formatDate(facture.due_date)}`}
                          </p>
                          {facture.paid_at && <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Paiement reçu le {formatDate(facture.paid_at)}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={`/api/portal/client/${token}/factures/${facture.id}/pdf`}
                            target="_blank"
                            className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 px-2 py-1 rounded border border-gray-200 hover:border-gray-300 transition-colors"
                          >
                            <Download className="h-3 w-3" /> PDF
                          </a>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            facture.status === "payee" ? "bg-emerald-100 text-emerald-700"
                              : overdue ? "bg-red-100 text-red-700"
                              : facture.status === "annulee" ? "bg-gray-100 text-gray-400"
                              : "bg-blue-100 text-blue-700"
                          }`}>
                            {overdue ? "En retard" : FACTURE_STATUS_LABELS[facture.status] ?? facture.status}
                          </span>
                        </div>
                      </div>
                      {(facture.status === "envoyee" || overdue) && firmProfile?.iban && (
                        <div className="mt-3 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
                          <p className="text-xs font-semibold text-blue-800 mb-1">Coordonnées de paiement</p>
                          <p className="text-xs text-blue-700 font-mono break-all">{firmProfile.iban}</p>
                          <p className="text-xs text-blue-600 mt-1">Référence : {facture.number}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Shared files */}
        {filesWithUrls.length > 0 && (
          <section id="fichiers">
            <SectionTitle icon={<FolderOpen className="h-4 w-4" />} title="Documents partagés" count={filesWithUrls.length} />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-3">
              <div className="divide-y divide-gray-50">
                {filesWithUrls.map((file) => (
                  <div key={file.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.filename}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {file.folder}
                          {projectById[file.project_id] && ` · ${projectById[file.project_id]!.title}`}
                          {file.size_bytes && ` · ${(file.size_bytes / 1024 / 1024).toFixed(1)} Mo`}
                        </p>
                        {file.approval_status === "approved" && file.approved_at && (
                          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 shrink-0" /> Approuvé le {formatDate(file.approved_at)}
                          </p>
                        )}
                        {file.approval_status === "approved" && file.approval_note && (
                          <p className="text-xs text-gray-500 mt-0.5 italic">{file.approval_note}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {file.approval_status === "approved" && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">
                            Approuvé
                          </span>
                        )}
                        {file.approval_status === "pending" && (
                          <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">
                            À approuver
                          </span>
                        )}
                        {file.downloadUrl && (
                          <a
                            href={file.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 px-2 py-1 rounded border border-gray-200 hover:border-gray-300 transition-colors"
                          >
                            <Download className="h-3 w-3" /> Télécharger
                          </a>
                        )}
                      </div>
                    </div>
                    {file.approval_status === "pending" && (
                      <ClientPortalFileApproval token={token} fileId={file.id} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Site visits + Meeting notes */}
        {((siteVisits ?? []).length > 0 || (meetingNotes ?? []).length > 0) && (
          <section id="chantier">
            <SectionTitle icon={<Hammer className="h-4 w-4" />} title="Comptes-rendus & Visites" />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-3">
              <div className="divide-y divide-gray-50">
                {(meetingNotes ?? []).map((note) => (
                  <div key={note.id} className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{note.title}</p>
                        <p className="text-xs text-gray-400">
                          Réunion · {formatDate(note.meeting_date)}
                          {projectById[note.project_id] && ` · ${projectById[note.project_id]!.title}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {note.pv_signed_at ? (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />PV signé
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">En attente</span>
                        )}
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">Réunion</span>
                      </div>
                    </div>
                    {note.summary && <p className="text-sm text-gray-600 leading-relaxed">{note.summary}</p>}
                    {Array.isArray(note.decisions) && note.decisions.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Décisions</p>
                        {note.decisions.filter((d): d is string => typeof d === "string").map((d, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            {d}
                          </div>
                        ))}
                      </div>
                    )}
                    {note.pv_signed_at && note.pv_signer_name && (
                      <p className="mt-3 text-xs text-gray-400">
                        Signé par <strong className="text-gray-600">{note.pv_signer_name}</strong> le {formatDate(note.pv_signed_at)}
                      </p>
                    )}
                    {!note.pv_signed_at && (
                      <div className="mt-3">
                        <PortalMeetingPvSign meetingId={note.id} meetingTitle={note.title} portalToken={token} />
                      </div>
                    )}
                  </div>
                ))}
                {visitsWithPhotos.map((visit) => {
                  const visitPhotos = visit.photosWithUrls.filter((o) => o.signedPhotoUrl);
                  return (
                    <div key={visit.id} className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{visit.title}</p>
                          <p className="text-xs text-gray-400">
                            Visite chantier · {formatDate(visit.visit_date)}
                            {visit.weather && ` · ${visit.weather}`}
                            {projectById[visit.project_id] && ` · ${projectById[visit.project_id]!.title}`}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">Chantier</span>
                      </div>
                      {visit.summary && <p className="text-sm text-gray-600 leading-relaxed">{visit.summary}</p>}
                      {visit.attendees && visit.attendees.length > 0 && (
                        <p className="mt-2 text-xs text-gray-400">Présents : {visit.attendees.join(", ")}</p>
                      )}
                      {visitPhotos.length > 0 && (
                        <div className="mt-3 grid grid-cols-3 gap-1.5">
                          {visitPhotos.map((o, i) => (
                            <a key={i} href={o.signedPhotoUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg overflow-hidden bg-gray-100 aspect-square block">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={o.signedPhotoUrl} alt={o.zone ?? o.description ?? ""} className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Moodboards */}
        {(moodboards ?? []).length > 0 && (
          <section id="inspirations">
            <SectionTitle icon={<ImageIcon className="h-4 w-4" />} title="Inspiration" />
            <div className="space-y-3 mt-3">
              {(moodboards ?? []).map((board) => {
                const items = Array.isArray(board.items) ? board.items as { id: string; url: string; caption?: string }[] : [];
                return (
                  <div key={board.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <p className="text-sm font-semibold text-gray-900 mb-1">{board.title}</p>
                    {board.description && <p className="text-xs text-gray-400 mb-3">{board.description}</p>}
                    {items.length > 0 && (
                      <div className="columns-3 gap-2 space-y-2">
                        {items.map((item) => (
                          <div key={item.id} className="break-inside-avoid rounded-xl overflow-hidden bg-gray-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.url} alt={item.caption ?? ""} className="w-full object-cover block" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            {item.caption && <p className="text-xs text-gray-500 px-2 py-1 truncate">{item.caption}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Activity timeline */}
        {(activityLog ?? []).length > 0 && (
          <section id="historique">
            <SectionTitle icon={<Activity className="h-4 w-4" />} title="Historique de collaboration" />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-3">
              <ul className="space-y-4">
                {(activityLog as ActivityEntry[]).map((log, idx) => {
                  const { icon: Icon, color } = activityIcon(log.action);
                  const isLast = idx === (activityLog ?? []).length - 1;
                  return (
                    <li key={log.id} className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center ${color}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        {!isLast && <div className="absolute left-1/2 top-7 -translate-x-1/2 w-px h-4 bg-gray-100" />}
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-sm text-gray-700">
                          {activityLabel(log.action, log.metadata as Record<string, unknown>)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(log.created_at)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        )}

        {/* Discussion */}
        <section id="discussion">
          <SectionTitle icon={<MessageCircle className="h-4 w-4" />} title="Discussion" />
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-3">
            <div className="p-5 space-y-4">
              {(messages ?? []).length > 0 && (
                <div className="space-y-2">
                  {(messages ?? []).map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-xl px-4 py-3 ${
                        message.sender === "client"
                          ? "bg-blue-50 border border-blue-100"
                          : "bg-gray-50 border border-gray-100 ml-6"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <p className="text-xs font-semibold text-gray-700">
                          {message.sender === "client"
                            ? (message.sender_name ?? "Vous")
                            : (firmProfile?.architect_name ?? firmProfile?.firm_name ?? "Cabinet")}
                        </p>
                        <p className="text-[11px] text-gray-400">{formatDate(message.created_at)}</p>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{message.body}</p>
                    </div>
                  ))}
                </div>
              )}
              <ClientPortalMessageForm token={token} />
            </div>
          </div>
        </section>

        {/* Contact */}
        {(firmProfile?.phone || firmProfile?.email) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contacter votre architecte</p>
            <div className="flex flex-wrap gap-3">
              {firmProfile.phone && (
                <a href={`tel:${firmProfile.phone}`} className="text-sm text-blue-600 hover:underline font-medium">📞 {firmProfile.phone}</a>
              )}
              {firmProfile.email && (
                <a href={`mailto:${firmProfile.email}`} className="text-sm text-blue-600 hover:underline font-medium">✉️ {firmProfile.email}</a>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-300 pb-4">
          Espace client sécurisé · Propulsé par ArchiDesk
        </p>
      </main>
    </div>
  );
}

function SectionTitle({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400">{icon}</span>
      <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      {count !== undefined && count > 1 && (
        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{count}</span>
      )}
    </div>
  );
}
