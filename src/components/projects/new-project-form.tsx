"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProjectForm } from "./project-form";
import { createProjectAction } from "@/lib/actions/projects";
import type { ProjectFormValues } from "@/lib/validators/project";
import { toast } from "sonner";
import { useUpgradeModal } from "@/components/billing/use-upgrade-modal";

interface NewProjectFormProps {
  clients: { id: string; name: string }[];
  preselectedClientId?: string;
}

export function NewProjectForm({ clients, preselectedClientId }: NewProjectFormProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { trigger: triggerUpgrade, modal: upgradeModal } = useUpgradeModal();

  async function handleSubmit(values: ProjectFormValues) {
    setLoading(true);
    const result = await createProjectAction(values);
    setLoading(false);

    if (!result.ok) {
      if (result.code === "upgrade_required") {
        triggerUpgrade(result.error);
        return;
      }
      toast.error(result.error);
      return;
    }

    toast.success("Projet créé avec succès.");
    router.push(`/projects/${result.data.id}`);
  }

  return (
    <>
      <ProjectForm
        clients={clients}
        onSubmit={handleSubmit}
        loading={loading}
        defaultValues={preselectedClientId ? { clientId: preselectedClientId } : undefined}
      />
      {upgradeModal}
    </>
  );
}
