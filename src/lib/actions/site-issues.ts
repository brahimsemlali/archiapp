"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceRole } from "@/lib/workspace";
import type { Result } from "@/types";
import { dbError } from "@/lib/db-error";

const optionalUuid = z.preprocess(
  (value) => value === "" || value == null ? undefined : value,
  z.string().uuid().optional()
);

const optionalDate = z.preprocess(
  (value) => value === "" || value == null ? undefined : value,
  z.string().optional()
);

const siteIssueInputSchema = z.object({
  projectId: z.string().uuid(),
  siteVisitId: optionalUuid,
  assignedTo: optionalUuid,
  title: z.string().trim().min(2, "Titre requis"),
  description: z.string().trim().optional(),
  zone: z.string().trim().optional(),
  status: z.enum(["open", "in_progress", "resolved"]).default("open"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: optionalDate,
  photoUrl: z.string().optional(),
  photoPath: z.string().optional(),
});

const siteIssueUpdateSchema = siteIssueInputSchema
  .omit({ projectId: true, siteVisitId: true, photoUrl: true, photoPath: true })
  .partial();

export type SiteIssueInput = z.infer<typeof siteIssueInputSchema>;
export type SiteIssueUpdate = z.infer<typeof siteIssueUpdateSchema>;

export async function createSiteIssueAction(input: SiteIssueInput): Promise<Result<{ id: string }>> {
  const parsed = siteIssueInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { user, workspaceId } = context.data;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", parsed.data.projectId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!project) return { ok: false, error: "Projet introuvable." };

  const resolvedAt = parsed.data.status === "resolved" ? new Date().toISOString() : null;
  const { data, error } = await supabase
    .from("site_issues")
    .insert({
      workspace_id: workspaceId,
      project_id: parsed.data.projectId,
      site_visit_id: parsed.data.siteVisitId ?? null,
      created_by: user.id,
      assigned_to: parsed.data.assignedTo ?? null,
      title: parsed.data.title,
      description: parsed.data.description || null,
      zone: parsed.data.zone || null,
      status: parsed.data.status,
      priority: parsed.data.priority,
      due_date: parsed.data.dueDate ?? null,
      photo_url: parsed.data.photoUrl ?? null,
      photo_path: parsed.data.photoPath ?? null,
      resolved_at: resolvedAt,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: dbError(error) };

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    project_id: parsed.data.projectId,
    action: "site_issue.created",
    metadata: { title: parsed.data.title, status: parsed.data.status, priority: parsed.data.priority },
  });

  revalidatePath(`/projects/${parsed.data.projectId}`);
  if (parsed.data.siteVisitId) revalidatePath(`/projects/${parsed.data.projectId}/visites/${parsed.data.siteVisitId}`);
  return { ok: true, data: { id: data.id } };
}

export async function updateSiteIssueAction(id: string, values: SiteIssueUpdate): Promise<Result<void>> {
  const parsed = siteIssueUpdateSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: issue } = await supabase
    .from("site_issues")
    .select("project_id, site_visit_id")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();

  if (!issue) return { ok: false, error: "Réserve introuvable." };

  const nextStatus = parsed.data.status;
  const { error } = await supabase
    .from("site_issues")
    .update({
      ...(parsed.data.assignedTo !== undefined && { assigned_to: parsed.data.assignedTo ?? null }),
      ...(parsed.data.title !== undefined && { title: parsed.data.title }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description || null }),
      ...(parsed.data.zone !== undefined && { zone: parsed.data.zone || null }),
      ...(nextStatus !== undefined && { status: nextStatus }),
      ...(parsed.data.priority !== undefined && { priority: parsed.data.priority }),
      ...(parsed.data.dueDate !== undefined && { due_date: parsed.data.dueDate ?? null }),
      ...(nextStatus !== undefined && {
        resolved_at: nextStatus === "resolved" ? new Date().toISOString() : null,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: dbError(error) };

  revalidatePath(`/projects/${issue.project_id}`);
  if (issue.site_visit_id) revalidatePath(`/projects/${issue.project_id}/visites/${issue.site_visit_id}`);
  return { ok: true, data: undefined };
}

export async function deleteSiteIssueAction(id: string): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: issue } = await supabase
    .from("site_issues")
    .select("project_id")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();

  if (!issue) return { ok: false, error: "Réserve introuvable." };

  const { error } = await supabase
    .from("site_issues")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: dbError(error) };
  revalidatePath(`/projects/${issue.project_id}`);
  return { ok: true, data: undefined };
}
