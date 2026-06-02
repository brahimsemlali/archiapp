"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MoodboardForm } from "./moodboard-form";
import { deleteMoodboardAction } from "@/lib/actions/moodboards";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Client {
  id: string;
  name: string;
}

interface MoodboardEditSheetProps {
  moodboard: {
    id: string;
    title: string;
    description?: string | null;
    clientId?: string | null;
  };
  clients: Client[];
  trigger: React.ReactNode;
}

export function MoodboardEditSheet({ moodboard, clients, trigger }: MoodboardEditSheetProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteMoodboardAction(moodboard.id);
    if (!result.ok) {
      toast.error(result.error);
      setDeleting(false);
      return;
    }
    toast.success("Moodboard supprimé.");
    router.push("/moodboards");
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger onClick={() => setOpen(true)}>{trigger}</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Modifier le moodboard</SheetTitle>
        </SheetHeader>
        <div className="mt-5 space-y-5">
          <MoodboardForm
            clients={clients}
            initial={{
              id: moodboard.id,
              title: moodboard.title,
              description: moodboard.description,
              clientId: moodboard.clientId,
            }}
          />
          <div className="border-t border-slate-100 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              disabled={deleting}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer ce moodboard
            </Button>
          </div>
        </div>
      </SheetContent>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Supprimer ce moodboard ?"
        description="Toutes les images associées seront supprimées."
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
      />
    </Sheet>
  );
}
