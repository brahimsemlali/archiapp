"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireActiveWorkspace, requireWorkspaceAccountActive } from "@/lib/workspace";
import type { Result } from "@/types";
import { sendEmail } from "@/lib/email/send";
import { contractSignedEmail, APP_URL } from "@/lib/email/templates";
import { formatDate } from "@/lib/format";
import { dbError } from "@/lib/db-error";

const MAX_SIGNER_NAME_LENGTH = 120;
const MAX_SIGNER_EMAIL_LENGTH = 254;
const MAX_SIGNATURE_SVG_LENGTH = 500_000;

export async function saveSignatureAction(input: {
  contractId: string;
  portalToken: string;
  signerName: string;
  signerEmail?: string;
  svgData: string;
  ipAddress?: string;
}): Promise<Result<{ id: string }>> {
  const supabase = await createServiceClient();
  const signerName = input.signerName.trim();
  const signerEmail = input.signerEmail?.trim() || null;
  const svgData = input.svgData.trim();

  if (!signerName) return { ok: false, error: "Nom du signataire requis." };
  if (signerName.length > MAX_SIGNER_NAME_LENGTH) {
    return { ok: false, error: `Nom trop long (${MAX_SIGNER_NAME_LENGTH} caractères max).` };
  }
  if (signerEmail && signerEmail.length > MAX_SIGNER_EMAIL_LENGTH) {
    return { ok: false, error: `Email trop long (${MAX_SIGNER_EMAIL_LENGTH} caractères max).` };
  }
  if (!svgData.startsWith("<svg") || svgData.length > MAX_SIGNATURE_SVG_LENGTH) {
    return { ok: false, error: "Signature invalide ou trop volumineuse." };
  }

  const { data: shareLink } = await supabase
    .from("share_links")
    .select("workspace_id, resource_id, resource_type, expires_at")
    .eq("token", input.portalToken)
    .in("resource_type", ["project", "client"])
    .single();

  if (!shareLink) return { ok: false, error: "Lien portail invalide." };
  if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
    return { ok: false, error: "Lien portail expiré." };
  }
  const workspaceStatus = await requireWorkspaceAccountActive(supabase, shareLink.workspace_id);
  if (!workspaceStatus.ok) return { ok: false, error: workspaceStatus.error };

  const isClientPortal = shareLink.resource_type === "client";

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  let rateLimitQuery = supabase
    .from("activity_log")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", shareLink.workspace_id)
    .eq("action", "signature.portal_created")
    .gte("created_at", since);
  rateLimitQuery = isClientPortal
    ? rateLimitQuery.eq("client_id", shareLink.resource_id)
    : rateLimitQuery.eq("project_id", shareLink.resource_id);
  const { count, error: rateLimitError } = await rateLimitQuery;

  if (rateLimitError) return { ok: false, error: rateLimitError.message };
  if ((count ?? 0) >= 8) {
    return { ok: false, error: "Trop de signatures récentes. Réessayez dans quelques minutes." };
  }

  let contractQuery = supabase
    .from("contracts")
    .select("id, title, status, workspace_id, project_id")
    .eq("id", input.contractId)
    .eq("workspace_id", shareLink.workspace_id);
  contractQuery = isClientPortal
    ? contractQuery.eq("client_id", shareLink.resource_id)
    : contractQuery.eq("project_id", shareLink.resource_id);
  const { data: contract } = await contractQuery.single();

  if (!contract) return { ok: false, error: "Contrat introuvable." };
  if (contract.status !== "finalise") {
    return { ok: false, error: "Seuls les contrats finalisés peuvent être signés depuis le portail." };
  }

  // Check not already signed
  const { data: existing } = await supabase
    .from("signatures")
    .select("id")
    .eq("contract_id", input.contractId)
    .maybeSingle();

  if (existing) return { ok: false, error: "Ce contrat a déjà été signé." };

  const { data, error } = await supabase
    .from("signatures")
    .insert({
      contract_id: input.contractId,
      signer_name: signerName,
      signer_email: signerEmail,
      svg_data: svgData,
      ip_address: input.ipAddress ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: dbError(error) };
  await supabase.from("activity_log").insert({
    workspace_id: shareLink.workspace_id,
    project_id: isClientPortal ? contract.project_id : shareLink.resource_id,
    client_id: isClientPortal ? shareLink.resource_id : null,
    action: "signature.portal_created",
    metadata: { contractId: input.contractId, title: contract.title },
  });

  // Notify architect by email
  const { data: firm } = await supabase
    .from("firm_profile")
    .select("firm_name, email")
    .eq("workspace_id", shareLink.workspace_id)
    .maybeSingle();

  if (firm?.email) {
    const { data: clientRow } = isClientPortal
      ? await supabase.from("clients").select("name").eq("id", shareLink.resource_id).maybeSingle()
      : { data: null };

    const tpl = contractSignedEmail({
      firmName: firm.firm_name ?? "ArchiDesk",
      architectEmail: firm.email,
      clientName: clientRow?.name ?? input.signerName,
      contractTitle: contract.title,
      signerName: input.signerName,
      signedAt: formatDate(new Date().toISOString()),
      contractUrl: `${APP_URL}/contracts/${input.contractId}`,
    });

    await sendEmail({
      workspaceId: shareLink.workspace_id,
      to: firm.email,
      subject: tpl.subject,
      html: tpl.html,
      eventType: "contract.signed",
      resourceType: "contract",
      resourceId: input.contractId,
    });
  }

  return { ok: true, data: { id: data.id } };
}

export async function getContractSignatureAction(contractId: string): Promise<Result<{ id: string; signer_name: string; signed_at: string } | null>> {
  const authSupabase = await createClient();
  const workspace = await requireActiveWorkspace(authSupabase);
  if (!workspace.ok) return { ok: false, error: workspace.error };
  const { workspaceId } = workspace.data;

  const supabase = await createServiceClient();
  const { data: contract } = await supabase
    .from("contracts")
    .select("id")
    .eq("id", contractId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!contract) return { ok: false, error: "Contrat introuvable." };

  const { data } = await supabase
    .from("signatures")
    .select("id, signer_name, signed_at")
    .eq("contract_id", contractId)
    .maybeSingle();

  return { ok: true, data: data ?? null };
}
