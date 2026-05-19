"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireWorkspaceAccountActive, requireWorkspaceRole } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import crypto from "crypto";
import { assertStorageAvailable } from "@/lib/billing/guards";
import { buildSafeStorageFilename, validateDocumentUpload } from "@/lib/storage/upload-validation";
import { sendEmail } from "@/lib/email/send";
import { portalMessageEmail, architectReplyEmail, APP_URL } from "@/lib/email/templates";
import { notifyWorkspace } from "@/lib/push";

const STORAGE_BUCKET = "project-files";
const MAX_PORTAL_MESSAGE_LENGTH = 2_000;
const MAX_PORTAL_SENDER_LENGTH = 120;
const MAX_PORTAL_NOTE_LENGTH = 500;

type ProjectShareLink = {
  workspace_id: string;
  resource_id: string;
};

async function getValidProjectShareLink(token: string) {
  const supabase = await createServiceClient();
  const { data: shareLink } = await supabase
    .from("share_links")
    .select("*")
    .eq("token", token)
    .eq("resource_type", "project")
    .single();

  if (!shareLink) return { supabase, shareLink: null, error: "Lien introuvable." };
  if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
    return { supabase, shareLink: null, error: "Lien expiré." };
  }
  const workspaceStatus = await requireWorkspaceAccountActive(supabase, shareLink.workspace_id);
  if (!workspaceStatus.ok) {
    return { supabase, shareLink: null, error: workspaceStatus.error };
  }

  return { supabase, shareLink, error: null };
}

async function assertPortalRateLimit(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  shareLink: ProjectShareLink,
  action: string,
  maxActions: number,
  windowSeconds: number
): Promise<Result<void>> {
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const { count, error } = await supabase
    .from("activity_log")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", shareLink.workspace_id)
    .eq("project_id", shareLink.resource_id)
    .eq("action", action)
    .gte("created_at", since);

  if (error) return { ok: false, error: error.message };
  if ((count ?? 0) >= maxActions) {
    return { ok: false, error: "Trop de tentatives. Réessayez dans quelques minutes." };
  }

  return { ok: true, data: undefined };
}

export async function createProjectPortalLinkAction(
  projectId: string,
  expiresInDays: number | null = 30
): Promise<Result<{ token: string; url: string }>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  // Check project belongs to workspace
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!project) return { ok: false, error: "Projet introuvable." };

  // Revoke any existing project portal link
  await supabase
    .from("share_links")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("resource_type", "project")
    .eq("resource_id", projectId);

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await supabase.from("share_links").insert({
    workspace_id: workspaceId,
    resource_type: "project",
    resource_id: projectId,
    token,
    expires_at: expiresAt,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, data: { token, url: `${APP_URL}/portal/${token}` } };
}

export async function revokeProjectPortalLinkAction(
  projectId: string
): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  await supabase
    .from("share_links")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("resource_type", "project")
    .eq("resource_id", projectId);

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, data: undefined };
}

export async function respondPortalDevisAction(
  token: string,
  devisId: string,
  status: "accepte" | "refuse"
): Promise<Result<void>> {
  const { supabase, shareLink, error: linkError } = await getValidProjectShareLink(token);
  if (!shareLink) return { ok: false, error: linkError ?? "Lien invalide." };
  const rateLimit = await assertPortalRateLimit(supabase, shareLink, "devis.portal_response_attempt", 8, 60 * 60);
  if (!rateLimit.ok) return rateLimit;

  const { data: devis } = await supabase
    .from("devis")
    .select("id, number, title, status, valid_until, metadata")
    .eq("id", devisId)
    .eq("workspace_id", shareLink.workspace_id)
    .eq("project_id", shareLink.resource_id)
    .single();

  if (!devis) return { ok: false, error: "Devis introuvable." };
  if (devis.status !== "envoye") return { ok: false, error: "Ce devis ne peut plus être modifié depuis le portail." };
  if (devis.valid_until && new Date(devis.valid_until) < new Date()) {
    await supabase
      .from("devis")
      .update({ status: "expire", updated_at: new Date().toISOString() })
      .eq("id", devis.id)
      .eq("workspace_id", shareLink.workspace_id);
    return { ok: false, error: "Ce devis a expiré." };
  }

  const respondedAt = new Date().toISOString();
  const { error } = await supabase
    .from("devis")
    .update({
      status,
      updated_at: respondedAt,
      metadata: {
        ...((devis.metadata as Record<string, unknown> | null) ?? {}),
        portal_response: {
          status,
          responded_at: respondedAt,
          share_token: token,
        },
      },
    })
    .eq("id", devisId)
    .eq("workspace_id", shareLink.workspace_id);

  if (error) return { ok: false, error: error.message };

  await supabase.from("activity_log").insert({
    workspace_id: shareLink.workspace_id,
    project_id: shareLink.resource_id,
    action: "devis.portal_response_attempt",
    metadata: { share_token: token, devisId, number: devis.number, title: devis.title, status },
  });

  // Notify workspace: client responded to devis
  await notifyWorkspace(supabase, shareLink.workspace_id, {
    title: status === "accepte" ? "Devis accepté ✓" : "Devis refusé",
    body: `${devis.number} — ${devis.title}`,
    href: `/devis/${devisId}`,
  });

  revalidatePath(`/portal/${token}`);
  return { ok: true, data: undefined };
}

export async function createPortalMessageAction(
  token: string,
  input: { senderName?: string; body: string }
): Promise<Result<void>> {
  const { supabase, shareLink, error: linkError } = await getValidProjectShareLink(token);
  if (!shareLink) return { ok: false, error: linkError ?? "Lien invalide." };
  const rateLimit = await assertPortalRateLimit(supabase, shareLink, "portal.message_created", 20, 10 * 60);
  if (!rateLimit.ok) return rateLimit;

  const body = input.body.trim();
  if (!body) return { ok: false, error: "Message vide." };
  if (body.length > MAX_PORTAL_MESSAGE_LENGTH) {
    return { ok: false, error: `Message trop long (${MAX_PORTAL_MESSAGE_LENGTH} caractères max).` };
  }

  const senderName = input.senderName?.trim() || null;
  if (senderName && senderName.length > MAX_PORTAL_SENDER_LENGTH) {
    return { ok: false, error: `Nom trop long (${MAX_PORTAL_SENDER_LENGTH} caractères max).` };
  }

  const { error } = await supabase.from("portal_messages").insert({
    workspace_id: shareLink.workspace_id,
    project_id: shareLink.resource_id,
    share_token: token,
    sender: "client",
    sender_name: senderName,
    body,
  });

  if (error) return { ok: false, error: error.message };

  await supabase.from("activity_log").insert({
    workspace_id: shareLink.workspace_id,
    project_id: shareLink.resource_id,
    action: "portal.message_created",
    metadata: { sender: "client", share_token: token },
  });

  // Notify architect
  const { data: firm } = await supabase
    .from("firm_profile")
    .select("firm_name, email")
    .eq("workspace_id", shareLink.workspace_id)
    .maybeSingle();

  if (firm?.email) {
    const { data: project } = await supabase
      .from("projects")
      .select("title")
      .eq("id", shareLink.resource_id)
      .maybeSingle();

    const tpl = portalMessageEmail({
      firmName: firm.firm_name ?? "ArchiDesk",
      architectEmail: firm.email,
      senderName: senderName ?? "Un client",
      messageBody: body,
      replyUrl: `${APP_URL}/projects/${shareLink.resource_id}`,
      context: project?.title ?? "portail projet",
    });

    await sendEmail({
      workspaceId: shareLink.workspace_id,
      to: firm.email,
      subject: tpl.subject,
      html: tpl.html,
      eventType: "portal.message_created",
      resourceType: "project",
      resourceId: shareLink.resource_id,
    });
  }

  // Push notification to workspace
  await notifyWorkspace(supabase, shareLink.workspace_id, {
    title: "Message client reçu",
    body: senderName ? `${senderName} : ${body.slice(0, 80)}` : body.slice(0, 80),
    href: `/projects/${shareLink.resource_id}`,
  });

  revalidatePath(`/portal/${token}`);
  return { ok: true, data: undefined };
}

export async function uploadPortalDocumentAction(
  token: string,
  formData: FormData
): Promise<Result<void>> {
  const { supabase, shareLink, error: linkError } = await getValidProjectShareLink(token);
  if (!shareLink) return { ok: false, error: linkError ?? "Lien invalide." };
  const rateLimit = await assertPortalRateLimit(supabase, shareLink, "portal.document_uploaded", 10, 10 * 60);
  if (!rateLimit.ok) return rateLimit;

  const file = formData.get("file") as File | null;
  const note = (formData.get("note") as string | null)?.trim() || null;
  if (!file) return { ok: false, error: "Aucun fichier." };
  const fileValidation = validateDocumentUpload(file, 25 * 1024 * 1024);
  if (!fileValidation.ok) return fileValidation;
  if (note && note.length > MAX_PORTAL_NOTE_LENGTH) {
    return { ok: false, error: `Note trop longue (${MAX_PORTAL_NOTE_LENGTH} caractères max).` };
  }
  const storageCheck = await assertStorageAvailable(supabase, shareLink.workspace_id, file.size);
  if (!storageCheck.ok) return storageCheck;

  const safeName = buildSafeStorageFilename(file.name, fileValidation.data.extension);
  const storagePath = `${shareLink.workspace_id}/portal-uploads/${shareLink.resource_id}/${Date.now()}-${safeName}`;
  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, { contentType: fileValidation.data.contentType, upsert: false });

  if (uploadError) return { ok: false, error: uploadError.message };

  const { error } = await supabase.from("files").insert({
    workspace_id: shareLink.workspace_id,
    project_id: shareLink.resource_id,
    folder: "Documents client",
    filename: file.name,
    storage_path: storagePath,
    size_bytes: file.size,
    mime_type: fileValidation.data.contentType,
    note,
    approval_status: "approved",
    metadata: { source: "client_portal", share_token: token },
  });

  if (error) return { ok: false, error: error.message };

  await supabase.from("activity_log").insert({
    workspace_id: shareLink.workspace_id,
    project_id: shareLink.resource_id,
    action: "portal.document_uploaded",
    metadata: { filename: file.name, size_bytes: file.size, share_token: token },
  });

  revalidatePath(`/portal/${token}`);
  return { ok: true, data: undefined };
}

// ─── Client portal ────────────────────────────────────────────────────────────

async function getValidClientShareLink(token: string) {
  const supabase = await createServiceClient();
  const { data: shareLink } = await supabase
    .from("share_links")
    .select("*")
    .eq("token", token)
    .eq("resource_type", "client")
    .single();

  if (!shareLink) return { supabase, shareLink: null, error: "Lien introuvable." };
  if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
    return { supabase, shareLink: null, error: "Lien expiré." };
  }
  const workspaceStatus = await requireWorkspaceAccountActive(supabase, shareLink.workspace_id);
  if (!workspaceStatus.ok) {
    return { supabase, shareLink: null, error: workspaceStatus.error };
  }
  return { supabase, shareLink, error: null };
}

export async function createClientPortalLinkAction(
  clientId: string
): Promise<Result<{ token: string; url: string }>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!client) return { ok: false, error: "Client introuvable." };

  const serviceSupabase = await createServiceClient();
  // Expire any existing active link (keeps history)
  await serviceSupabase
    .from("share_links")
    .update({ expires_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("resource_type", "client")
    .eq("resource_id", clientId)
    .is("expires_at", null);

  const token = crypto.randomBytes(24).toString("hex");
  const { error } = await serviceSupabase.from("share_links").insert({
    workspace_id: workspaceId,
    resource_type: "client",
    resource_id: clientId,
    token,
    expires_at: null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clients/${clientId}`);
  return { ok: true, data: { token, url: `${APP_URL}/portal/client/${token}` } };
}

export async function revokeClientPortalLinkAction(
  clientId: string
): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const serviceSupabase = await createServiceClient();
  await serviceSupabase
    .from("share_links")
    .update({ expires_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("resource_type", "client")
    .eq("resource_id", clientId)
    .is("expires_at", null);

  revalidatePath(`/clients/${clientId}`);
  return { ok: true, data: undefined };
}

export async function respondClientPortalDevisAction(
  token: string,
  devisId: string,
  status: "accepte" | "refuse"
): Promise<Result<void>> {
  const { supabase, shareLink, error: linkError } = await getValidClientShareLink(token);
  if (!shareLink) return { ok: false, error: linkError ?? "Lien invalide." };

  const { data: devis } = await supabase
    .from("devis")
    .select("id, number, title, status, valid_until, project_id, metadata")
    .eq("id", devisId)
    .eq("workspace_id", shareLink.workspace_id)
    .eq("client_id", shareLink.resource_id)
    .single();

  if (!devis) return { ok: false, error: "Devis introuvable." };
  if (devis.status !== "envoye") return { ok: false, error: "Ce devis ne peut plus être modifié depuis le portail." };
  if (devis.valid_until && new Date(devis.valid_until) < new Date()) {
    await supabase.from("devis").update({ status: "expire" }).eq("id", devis.id).eq("workspace_id", shareLink.workspace_id);
    return { ok: false, error: "Ce devis a expiré." };
  }

  const respondedAt = new Date().toISOString();
  const { error } = await supabase
    .from("devis")
    .update({
      status,
      updated_at: respondedAt,
      metadata: {
        ...((devis.metadata as Record<string, unknown> | null) ?? {}),
        portal_response: { status, responded_at: respondedAt, share_token: token },
      },
    })
    .eq("id", devisId)
    .eq("workspace_id", shareLink.workspace_id);

  if (error) return { ok: false, error: error.message };

  await supabase.from("activity_log").insert({
    workspace_id: shareLink.workspace_id,
    project_id: devis.project_id,
    client_id: shareLink.resource_id,
    action: "devis.portal_response_attempt",
    metadata: { share_token: token, devisId, number: devis.number, title: devis.title, status },
  });

  // Push notification to workspace
  await notifyWorkspace(supabase, shareLink.workspace_id, {
    title: status === "accepte" ? "Devis accepté ✓" : "Devis refusé",
    body: `${devis.number} — ${devis.title}`,
    href: `/devis/${devisId}`,
  });

  revalidatePath(`/portal/client/${token}`);
  return { ok: true, data: undefined };
}

export async function createClientPortalMessageAction(
  token: string,
  input: { senderName?: string; body: string }
): Promise<Result<void>> {
  const { supabase, shareLink, error: linkError } = await getValidClientShareLink(token);
  if (!shareLink) return { ok: false, error: linkError ?? "Lien invalide." };

  const body = input.body.trim();
  if (!body) return { ok: false, error: "Message vide." };
  if (body.length > MAX_PORTAL_MESSAGE_LENGTH) {
    return { ok: false, error: `Message trop long (${MAX_PORTAL_MESSAGE_LENGTH} caractères max).` };
  }

  const senderName = input.senderName?.trim() || null;
  if (senderName && senderName.length > MAX_PORTAL_SENDER_LENGTH) {
    return { ok: false, error: `Nom trop long (${MAX_PORTAL_SENDER_LENGTH} caractères max).` };
  }

  const { error } = await supabase.from("portal_messages").insert({
    workspace_id: shareLink.workspace_id,
    client_id: shareLink.resource_id,
    project_id: null,
    share_token: token,
    sender: "client",
    sender_name: senderName,
    body,
  });

  if (error) return { ok: false, error: error.message };

  await supabase.from("activity_log").insert({
    workspace_id: shareLink.workspace_id,
    client_id: shareLink.resource_id,
    action: "portal.message_created",
    metadata: { sender: "client", share_token: token },
  });

  // Notify architect
  const { data: firm } = await supabase
    .from("firm_profile")
    .select("firm_name, email")
    .eq("workspace_id", shareLink.workspace_id)
    .maybeSingle();

  if (firm?.email) {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("name")
      .eq("id", shareLink.resource_id)
      .maybeSingle();

    const tpl = portalMessageEmail({
      firmName: firm.firm_name ?? "ArchiDesk",
      architectEmail: firm.email,
      senderName: senderName ?? clientRow?.name ?? "Un client",
      messageBody: body,
      replyUrl: `${APP_URL}/clients/${shareLink.resource_id}`,
      context: clientRow?.name ?? "portail client",
    });

    await sendEmail({
      workspaceId: shareLink.workspace_id,
      to: firm.email,
      subject: tpl.subject,
      html: tpl.html,
      eventType: "portal.message_created",
      resourceType: "client",
      resourceId: shareLink.resource_id,
    });
  }

  // Push notification to workspace
  await notifyWorkspace(supabase, shareLink.workspace_id, {
    title: "Message client reçu",
    body: senderName ? `${senderName} : ${body.slice(0, 80)}` : body.slice(0, 80),
    href: `/clients/${shareLink.resource_id}`,
  });

  revalidatePath(`/portal/client/${token}`);
  return { ok: true, data: undefined };
}

export async function replyToClientPortalAction(
  clientId: string,
  body: string
): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Message vide." };
  if (trimmed.length > MAX_PORTAL_MESSAGE_LENGTH) {
    return { ok: false, error: `Message trop long (${MAX_PORTAL_MESSAGE_LENGTH} caractères max).` };
  }

  const serviceSupabase = await createServiceClient();
  const { data: shareLink } = await serviceSupabase
    .from("share_links")
    .select("token")
    .eq("workspace_id", workspaceId)
    .eq("resource_type", "client")
    .eq("resource_id", clientId)
    .is("expires_at", null)
    .single();

  if (!shareLink) return { ok: false, error: "Aucun portail actif pour ce client." };

  const { error } = await serviceSupabase.from("portal_messages").insert({
    workspace_id: workspaceId,
    client_id: clientId,
    project_id: null,
    share_token: shareLink.token,
    sender: "architect",
    sender_name: null,
    body: trimmed,
  });

  if (error) return { ok: false, error: error.message };

  // Notify client by email if they have an email address
  const [{ data: clientRow }, { data: firmRow }] = await Promise.all([
    serviceSupabase.from("clients").select("name, email").eq("id", clientId).single(),
    serviceSupabase.from("firm_profile").select("firm_name").eq("workspace_id", workspaceId).single(),
  ]);
  if (clientRow?.email) {
    const { subject, html } = architectReplyEmail({
      firmName: firmRow?.firm_name ?? "Votre architecte",
      clientName: clientRow.name,
      messageBody: trimmed,
      portalUrl: `${APP_URL}/portal/client/${shareLink.token}#discussion`,
    });
    await sendEmail({ to: clientRow.email, subject, html, eventType: "architect_reply", workspaceId, resourceType: "client", resourceId: clientId });
  }

  revalidatePath(`/clients/${clientId}`);
  return { ok: true, data: undefined };
}

export async function respondPortalFileApprovalAction(
  token: string,
  fileId: string,
  status: "approved" | "rejected",
  note?: string
): Promise<Result<void>> {
  const { supabase, shareLink, error: linkError } = await getValidProjectShareLink(token);
  if (!shareLink) return { ok: false, error: linkError ?? "Lien invalide." };
  const rateLimit = await assertPortalRateLimit(supabase, shareLink, "file.portal_approval_attempt", 20, 60 * 60);
  if (!rateLimit.ok) return rateLimit;

  const approvalNote = note?.trim() || null;
  if (approvalNote && approvalNote.length > MAX_PORTAL_NOTE_LENGTH) {
    return { ok: false, error: `Note trop longue (${MAX_PORTAL_NOTE_LENGTH} caractères max).` };
  }

  const { data: file } = await supabase
    .from("files")
    .select("id, filename, approval_status, metadata")
    .eq("id", fileId)
    .eq("workspace_id", shareLink.workspace_id)
    .eq("project_id", shareLink.resource_id)
    .single();

  if (!file) return { ok: false, error: "Fichier introuvable." };
  if (file.approval_status !== "pending") return { ok: false, error: "Ce fichier n'attend pas d'approbation." };

  const respondedAt = new Date().toISOString();
  const { error } = await supabase
    .from("files")
    .update({
      approval_status: status,
      approved_at: respondedAt,
      approval_note: approvalNote,
      metadata: {
        ...((file.metadata as Record<string, unknown> | null) ?? {}),
        portal_approval: {
          status,
          responded_at: respondedAt,
          share_token: token,
          note: approvalNote,
        },
      },
      updated_at: respondedAt,
    })
    .eq("id", fileId)
    .eq("workspace_id", shareLink.workspace_id);

  if (error) return { ok: false, error: error.message };

  await supabase.from("activity_log").insert({
    workspace_id: shareLink.workspace_id,
    project_id: shareLink.resource_id,
    action: "file.portal_approval_attempt",
    metadata: { share_token: token, fileId, filename: file.filename, status },
  });

  revalidatePath(`/portal/${token}`);
  return { ok: true, data: undefined };
}

export async function respondClientPortalFileApprovalAction(
  token: string,
  fileId: string,
  status: "approved" | "rejected",
  note?: string
): Promise<Result<void>> {
  const { supabase, shareLink, error: linkError } = await getValidClientShareLink(token);
  if (!shareLink) return { ok: false, error: linkError ?? "Lien invalide." };

  const approvalNote = note?.trim() || null;
  if (approvalNote && approvalNote.length > MAX_PORTAL_NOTE_LENGTH) {
    return { ok: false, error: `Note trop longue (${MAX_PORTAL_NOTE_LENGTH} caractères max).` };
  }

  const { data: file } = await supabase
    .from("files")
    .select("id, filename, approval_status, project_id, metadata")
    .eq("id", fileId)
    .eq("workspace_id", shareLink.workspace_id)
    .single();

  if (!file) return { ok: false, error: "Fichier introuvable." };

  // Verify the file belongs to a project owned by this client
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", file.project_id)
    .eq("client_id", shareLink.resource_id)
    .eq("workspace_id", shareLink.workspace_id)
    .single();
  if (!project) return { ok: false, error: "Accès non autorisé." };
  if (file.approval_status !== "pending") return { ok: false, error: "Ce fichier n'attend pas d'approbation." };

  const respondedAt = new Date().toISOString();
  const { error } = await supabase
    .from("files")
    .update({
      approval_status: status,
      approved_at: respondedAt,
      approval_note: approvalNote,
      metadata: {
        ...((file.metadata as Record<string, unknown> | null) ?? {}),
        portal_approval: { status, responded_at: respondedAt, share_token: token, note: approvalNote },
      },
      updated_at: respondedAt,
    })
    .eq("id", fileId)
    .eq("workspace_id", shareLink.workspace_id);

  if (error) return { ok: false, error: error.message };

  await supabase.from("activity_log").insert({
    workspace_id: shareLink.workspace_id,
    project_id: file.project_id,
    client_id: shareLink.resource_id,
    action: "file.portal_approval_attempt",
    metadata: { share_token: token, fileId, filename: file.filename, status },
  });

  revalidatePath(`/portal/client/${token}`);
  return { ok: true, data: undefined };
}
