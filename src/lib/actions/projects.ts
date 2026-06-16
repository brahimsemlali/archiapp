"use server";

import { createClient } from "@/lib/supabase/server";
import { assertWorkspaceRecord, requireWorkspaceRole } from "@/lib/workspace";
import { projectSchema, type ProjectFormValues } from "@/lib/validators/project";
import { inputToCentimes } from "@/lib/format";
import { normalizeExternalUrl } from "@/lib/url";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import type { InspirationItem } from "@/components/projects/inspiration-board";
import { assertProjectAvailable, assertStorageAvailable } from "@/lib/billing/guards";
import { validateImageUpload, type UploadFileMeta } from "@/lib/storage/upload-validation";
import { dbError } from "@/lib/db-error";

interface PhaseBudgetInput {
  phase: string;
  plannedHours?: number;
  plannedBudgetCentimes?: number;
}

export async function createProjectAction(values: ProjectFormValues): Promise<Result<{ id: string }>> {
  const parsed = projectSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const projectLimit = await assertProjectAvailable(supabase, workspaceId);
  if (!projectLimit.ok) return projectLimit;
  const clientCheck = await assertWorkspaceRecord(supabase, "clients", parsed.data.clientId, workspaceId, "Client");
  if (!clientCheck.ok) return clientCheck;

  const { data, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: workspaceId,
      client_id: parsed.data.clientId,
      title: parsed.data.title,
      type: parsed.data.type,
      address: parsed.data.address,
      surface_m2: parsed.data.surfaceM2 ? parseFloat(parsed.data.surfaceM2) : null,
      phase: parsed.data.phase,
      status: parsed.data.status,
      budget_estimate_centimes: parsed.data.budgetEstimate
        ? inputToCentimes(parsed.data.budgetEstimate)
        : null,
      fees_centimes: parsed.data.fees ? inputToCentimes(parsed.data.fees) : null,
      start_date: parsed.data.startDate ?? null,
      target_end_date: parsed.data.targetEndDate ?? null,
      notes: parsed.data.notes,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: dbError(error) };

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    project_id: data.id,
    client_id: parsed.data.clientId,
    action: "project.created",
    metadata: { title: parsed.data.title },
  });

  revalidatePath("/projects");
  return { ok: true, data: { id: data.id } };
}

export async function updateProjectAction(id: string, values: ProjectFormValues): Promise<Result<void>> {
  const parsed = projectSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const clientCheck = await assertWorkspaceRecord(supabase, "clients", parsed.data.clientId, workspaceId, "Client");
  if (!clientCheck.ok) return clientCheck;

  const { data: project, error } = await supabase
    .from("projects")
    .update({
      client_id: parsed.data.clientId,
      title: parsed.data.title,
      type: parsed.data.type,
      address: parsed.data.address,
      surface_m2: parsed.data.surfaceM2 ? parseFloat(parsed.data.surfaceM2) : null,
      phase: parsed.data.phase,
      status: parsed.data.status,
      budget_estimate_centimes: parsed.data.budgetEstimate
        ? inputToCentimes(parsed.data.budgetEstimate)
        : null,
      fees_centimes: parsed.data.fees ? inputToCentimes(parsed.data.fees) : null,
      start_date: parsed.data.startDate ?? null,
      target_end_date: parsed.data.targetEndDate ?? null,
      notes: parsed.data.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: dbError(error) };
  if (!project) return { ok: false, error: "Projet introuvable." };

  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  return { ok: true, data: undefined };
}

export async function archiveProjectAction(id: string): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: project, error } = await supabase
    .from("projects")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: dbError(error) };
  if (!project) return { ok: false, error: "Projet introuvable." };

  revalidatePath("/projects");
  return { ok: true, data: undefined };
}

// ─── Checklist ────────────────────────────────────────────────────────────────

interface ChecklistItem { label: string; done: boolean; }

export async function updateProjectChecklistAction(
  id: string,
  checklist: Record<string, ChecklistItem[]>
): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: project } = await supabase
    .from("projects")
    .select("metadata")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();

  if (!project) return { ok: false, error: "Projet introuvable." };

  // Items are now free-form (architect-editable) — sanitize before storing.
  const MAX_ITEMS_PER_PHASE = 50;
  const MAX_LABEL = 140;
  const cleanChecklist: Record<string, ChecklistItem[]> = {};
  for (const [p, items] of Object.entries(checklist ?? {})) {
    if (!Array.isArray(items)) continue;
    cleanChecklist[p] = items
      .filter((i): i is ChecklistItem => !!i && typeof i.label === "string")
      .slice(0, MAX_ITEMS_PER_PHASE)
      .map((i) => ({ label: i.label.trim().slice(0, MAX_LABEL), done: Boolean(i.done) }))
      .filter((i) => i.label.length > 0);
  }

  const metadata = (project.metadata as Record<string, unknown>) ?? {};
  const { data: updatedProject, error } = await supabase
    .from("projects")
    .update({ metadata: { ...metadata, checklist: cleanChecklist }, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: dbError(error) };
  if (!updatedProject) return { ok: false, error: "Projet introuvable." };
  revalidatePath(`/projects/${id}`);
  return { ok: true, data: undefined };
}

export async function updateProjectPhaseBudgetsAction(
  id: string,
  budgets: PhaseBudgetInput[]
): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: project } = await supabase
    .from("projects")
    .select("metadata")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();

  if (!project) return { ok: false, error: "Projet introuvable." };

  const normalized = budgets.reduce<Record<string, { plannedHours: number; plannedBudgetCentimes: number }>>((acc, budget) => {
    if (!budget.phase) return acc;
    const plannedHours = Math.max(0, Number.isFinite(budget.plannedHours) ? Math.round((budget.plannedHours ?? 0) * 100) / 100 : 0);
    const plannedBudgetCentimes = Math.max(0, Math.round(budget.plannedBudgetCentimes ?? 0));
    if (plannedHours > 0 || plannedBudgetCentimes > 0) {
      acc[budget.phase] = { plannedHours, plannedBudgetCentimes };
    }
    return acc;
  }, {});

  const metadata = (project.metadata as Record<string, unknown>) ?? {};
  const { data: updatedProject, error } = await supabase
    .from("projects")
    .update({
      metadata: { ...metadata, phase_budgets: normalized },
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: dbError(error) };
  if (!updatedProject) return { ok: false, error: "Projet introuvable." };

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    project_id: id,
    action: "project.phase_budgets_updated",
    metadata: { phases: Object.keys(normalized).length },
  });

  revalidatePath(`/projects/${id}`);
  return { ok: true, data: undefined };
}

// ─── Inspiration board ────────────────────────────────────────────────────────

/** Step 1: signed-URL ticket for a direct-to-storage project inspiration image. */
export async function createInspirationUploadUrlAction(
  projectId: string,
  meta: UploadFileMeta
): Promise<Result<{ bucket: string; path: string; token: string; contentType: string }>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const projectCheck = await assertWorkspaceRecord(supabase, "projects", projectId, workspaceId, "Projet");
  if (!projectCheck.ok) return projectCheck;

  const fileValidation = validateImageUpload(meta, 10 * 1024 * 1024);
  if (!fileValidation.ok) return fileValidation;
  const storageCheck = await assertStorageAvailable(supabase, workspaceId, meta.size);
  if (!storageCheck.ok) return storageCheck;

  const path = `${workspaceId}/${projectId}/inspirations/${Date.now()}.${fileValidation.data.extension}`;
  const { data: signed, error } = await supabase.storage.from("project-files").createSignedUploadUrl(path);
  if (error || !signed) return { ok: false, error: error?.message ?? "Impossible de préparer l'envoi." };

  return { ok: true, data: { bucket: "project-files", path: signed.path, token: signed.token, contentType: fileValidation.data.contentType } };
}

/** Step 2: append the uploaded inspiration image to the project metadata. */
export async function finalizeInspirationAction(
  projectId: string,
  input: { path: string; caption?: string; source?: string }
): Promise<Result<InspirationItem>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  if (!input.path.startsWith(`${workspaceId}/${projectId}/inspirations/`)) {
    return { ok: false, error: "Chemin de stockage invalide." };
  }

  const source = normalizeExternalUrl(input.source);
  if (input.source?.trim() && !source) return { ok: false, error: "URL source invalide." };

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("project-files")
    .createSignedUrl(input.path, 60 * 60);
  if (signedUrlError || !signedUrlData?.signedUrl) {
    return { ok: false, error: "Image envoyée, mais l'aperçu n'a pas pu être généré." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("metadata")
    .eq("id", projectId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!project) return { ok: false, error: "Projet introuvable." };

  const metadata = (project.metadata as Record<string, unknown>) ?? {};
  const existing = (metadata.inspirations as InspirationItem[]) ?? [];
  const newItem: InspirationItem = {
    id: crypto.randomUUID(),
    url: signedUrlData.signedUrl,
    path: input.path,
    caption: input.caption?.trim() || undefined,
    source: source || undefined,
    uploadedAt: new Date().toISOString(),
  };

  const { data: updatedProject, error } = await supabase
    .from("projects")
    .update({ metadata: { ...metadata, inspirations: [...existing, newItem] }, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: dbError(error) };
  if (!updatedProject) return { ok: false, error: "Projet introuvable." };

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, data: newItem };
}

export async function removeInspirationAction(
  projectId: string,
  itemId: string
): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: project } = await supabase
    .from("projects")
    .select("metadata")
    .eq("id", projectId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!project) return { ok: false, error: "Projet introuvable." };

  const metadata = (project.metadata as Record<string, unknown>) ?? {};
  const existing = (metadata.inspirations as InspirationItem[]) ?? [];
  const removedItem = existing.find((i) => i.id === itemId);

  const { error } = await supabase
    .from("projects")
    .update({ metadata: { ...metadata, inspirations: existing.filter((i) => i.id !== itemId) }, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: dbError(error) };

  if (removedItem?.path) {
    await supabase.storage.from("project-files").remove([removedItem.path]);
  }

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, data: undefined };
}
