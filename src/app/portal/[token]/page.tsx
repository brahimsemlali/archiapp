import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatDate, formatMAD, formatFileSize } from "@/lib/format";
import { Download, FileText, FileImage, File, Building2, MapPin, Ruler, Calendar, CheckCircle2, Circle, Clock } from "lucide-react";
import Image from "next/image";

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
    { data: firmProfile },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("*, clients(name, phone, email)")
      .eq("id", projectId)
      .single(),
    supabase
      .from("files")
      .select("id, filename, folder, size_bytes, mime_type, storage_path, version, created_at")
      .eq("project_id", projectId)
      .is("parent_file_id", null)
      .order("folder")
      .order("created_at", { ascending: false }),
    supabase
      .from("contracts")
      .select("id, title, type, status, version, created_at")
      .eq("project_id", projectId)
      .neq("status", "archive")
      .order("created_at", { ascending: false }),
    supabase
      .from("firm_profile")
      .select("firm_name, architect_name, logo_url, address, phone, email")
      .eq("workspace_id", shareLink.workspace_id)
      .single(),
  ]);

  if (!project) notFound();

  const currentPhaseIndex = PHASES.findIndex((p) => p.key === project.phase);

  // Group files by folder
  const filesByFolder: Record<string, typeof files> = {};
  for (const file of files ?? []) {
    if (!filesByFolder[file.folder]) filesByFolder[file.folder] = [];
    filesByFolder[file.folder]!.push(file);
  }

  // Generate signed URLs for files
  const fileUrls: Record<string, string> = {};
  for (const file of files ?? []) {
    const { data } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(file.storage_path, 3600);
    if (data?.signedUrl) fileUrls[file.id] = data.signedUrl;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header / Firm branding */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {firmProfile?.logo_url ? (
              <Image
                src={firmProfile.logo_url}
                alt={firmProfile.firm_name ?? "Logo"}
                width={36}
                height={36}
                className="rounded object-contain"
              />
            ) : (
              <div className="h-9 w-9 rounded bg-gray-900 flex items-center justify-center">
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
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            Espace client
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Project title */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Votre projet</p>
          <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {TYPE_LABELS[project.type] ?? project.type}
            {project.address && ` · ${project.address}`}
          </p>
        </div>

        {/* Phase progress */}
        <div className="bg-white rounded-xl border p-5 shadow-sm">
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
              {contracts.map((contract) => (
                <div key={contract.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{contract.title}</p>
                      <p className="text-xs text-gray-400">
                        {CONTRACT_TYPE_LABELS[contract.type] ?? contract.type} · {formatDate(contract.created_at)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      contract.status === "finalise"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {contract.status === "finalise" ? "Finalisé" : "Brouillon"}
                  </span>
                </div>
              ))}
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
                    <a
                      key={file.id}
                      href={fileUrls[file.id] ?? "#"}
                      download={file.filename}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group"
                    >
                      <FileIcon mimeType={file.mime_type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.filename}</p>
                        <p className="text-xs text-gray-400">
                          {formatFileSize(file.size_bytes)} · v{file.version}
                        </p>
                      </div>
                      <Download className="h-4 w-4 text-gray-300 group-hover:text-gray-600 transition-colors shrink-0" />
                    </a>
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
