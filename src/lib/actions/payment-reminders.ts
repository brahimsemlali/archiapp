"use server";

import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceRole } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import { sendEmail } from "@/lib/email/send";
import { paymentReminderEmail, APP_URL } from "@/lib/email/templates";
import { formatMoney, formatDate } from "@/lib/format";
import { resolveLocalization } from "@/lib/country-packs";
import { differenceInDays, parseISO } from "date-fns";
import { dbError } from "@/lib/db-error";

export async function sendPaymentReminderAction(
  factureId: string,
  opts: { channel: "email" | "sms" | "whatsapp"; recipient: string; message: string }
): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  // Verify facture belongs to workspace
  const { data: facture } = await supabase
    .from("factures")
    .select("id, number, title, total_centimes, due_date, status, client_id, clients!factures_client_id_fkey(email, phone, name)")
    .eq("id", factureId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!facture) return { ok: false, error: "Facture introuvable." };
  if (facture.status === "payee") return { ok: false, error: "Facture déjà payée." };

  const { data: firm } = await supabase
    .from("firm_profile")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const { data: shareLink } = await supabase
    .from("share_links")
    .select("token")
    .eq("workspace_id", workspaceId)
    .eq("resource_type", "client")
    .eq("resource_id", facture.client_id)
    .is("expires_at", null)
    .maybeSingle();

  const clientRow = Array.isArray(facture.clients) ? facture.clients[0] : facture.clients;
  const portalUrl = shareLink
    ? `${APP_URL}/portal/client/${shareLink.token}`
    : `${APP_URL}/factures/${factureId}`;

  if (opts.channel === "email") {
    const factureFull = facture as typeof facture & { due_date?: string | null };
    const daysOverdue = factureFull.due_date
      ? differenceInDays(new Date(), parseISO(factureFull.due_date))
      : 0;

    const tpl = paymentReminderEmail({
      firmName: firm?.firm_name ?? "Votre architecte",
      clientName: clientRow?.name ?? "Client",
      factureNumber: facture.number ?? factureId,
      totalTTC: formatMoney(facture.total_centimes ?? 0, resolveLocalization(firm).currency),
      dueDate: factureFull.due_date ? formatDate(factureFull.due_date) : "—",
      daysOverdue: Math.max(0, daysOverdue),
      portalUrl,
    });

    await sendEmail({
      workspaceId,
      to: clientRow?.email ?? opts.recipient,
      subject: tpl.subject,
      html: tpl.html,
      eventType: "facture.reminder_sent",
      resourceType: "facture",
      resourceId: factureId,
    });
  }

  const { error } = await supabase.from("payment_reminders").insert({
    workspace_id: workspaceId,
    facture_id: factureId,
    channel: opts.channel,
    recipient: opts.recipient,
    message: opts.message,
    status: "sent",
  });

  if (error) return { ok: false, error: dbError(error) };

  // Log activity
  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    action: "facture.reminder_sent",
    metadata: { factureId, number: facture.number, channel: opts.channel, recipient: opts.recipient },
  });

  revalidatePath(`/factures/${factureId}`);
  return { ok: true, data: undefined };
}

export async function getFactureRemindersAction(factureId: string): Promise<Result<Array<{
  id: string; sent_at: string; channel: string; recipient: string; message: string; status: string;
}>>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data, error } = await supabase
    .from("payment_reminders")
    .select("id, sent_at, channel, recipient, message, status")
    .eq("facture_id", factureId)
    .eq("workspace_id", workspaceId)
    .order("sent_at", { ascending: false });

  if (error) return { ok: false, error: dbError(error) };
  return { ok: true, data: data ?? [] };
}
