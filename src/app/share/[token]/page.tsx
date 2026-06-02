import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatFileSize } from "@/lib/format";
import { Download, Building2, FileText, FileImage, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireWorkspaceAccountActive } from "@/lib/workspace";

const STORAGE_BUCKET = "project-files";

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType === "application/pdf") return FileText;
  return File;
}

export default async function SharePage({
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
    .single();

  if (!shareLink) notFound();

  if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">Lien expiré</p>
          <p className="text-sm text-muted-foreground mt-2">Ce lien de partage n'est plus valide.</p>
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

  let fileData: { filename: string; size_bytes: number; mime_type: string; storage_path: string } | null = null;
  let downloadUrl: string | null = null;
  let firmProfile: { firm_name?: string | null; architect_name?: string | null; logo_url?: string | null } | null = null;

  if (shareLink.resource_type === "file") {
    const { data: file } = await supabase
      .from("files")
      .select("filename, size_bytes, mime_type, storage_path, workspace_id")
      .eq("id", shareLink.resource_id)
      .eq("workspace_id", shareLink.workspace_id)
      .single();

    if (file) {
      fileData = file;
      const { data: signed } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(file.storage_path, 3600);
      downloadUrl = signed?.signedUrl ?? null;

      const { data: workspace } = await supabase
        .from("workspaces")
        .select("id")
        .eq("id", shareLink.workspace_id)
        .single();

      if (workspace) {
        const { data: fp } = await supabase
          .from("firm_profile")
          .select("firm_name, architect_name, logo_url")
          .eq("workspace_id", workspace.id)
          .single();
        firmProfile = fp;
      }
    }
  }

  if (!fileData || !downloadUrl) notFound();

  const FileIcon = getFileIcon(fileData.mime_type);
  const isImage = fileData.mime_type.startsWith("image/");
  const isPdf = fileData.mime_type === "application/pdf";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Branded header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          {firmProfile?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={firmProfile.logo_url} alt="Logo" className="h-8 object-contain" />
          ) : (
            <Building2 className="h-6 w-6 text-primary" />
          )}
          <div>
            <p className="font-semibold text-sm">
              {firmProfile?.firm_name ?? "ArchiDesk"}
            </p>
            {firmProfile?.architect_name && (
              <p className="text-xs text-muted-foreground">{firmProfile.architect_name}</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* File card */}
        <div className="bg-white border rounded-xl p-6 flex items-center gap-4">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(FileIcon as any)({ className: "h-12 w-12 text-muted-foreground shrink-0" })}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-lg truncate">{fileData.filename}</p>
            <p className="text-sm text-muted-foreground">{formatFileSize(fileData.size_bytes)}</p>
          </div>
          <a href={downloadUrl} download={fileData.filename}>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Télécharger
            </Button>
          </a>
        </div>

        {/* Preview */}
        {isImage && (
          <div className="bg-white border rounded-xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={downloadUrl} alt={fileData.filename} className="w-full object-contain max-h-[70vh]" />
          </div>
        )}
        {isPdf && (
          <div className="bg-white border rounded-xl overflow-hidden" style={{ height: "70vh" }}>
            <iframe src={downloadUrl} className="w-full h-full" title={fileData.filename} />
          </div>
        )}
      </main>
    </div>
  );
}
