"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, History } from "lucide-react";
import { formatDate, formatFileSize } from "@/lib/format";
import { getFileDownloadUrl } from "@/lib/actions/files";
import { toast } from "sonner";

interface FileRow {
  id: string;
  filename: string;
  folder: string;
  size_bytes: number;
  version: number;
  created_at: string;
  parent_file_id: string | null;
}

interface FileHistoryDialogProps {
  file: FileRow;
  allFiles: FileRow[];
  onClose: () => void;
}

export function FileHistoryDialog({ file, allFiles, onClose }: FileHistoryDialogProps) {
  const versions = allFiles
    .filter((f) => f.filename === file.filename && f.folder === file.folder)
    .sort((a, b) => b.version - a.version);

  async function handleDownload(f: FileRow) {
    const result = await getFileDownloadUrl(f.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const a = document.createElement("a");
    a.href = result.data;
    a.download = f.filename;
    a.click();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique des versions
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground truncate">{file.filename}</p>

        <div className="space-y-2">
          {versions.map((v) => (
            <div key={v.id} className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={v.id === file.id ? "default" : "secondary"} className="text-xs">
                    v{v.version}
                  </Badge>
                  {v.id === file.id && (
                    <span className="text-xs text-muted-foreground">Actuel</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(v.created_at)} · {formatFileSize(v.size_bytes)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(v)}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
