"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateProjectNotesAction } from "@/lib/actions/notes";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

const MDEditor = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default),
  { ssr: false }
);

interface ProjectNotesEditorProps {
  projectId: string;
  initialNotes: string;
}

export function ProjectNotesEditor({ projectId, initialNotes }: ProjectNotesEditorProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const handleChange = useCallback((value: string | undefined) => {
    setNotes(value ?? "");
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const result = await updateProjectNotesAction(projectId, notes);
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setDirty(false);
    toast.success("Notes enregistrées.");
  }, [projectId, notes]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Bloc-notes Markdown du projet. Utilisé pour les PV de réunion, comptes-rendus, listes de tâches.
        </p>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !dirty}
        >
          {saving
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : <Save className="mr-2 h-4 w-4" />}
          {dirty ? "Enregistrer" : "Enregistré"}
        </Button>
      </div>

      <div data-color-mode="light">
        <MDEditor
          value={notes}
          onChange={handleChange}
          height={500}
          preview="live"
          visibleDragbar={false}
        />
      </div>
    </div>
  );
}
