"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Trash2, Loader2 } from "lucide-react";
import { deleteVisiteAction } from "@/lib/actions/visites";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DeleteVisiteButtonProps {
  visitId: string;
  projectId: string;
}

export function DeleteVisiteButton({ visitId, projectId }: DeleteVisiteButtonProps) {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    const result = await deleteVisiteAction(visitId, projectId);
    setLoading(false);
    if (!result.ok) { toast.error("Erreur lors de la suppression."); return; }
    toast.success("Visite supprimée.");
    router.push(`/projects/${projectId}/visites`);
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="text-destructive print:hidden" onClick={() => setConfirm(true)} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </Button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Supprimer cette visite ?"
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
      />
    </>
  );
}
