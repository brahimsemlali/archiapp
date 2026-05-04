"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClientForm } from "./client-form";
import { updateClientAction } from "@/lib/actions/clients";
import type { ClientFormValues } from "@/lib/validators/client";
import { toast } from "sonner";

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

  return (
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
  );
}
