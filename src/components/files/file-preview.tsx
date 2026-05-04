"use client";

import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileRow {
  id: string;
  filename: string;
  mime_type: string;
}

interface FilePreviewProps {
  file: FileRow;
  url: string;
  onClose: () => void;
}

export function FilePreview({ file, url, onClose }: FilePreviewProps) {
  const isImage = file.mime_type.startsWith("image/");
  const isPdf = file.mime_type === "application/pdf";

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      <div className="flex items-center justify-between p-4 bg-black/50 text-white">
        <p className="font-medium truncate">{file.filename}</p>
        <div className="flex items-center gap-2">
          <a href={url} download={file.filename}>
            <Button variant="ghost" size="sm" className="text-white hover:text-white hover:bg-white/20">
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </Button>
          </a>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
        {isImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={file.filename}
            className="max-h-full max-w-full object-contain rounded"
          />
        )}
        {isPdf && (
          <iframe
            src={url}
            className="w-full h-full rounded"
            title={file.filename}
          />
        )}
      </div>
    </div>
  );
}
