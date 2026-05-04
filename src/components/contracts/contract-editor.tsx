"use client";

import { useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Save,
  Download,
  CheckCircle,
  Loader2,
  Bold,
  Italic,
  Heading2,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import { updateContractContentAction, finalizeContractAction, archiveContractAction } from "@/lib/actions/contracts";

interface ContractSection {
  heading: string;
  body: string;
}

interface ContractContent {
  title: string;
  sections: ContractSection[];
}

interface ContractEditorProps {
  contractId: string;
  initialContent: ContractContent | null;
  status: string;
}

function buildHtmlFromContent(content: ContractContent): string {
  return content.sections
    .map(
      (s) =>
        `<h2>${s.heading}</h2><p>${s.body.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>`
    )
    .join("\n");
}

export function ContractEditor({ contractId, initialContent, status }: ContractEditorProps) {
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const isFinalized = status === "finalise";
  const isArchived = status === "archive";

  const initialHtml = initialContent
    ? buildHtmlFromContent(initialContent)
    : "<p>Contenu du contrat...</p>";

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialHtml,
    editable: !isFinalized && !isArchived,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[600px] p-6 focus:outline-none",
      },
    },
  });

  const handleSave = useCallback(async () => {
    if (!editor) return;
    setSaving(true);

    const html = editor.getHTML();
    const json = editor.getJSON();

    const result = await updateContractContentAction(contractId, json, html);
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Contrat enregistré.");
  }, [editor, contractId]);

  const handleFinalize = useCallback(async () => {
    if (!editor) return;

    // Save first
    const html = editor.getHTML();
    const json = editor.getJSON();
    await updateContractContentAction(contractId, json, html);

    setFinalizing(true);
    const result = await finalizeContractAction(contractId);
    setFinalizing(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Contrat finalisé.");
    editor.setEditable(false);
  }, [editor, contractId]);

  const handleExportPdf = useCallback(async () => {
    window.open(`/api/contracts/${contractId}/pdf`, "_blank");
  }, [contractId]);

  const handleArchive = useCallback(async () => {
    if (!confirm("Archiver ce contrat ? Il ne sera plus visible par défaut.")) return;
    setArchiving(true);
    const result = await archiveContractAction(contractId);
    setArchiving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Contrat archivé.");
  }, [contractId]);

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="border-b px-4 py-2 flex items-center gap-2 flex-wrap">
        {!isFinalized && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={editor?.isActive("bold") ? "bg-accent" : ""}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={editor?.isActive("italic") ? "bg-accent" : ""}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              className={editor?.isActive("heading", { level: 2 }) ? "bg-accent" : ""}
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
          </>
        )}

        <div className="flex-1" />

        <Button variant="outline" size="sm" onClick={handleExportPdf}>
          <Download className="mr-2 h-4 w-4" />
          Exporter PDF
        </Button>

        {!isFinalized && (
          <>
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Enregistrer
            </Button>
            <Button size="sm" onClick={handleFinalize} disabled={finalizing}>
              {finalizing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Finaliser
            </Button>
          </>
        )}

        {isFinalized && (
          <>
            <Badge variant="default" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Finalisé
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleArchive}
              disabled={archiving}
              className="text-muted-foreground"
            >
              {archiving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Archive className="mr-2 h-4 w-4" />
              )}
              Archiver
            </Button>
          </>
        )}
        {isArchived && (
          <Badge variant="outline" className="gap-1">
            <Archive className="h-3 w-3" />
            Archivé
          </Badge>
        )}
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
