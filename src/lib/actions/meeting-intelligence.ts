"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireWorkspaceRole } from "@/lib/workspace";
import { anthropic, AI_MODEL } from "@/lib/ai/anthropic";
import { assertAiUsageAvailable, recordAiUsage } from "@/lib/ai/usage";
import { createTimeEntryAction } from "@/lib/actions/time-entries";
import type { Result } from "@/types";
import { dbError } from "@/lib/db-error";

const MEETING_TYPES = [
  "reunion_client",
  "revue_conception",
  "reunion_chantier",
  "reunion_fournisseur",
  "kick_off",
  "reception",
] as const;

const optionalUuid = z.preprocess(
  (value) => value === "" || value == null ? undefined : value,
  z.string().uuid().optional()
);

const extractedTaskSchema = z.object({
  title: z.string(),
  assigneeHint: z.string().nullish().transform((v) => v ?? undefined),
  dueDate: z.string().nullish().transform((v) => v ?? undefined),
  priority: z.enum(["haute", "moyenne", "basse"]).default("moyenne"),
  context: z.string().nullish().transform((v) => v ?? undefined),
});

const meetingAiSchema = z.object({
  summary: z.string(),
  decisions: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  tasks: z.array(extractedTaskSchema).default([]),
});

const createMeetingSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(2),
  meetingDate: z.string().min(8),
  meetingType: z.enum(MEETING_TYPES).default("reunion_client"),
  attendees: z.array(z.string().trim().min(1)).default([]),
  durationPlannedMinutes: z.number().int().min(0).optional(),
  durationActualMinutes: z.number().int().min(0).optional(),
  rawNotes: z.string().trim().default(""),
});

const meetingInputSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(2),
  meetingDate: z.string().min(8),
  rawNotes: z.string().trim().min(10),
});

const voiceNoteSchema = z.object({
  projectId: optionalUuid,
  title: z.string().trim().min(2),
  transcript: z.string().trim().min(5),
});

type ExtractedTask = z.infer<typeof extractedTaskSchema>;

function parseAiJson(text: string): z.infer<typeof meetingAiSchema> {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const json = JSON.parse(jsonMatch ? jsonMatch[0] : text) as unknown;
  return meetingAiSchema.parse(json);
}

export async function createMeetingAction(
  input: z.input<typeof createMeetingSchema>
): Promise<Result<{ id: string }>> {
  const parsed = createMeetingSchema.safeParse(input);
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

  const { data, error } = await supabase
    .from("meeting_notes")
    .insert({
      workspace_id: workspaceId,
      project_id: parsed.data.projectId,
      created_by: user.id,
      title: parsed.data.title,
      meeting_date: parsed.data.meetingDate,
      meeting_type: parsed.data.meetingType,
      attendees: parsed.data.attendees,
      duration_planned_minutes: parsed.data.durationPlannedMinutes ?? null,
      duration_actual_minutes: parsed.data.durationActualMinutes ?? null,
      raw_notes: parsed.data.rawNotes,
      summary: null,
      decisions: [],
      risks: [],
      extracted_tasks: [],
      ai_generated: false,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: dbError(error) };

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    project_id: parsed.data.projectId,
    action: "meeting.created",
    metadata: { title: parsed.data.title, type: parsed.data.meetingType },
  });

  revalidatePath(`/projects/${parsed.data.projectId}`);
  return { ok: true, data: { id: data.id } };
}

export async function generateAiForMeetingAction(
  meetingId: string
): Promise<Result<{ summary: string; decisions: string[]; risks: string[]; tasks: ExtractedTask[] }>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const quota = await assertAiUsageAvailable(supabase, workspaceId);
  if (!quota.ok) return quota;

  const { data: meeting } = await supabase
    .from("meeting_notes")
    .select("id, title, meeting_date, raw_notes, project_id")
    .eq("id", meetingId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!meeting) return { ok: false, error: "Réunion introuvable." };
  if (!meeting.raw_notes || meeting.raw_notes.trim().length < 10) {
    return { ok: false, error: "Les notes sont trop courtes pour générer un résumé." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("title, phase")
    .eq("id", meeting.project_id)
    .single();

  const prompt = `Tu es l'assistant opérationnel d'un cabinet d'architecture. Analyse ces notes de réunion et retourne uniquement un JSON valide.

Projet: ${project?.title ?? ""}
Phase: ${project?.phase ?? ""}
Titre réunion: ${meeting.title}
Date: ${meeting.meeting_date}

Notes:
${meeting.raw_notes}

Schéma JSON exact:
{
  "summary": "Résumé exécutif en français, 5-8 lignes",
  "decisions": ["Décision claire"],
  "risks": ["Risque ou blocage avec contexte"],
  "tasks": [
    {
      "title": "Action concrète",
      "assigneeHint": "Nom mentionné si disponible",
      "dueDate": "YYYY-MM-DD si explicitement indiqué",
      "priority": "haute|moyenne|basse",
      "context": "Pourquoi cette tâche existe"
    }
  ]
}`;

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 900,
      messages: [{ role: "user", content: prompt }],
    });

    await recordAiUsage(supabase, workspaceId, {
      feature: "meeting_summary",
      provider: "anthropic",
      model: AI_MODEL,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      metadata: { meetingId },
    });

    const text = (response.content[0] as { type: string; text: string }).text ?? "";
    const ai = parseAiJson(text);

    await supabase
      .from("meeting_notes")
      .update({
        summary: ai.summary,
        decisions: ai.decisions,
        risks: ai.risks,
        extracted_tasks: ai.tasks,
        ai_generated: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", meetingId)
      .eq("workspace_id", workspaceId);

    revalidatePath(`/projects/${meeting.project_id}`);
    return { ok: true, data: { summary: ai.summary, decisions: ai.decisions, risks: ai.risks, tasks: ai.tasks } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erreur IA." };
  }
}

export async function generateMeetingSummaryAction(input: z.input<typeof meetingInputSchema>): Promise<Result<{ id: string; summary: string; decisions: string[]; risks: string[]; tasks: ExtractedTask[] }>> {
  const parsed = meetingInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { user, workspaceId } = context.data;

  const quota = await assertAiUsageAvailable(supabase, workspaceId);
  if (!quota.ok) return quota;

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, phase")
    .eq("id", parsed.data.projectId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!project) return { ok: false, error: "Projet introuvable." };

  const prompt = `Tu es l'assistant opérationnel d'un cabinet d'architecture. Analyse ces notes de réunion et retourne uniquement un JSON valide.

Projet: ${project.title}
Phase: ${project.phase}
Titre réunion: ${parsed.data.title}
Date: ${parsed.data.meetingDate}

Notes:
${parsed.data.rawNotes}

Schéma JSON exact:
{
  "summary": "Résumé exécutif en français, 5-8 lignes",
  "decisions": ["Décision claire"],
  "risks": ["Risque ou blocage avec contexte"],
  "tasks": [
    {
      "title": "Action concrète",
      "assigneeHint": "Nom mentionné si disponible",
      "dueDate": "YYYY-MM-DD si explicitement indiqué",
      "priority": "haute|moyenne|basse",
      "context": "Pourquoi cette tâche existe"
    }
  ]
}`;

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 900,
      messages: [{ role: "user", content: prompt }],
    });

    await recordAiUsage(supabase, workspaceId, {
      feature: "meeting_summary",
      provider: "anthropic",
      model: AI_MODEL,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      metadata: { projectId: parsed.data.projectId },
    });

    const text = (response.content[0] as { type: string; text: string }).text ?? "";
    const ai = parseAiJson(text);

    const { data, error } = await supabase
      .from("meeting_notes")
      .insert({
        workspace_id: workspaceId,
        project_id: parsed.data.projectId,
        created_by: user.id,
        title: parsed.data.title,
        meeting_date: parsed.data.meetingDate,
        meeting_type: "reunion_client",
        attendees: [],
        raw_notes: parsed.data.rawNotes,
        summary: ai.summary,
        decisions: ai.decisions,
        risks: ai.risks,
        extracted_tasks: ai.tasks,
        ai_generated: true,
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: dbError(error) };

    await supabase.from("activity_log").insert({
      workspace_id: workspaceId,
      project_id: parsed.data.projectId,
      action: "meeting.summary_generated",
      metadata: { title: parsed.data.title, tasks: ai.tasks.length, risks: ai.risks.length },
    });

    revalidatePath(`/projects/${parsed.data.projectId}`);
    return { ok: true, data: { id: data.id, summary: ai.summary, decisions: ai.decisions, risks: ai.risks, tasks: ai.tasks } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erreur IA." };
  }
}

export async function createTasksFromMeetingAction(meetingId: string): Promise<Result<{ created: number }>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: meeting } = await supabase
    .from("meeting_notes")
    .select("id, project_id, extracted_tasks, title, metadata")
    .eq("id", meetingId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!meeting) return { ok: false, error: "Réunion introuvable." };

  const metadata = (meeting.metadata as Record<string, unknown> | null) ?? {};
  if (metadata.tasks_created_at) return { ok: false, error: "Les tâches de cette réunion ont déjà été créées." };

  const tasks = z.array(extractedTaskSchema).safeParse(meeting.extracted_tasks ?? []);
  if (!tasks.success || tasks.data.length === 0) return { ok: false, error: "Aucune tâche à créer." };

  const { data: existingTasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("workspace_id", workspaceId)
    .contains("metadata", { source: "meeting_notes", meeting_id: meeting.id })
    .limit(1);
  if (existingTasks && existingTasks.length > 0) {
    return { ok: false, error: "Les tâches de cette réunion existent déjà." };
  }

  const { data: createdTasks, error } = await supabase.from("tasks").insert(
    tasks.data.map((task) => ({
      workspace_id: workspaceId,
      project_id: meeting.project_id,
      title: task.title,
      description: task.context ?? null,
      due_date: task.dueDate || null,
      priority: task.priority,
      status: "a_faire",
      metadata: {
        source: "meeting_notes",
        meeting_id: meeting.id,
        meeting_title: meeting.title,
        assignee_hint: task.assigneeHint ?? null,
      },
    }))
  ).select("id");

  if (error) return { ok: false, error: dbError(error) };

  await supabase
    .from("meeting_notes")
    .update({
      metadata: {
        ...metadata,
        tasks_created_at: new Date().toISOString(),
        created_task_ids: (createdTasks ?? []).map((task) => task.id),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", meeting.id)
    .eq("workspace_id", workspaceId);

  revalidatePath("/tasks");
  revalidatePath(`/projects/${meeting.project_id}`);
  return { ok: true, data: { created: tasks.data.length } };
}

export async function createTimeEntryFromMeetingAction(meetingId: string): Promise<Result<{ id: string }>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: meeting } = await supabase
    .from("meeting_notes")
    .select("id, project_id, title, meeting_date, duration_actual_minutes, duration_planned_minutes, metadata")
    .eq("id", meetingId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!meeting) return { ok: false, error: "Réunion introuvable." };

  const metadata = (meeting.metadata as Record<string, unknown> | null) ?? {};
  if (metadata.time_entry_id) return { ok: false, error: "Une entrée de temps existe déjà pour cette réunion." };

  const durationMinutes = (meeting.duration_actual_minutes as number | null)
    ?? (meeting.duration_planned_minutes as number | null)
    ?? 60;

  const result = await createTimeEntryAction({
    projectId: meeting.project_id ?? undefined,
    description: `Réunion : ${meeting.title}`,
    durationMinutes,
    date: meeting.meeting_date,
    billable: true,
  });
  if (!result.ok) return result;

  await supabase
    .from("meeting_notes")
    .update({
      metadata: { ...metadata, time_entry_id: result.data.id },
      updated_at: new Date().toISOString(),
    })
    .eq("id", meetingId)
    .eq("workspace_id", workspaceId);

  revalidatePath(`/projects/${meeting.project_id}`);
  return { ok: true, data: { id: result.data.id } };
}

export async function deleteMeetingAction(meetingId: string): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: meeting } = await supabase
    .from("meeting_notes")
    .select("id, project_id")
    .eq("id", meetingId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!meeting) return { ok: false, error: "Réunion introuvable." };

  const { error } = await supabase
    .from("meeting_notes")
    .delete()
    .eq("id", meetingId)
    .eq("workspace_id", workspaceId);
  if (error) return { ok: false, error: dbError(error) };

  revalidatePath(`/projects/${meeting.project_id}`);
  return { ok: true, data: undefined };
}

export async function signMeetingPvAction(input: {
  meetingId: string;
  portalToken: string;
  signerName: string;
  svgData: string;
}): Promise<Result<void>> {
  const supabase = await createServiceClient();

  const { data: shareLink } = await supabase
    .from("share_links")
    .select("workspace_id, resource_id")
    .eq("token", input.portalToken)
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .single();
  if (!shareLink) return { ok: false, error: "Lien de portail invalide ou expiré." };

  const { data: meeting } = await supabase
    .from("meeting_notes")
    .select("id, pv_signed_at")
    .eq("id", input.meetingId)
    .eq("workspace_id", shareLink.workspace_id)
    .single();
  if (!meeting) return { ok: false, error: "Réunion introuvable." };
  if (meeting.pv_signed_at) return { ok: false, error: "Ce PV a déjà été signé." };

  const { error } = await supabase
    .from("meeting_notes")
    .update({
      pv_signed_at: new Date().toISOString(),
      pv_signer_name: input.signerName.trim(),
      pv_svg_data: input.svgData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.meetingId)
    .eq("workspace_id", shareLink.workspace_id);

  if (error) return { ok: false, error: dbError(error) };
  return { ok: true, data: undefined };
}

export async function createVoiceNoteDraftAction(input: z.input<typeof voiceNoteSchema>): Promise<Result<{ id: string }>> {
  const parsed = voiceNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { user, workspaceId } = context.data;

  if (parsed.data.projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", parsed.data.projectId)
      .eq("workspace_id", workspaceId)
      .single();
    if (!project) return { ok: false, error: "Projet introuvable." };
  }

  const firstLine = parsed.data.transcript.split("\n").find(Boolean)?.slice(0, 180) ?? parsed.data.title;
  const { data, error } = await supabase
    .from("voice_notes")
    .insert({
      workspace_id: workspaceId,
      project_id: parsed.data.projectId ?? null,
      created_by: user.id,
      title: parsed.data.title,
      transcript: parsed.data.transcript,
      status: "transcribed",
      task_payload: {
        title: firstLine,
        description: parsed.data.transcript,
        priority: "moyenne",
      },
      metadata: { transcription_provider: "manual_placeholder" },
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: dbError(error) };
  if (parsed.data.projectId) revalidatePath(`/projects/${parsed.data.projectId}`);
  return { ok: true, data: { id: data.id } };
}
