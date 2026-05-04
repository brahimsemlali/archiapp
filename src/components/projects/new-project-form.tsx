"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProjectForm } from "./project-form";
import { createProjectAction } from "@/lib/actions/projects";
import type { ProjectFormValues } from "@/lib/validators/project";
import { toast } from "sonner";

interface NewProjectFormProps {
  clients: { id: string; name: string }[];
}

export function NewProjectForm({ clients }: NewProjectFormProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(values: ProjectFormValues) {
    setLoading(true);
    const result = await createProjectAction(values);
    setLoading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Projet créé avec succès.");
    router.push(`/projects/${result.data.id}`);
  }

  return <ProjectForm clients={clients} onSubmit={handleSubmit} loading={loading} />;
}
