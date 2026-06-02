"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { resend, FROM_EMAIL, isEmailDeliverable } from "./client";

interface SendEmailOptions {
  workspaceId?: string;
  to: string | null | undefined;
  subject: string;
  html: string;
  eventType: string;
  resourceType?: string;
  resourceId?: string;
}

async function logEmail(opts: SendEmailOptions, status: string, providerId?: string, error?: string): Promise<void> {
  try {
    const supabase = await createServiceClient();
    await supabase.from("email_log").insert({
      workspace_id: opts.workspaceId ?? null,
      event_type: opts.eventType,
      recipient_email: opts.to ?? null,
      subject: opts.subject,
      resource_type: opts.resourceType ?? null,
      resource_id: opts.resourceId ?? null,
      provider: "resend",
      provider_message_id: providerId ?? null,
      status,
      error: error ?? null,
    });
  } catch {
    // logging failure must never bubble up
  }
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  if (!opts.to || !opts.to.includes("@")) return;

  // No verified sending domain yet → record intent, don't blast sandbox mail.
  // Flips on automatically once RESEND_FROM_EMAIL points at a verified domain.
  if (!isEmailDeliverable()) {
    await logEmail(opts, "skipped", undefined, "email disabled: no verified RESEND_FROM_EMAIL domain configured");
    return;
  }

  let providerId: string | undefined;
  let status = "sent";
  let error: string | undefined;

  try {
    const { data, error: resendError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    if (resendError) {
      status = "error";
      error = resendError.message;
    } else {
      providerId = data?.id;
    }
  } catch (e) {
    status = "error";
    error = e instanceof Error ? e.message : String(e);
  }

  await logEmail(opts, status, providerId, error);
}
