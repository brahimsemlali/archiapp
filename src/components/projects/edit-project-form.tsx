"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProjectForm } from "./project-form";
import { updateProjectAction } from "@/lib/actions/projects";
import type { ProjectFormValues } from "@/lib/validators/project";
import { toast } from "sonner";
import { centimsToInput } from "@/lib/format";

interface EditProjectFormProps {
  project: {
    id: string;
    client_id: string;
    title: string;
    type: string;
    address?: string | null;
    surface_m2?: string | null;
    phase: string;
    status: string;
    budget_estimate_centimes?: number | null;
    fees_centimes?: number | null;
    start_date?: string | null;
    target_end_date?: string | null;
    notes?: string | null;
  };
  clients: { id: string; name: string }[];
}

export function EditProjectForm({ project, clients }: EditProjectFormProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(values: ProjectFormValues) {
    setLoading(true);
    const result = await updateProjectAction(project.id, values);
    setLoading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Projet mis à jour.");
    router.push(`/projects/${project.id}`);
  }

  return (
    <ProjectForm
      clients={clients}
      defaultValues={{
        title: project.title,
        clientId: project.client_id,
        type: project.type as ProjectFormValues["type"],
        address: project.address ?? undefined,
        surfaceM2: project.surface_m2 ?? undefined,
        phase: project.phase as ProjectFormValues["phase"],
        status: project.status as ProjectFormValues["status"],
        budgetEstimate: project.budget_estimate_centimes
          ? centimsToInput(project.budget_estimate_centimes)
          : undefined,
        fees: project.fees_centimes ? centimsToInput(project.fees_centimes) : undefined,
        startDate: project.start_date ?? undefined,
        targetEndDate: project.target_end_date ?? undefined,
        notes: project.notes ?? undefined,
      }}
      onSubmit={handleSubmit}
      loading={loading}
    />
  );
}
