"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { passwordResetEmail, welcomeEmail } from "@/lib/email/templates";
import type { Result } from "@/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function requestPasswordResetAction(email: string): Promise<Result<void>> {
  if (!email || !email.includes("@")) return { ok: false, error: "Email invalide." };

  const supabase = await createServiceClient();

  // Generate the reset link using the admin API so we control the email
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email: email.trim().toLowerCase(),
    options: {
      redirectTo: `${APP_URL}/auth/callback?next=/update-password`,
    },
  });

  // Always return success to avoid email enumeration
  if (!error && data?.properties?.action_link) {
    const tmpl = passwordResetEmail({ resetUrl: data.properties.action_link });
    await sendEmail({
      to: email.trim().toLowerCase(),
      subject: tmpl.subject,
      html: tmpl.html,
      eventType: "password_reset",
      resourceType: "user",
    });
  }

  return { ok: true, data: undefined };
}

export async function sendWelcomeEmailAction(
  email: string,
  architectName?: string,
  workspaceId?: string
): Promise<void> {
  const tmpl = welcomeEmail({ architectName, appUrl: APP_URL });
  await sendEmail({
    to: email,
    subject: tmpl.subject,
    html: tmpl.html,
    workspaceId,
    eventType: "welcome",
    resourceType: "user",
  });
}
