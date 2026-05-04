"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClientForm } from "@/components/clients/client-form";
import { createClientAction } from "@/lib/actions/clients";
import type { ClientFormValues } from "@/lib/validators/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewClientPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(values: ClientFormValues) {
    setLoading(true);
    const result = await createClientAction(values);
    setLoading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Client créé avec succès.");
    router.push(`/clients/${result.data.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/clients" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nouveau client</h1>
      </div>
      <div className="bg-white border rounded-lg p-6">
        <ClientForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  );
}
