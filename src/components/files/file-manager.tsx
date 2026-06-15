"use client";

import { useState, useRef, useCallback } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  File,
  FileImage,
  FileText,
  Download,
  Link2,
  History,
  Loader2,
  FolderOpen,
  Trash2,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { uploadFileAction, getFileDownloadUrl, deleteFileAction, updateFileApprovalStatusAction } from "@/lib/actions/files";
import { useUpgradeModal } from "@/components/billing/use-upgrade-modal";
import { formatFileSize } from "@/lib/format";
import { useLocalization } from "@/components/localization-provider";
import { FilePreview } from "./file-preview";
import { ShareLinkDialog } from "./share-link-dialog";
import { FileHistoryDialog } from "./file-history-dialog";
import { DOCUMENT_UPLOAD_ACCEPT, isAllowedDocumentFile } from "@/lib/upload-rules";

interface FileRow {
  id: string;
  filename: string;
  folder: string;
  storage_path: string;
  size_bytes: number;
  mime_type: string;
  version: number;
  parent_file_id: string | null;
  note: string | null;
  approval_status?: "not_required" | "pending" | "approved" | "rejected";
  approval_note?: string | null;
  created_at: string;
}

interface FileManagerProps {
  projectId: string;
  filesByFolder: Record<string, FileRow[]>;
  allFiles: FileRow[];
  defaultFolders: string[];
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType === "application/pdf") return FileText;
  return File;
}

function isPreviewable(mimeType: string) {
  return mimeType.startsWith("image/") || mimeType === "application/pdf";
}

export function FileManager({ projectId, filesByFolder, allFiles, defaultFolders }: FileManagerProps) {
  const t = useTranslations("common");
  const { formatDate } = useLocalization();
  const { trigger: triggerUpgrade, modal: upgradeModal } = useUpgradeModal();
  const [uploading, setUploading] = useState(false);
  const [activeFolder, setActiveFolder] = useState(defaultFolders[0] ?? "Plans");
  const [dragOver, setDragOver] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileRow | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [shareFile, setShareFile] = useState<FileRow | null>(null);
  const [historyFile, setHistoryFile] = useState<FileRow | null>(null);
  const [pendingDeleteFile, setPendingDeleteFile] = useState<FileRow | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const folders = [
    ...defaultFolders,
    ...Object.keys(filesByFolder).filter((f) => !defaultFolders.includes(f)),
  ];

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const selectedFiles = Array.from(files);
      const validFiles = selectedFiles.filter((file) => {
        if (!isAllowedDocumentFile(file)) {
          toast.error(`${file.name} : type de fichier non autorisé.`);
          return false;
        }
        if (file.size > 100 * 1024 * 1024) {
          toast.error(`${file.name} : fichier trop lourd (max 100 Mo).`);
          return false;
        }
        return true;
      });
      if (validFiles.length === 0) return;

      setUploading(true);

      for (const file of validFiles) {
        const formData = new FormData();
        formData.append("file", file);
        const result = await uploadFileAction(projectId, activeFolder, formData);
        if (!result.ok) {
          if (result.code === "upgrade_required") {
            setUploading(false);
            triggerUpgrade(result.error);
            return;
          }
          toast.error(`Erreur : ${result.error}`);
        } else {
          toast.success(`${result.data.filename} déposé.`);
        }
      }

      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [projectId, activeFolder, triggerUpgrade]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleUpload(e.dataTransfer.files);
    },
    [handleUpload]
  );

  const handleDownload = async (file: FileRow) => {
    const result = await getFileDownloadUrl(file.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const a = document.createElement("a");
    a.href = result.data;
    a.download = file.filename;
    a.click();
  };

  const handleDelete = async (file: FileRow) => {
    setPendingDeleteFile(file);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteFile) return;
    const result = await deleteFileAction(pendingDeleteFile.id);
    if (!result.ok) {
      toast.error(result.error);
    } else {
      toast.success(`${pendingDeleteFile.filename} supprimé.`);
    }
  };

  const handlePreview = async (file: FileRow) => {
    const result = await getFileDownloadUrl(file.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setPreviewUrl(result.data);
    setPreviewFile(file);
  };

  const handleApprovalStatus = async (
    file: FileRow,
    status: "not_required" | "pending" | "approved" | "rejected"
  ) => {
    const result = await updateFileApprovalStatusAction(file.id, status);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(status === "pending" ? "Approbation demandée." : "Statut d'approbation mis à jour.");
  };

  const currentFiles = filesByFolder[activeFolder] ?? [];

  return (
    <>
      <div className="flex gap-6">
        {/* Folder sidebar */}
        <div className="w-48 shrink-0 space-y-1">
          {folders.map((folder) => {
            const count = (filesByFolder[folder] ?? []).length;
            return (
              <button
                key={folder}
                onClick={() => setActiveFolder(folder)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                  activeFolder === folder
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-muted-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 shrink-0" />
                  {folder}
                </span>
                {count > 0 && (
                  <Badge
                    variant={activeFolder === folder ? "secondary" : "outline"}
                    className="text-xs h-5 min-w-5 flex items-center justify-center"
                  >
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* File list + drop zone */}
        <div className="flex-1 space-y-4">
          {/* Upload zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/20"
            }`}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground mb-3">
              Glissez-déposez des fichiers ici, ou
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {uploading ? "Téléversement..." : `Ajouter dans ${activeFolder}`}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={DOCUMENT_UPLOAD_ACCEPT}
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
          </div>

          {/* File list */}
          {currentFiles.length > 0 ? (
            <div className="space-y-2">
              {currentFiles.map((file) => {
                const Icon = getFileIcon(file.mime_type);
                const canPreview = isPreviewable(file.mime_type);
                const fileHistory = allFiles.filter(
                  (f) =>
                    f.filename === file.filename &&
                    f.folder === file.folder &&
                    f.id !== file.id
                );

                return (
                  <div
                    key={file.id}
                    className="bg-white border rounded-lg p-4 flex items-center gap-4"
                  >
                    <Icon className="h-8 w-8 text-muted-foreground shrink-0" />

                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => canPreview && handlePreview(file)}
                        className={`font-medium text-sm text-left truncate block w-full ${canPreview ? "hover:underline cursor-pointer" : ""}`}
                      >
                        {file.filename}
                      </button>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span>{formatFileSize(file.size_bytes)}</span>
                        <span>·</span>
                        <span>{formatDate(file.created_at)}</span>
                        {file.version > 1 && (
                          <>
                            <span>·</span>
                            <Badge variant="secondary" className="text-xs h-4">v{file.version}</Badge>
                          </>
                        )}
                        <ApprovalBadge status={file.approval_status ?? "not_required"} />
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {(file.approval_status ?? "not_required") === "not_required" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          title="Demander une approbation client"
                          onClick={() => handleApprovalStatus(file, "pending")}
                        >
                          <Clock3 className="h-4 w-4 mr-1" />
                          Approbation
                        </Button>
                      )}
                      {file.approval_status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-[#2F8F5C]"
                            title="Marquer comme approuvé"
                            onClick={() => handleApprovalStatus(file, "approved")}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-[#C75B2E]"
                            title="Marquer comme rejeté"
                            onClick={() => handleApprovalStatus(file, "rejected")}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {fileHistory.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Historique des versions"
                          onClick={() => setHistoryFile(file)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Générer un lien de partage"
                        onClick={() => setShareFile(file)}
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Télécharger"
                        onClick={() => handleDownload(file)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title={t("delete")}
                        onClick={() => handleDelete(file)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Aucun fichier dans {activeFolder}.</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview modal */}
      {previewFile && previewUrl && (
        <FilePreview
          file={previewFile}
          url={previewUrl}
          onClose={() => { setPreviewFile(null); setPreviewUrl(null); }}
        />
      )}

      {/* Share link dialog */}
      {shareFile && (
        <ShareLinkDialog
          file={shareFile}
          onClose={() => setShareFile(null)}
        />
      )}

      {/* Version history dialog */}
      {historyFile && (
        <FileHistoryDialog
          file={historyFile}
          allFiles={allFiles}
          onClose={() => setHistoryFile(null)}
        />
      )}
      <ConfirmDialog
        open={!!pendingDeleteFile}
        onOpenChange={(open) => { if (!open) setPendingDeleteFile(null); }}
        title={`Supprimer "${pendingDeleteFile?.filename}" ?`}
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        onConfirm={confirmDelete}
      />
      {upgradeModal}
    </>
  );
}

function ApprovalBadge({ status }: { status: "not_required" | "pending" | "approved" | "rejected" }) {
  const config = {
    not_required: { label: "Sans approbation", className: "bg-[#F1F5F9] text-[#64748B]" },
    pending: { label: "À approuver", className: "bg-amber-50 text-amber-700" },
    approved: { label: "Approuvé", className: "bg-[#E5F3EB] text-[#2F8F5C]" },
    rejected: { label: "Corrections", className: "bg-[#FCEFE6] text-[#C75B2E]" },
  }[status];

  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}
