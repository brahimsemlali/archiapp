"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClientForm } from "./client-form";
import { updateClientAction, archiveClientAction } from "@/lib/actions/clients";
import type { ClientFormValues } from "@/lib/validators/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Archive } from "lucide-react";

interface EditClientFormProps {
  client: {
    id: string;
    name: string;
    type: "particulier" | "societe";
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    ice?: string | null;
    cin?: string | null;
    notes?: string | null;
  };
}

export function EditClientForm({ client }: EditClientFormProps) {
  const [loading, setLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const router = useRouter();

  async function handleSubmit(values: ClientFormValues) {
    setLoading(true);
    const result = await updateClientAction(client.id, values);
    setLoading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Client mis à jour.");
    router.push(`/clients/${client.id}`);
  }

  async function handleArchive() {
    if (!confirm("Archiver ce client ? Il ne sera plus visible dans la liste active.")) return;
    setArchiving(true);
    const result = await archiveClientAction(client.id);
    setArchiving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Client archivé.");
    router.push("/clients");
  }

  return (
    <div className="space-y-8">
      <ClientForm
        defaultValues={{
          name: client.name,
          type: client.type,
          phone: client.phone ?? undefined,
          email: client.email ?? undefined,
          address: client.address ?? undefined,
          ice: client.ice ?? undefined,
          cin: client.cin ?? undefined,
          notes: client.notes ?? undefined,
        }}
        onSubmit={handleSubmit}
        loading={loading}
      />

      <div className="border-t pt-6">
        <p className="text-sm font-medium text-muted-foreground mb-3">Zone de danger</p>
        <Button
          type="button"
          variant="outline"
          className="text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={handleArchive}
          disabled={archiving}
        >
          {archiving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Archive className="mr-2 h-4 w-4" />
          )}
          Archiver ce client
        </Button>
      </div>
    </div>
  );
}
