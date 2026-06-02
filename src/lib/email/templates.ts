const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeTextBlock(value: string | number | null | undefined): string {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

function safeHref(href: string): string {
  try {
    const url = new URL(href, APP_URL);
    if (url.protocol !== "http:" && url.protocol !== "https:") return escapeHtml(APP_URL);
    return escapeHtml(url.href);
  } catch {
    return escapeHtml(APP_URL);
  }
}

function layout(body: string, firmName?: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>ArchiDesk</title>
</head>
<body style="margin:0;padding:0;background:#F7F6F3;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1e293b;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F6F3;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;max-width:600px;width:100%;">
      <tr>
        <td style="background:#1e3a8a;padding:20px 32px;">
          <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">${escapeHtml(firmName ?? "ArchiDesk")}</p>
        </td>
      </tr>
      <tr><td style="padding:32px;">${body}</td></tr>
      <tr>
        <td style="padding:20px 32px;border-top:1px solid #f1f5f9;background:#f8fafc;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Ce message a été envoyé via ArchiDesk — la plateforme de gestion pour architectes.</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function btn(label: string, href: string): string {
  return `<a href="${safeHref(href)}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#1e3a8a;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">${escapeHtml(label)}</a>`;
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#1e293b;">${escapeHtml(text)}</h1>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475569;">${text}</p>`;
}

function detail(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;font-size:13px;color:#64748b;width:140px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:8px 0;font-size:13px;color:#1e293b;font-weight:500;">${escapeHtml(value)}</td>
  </tr>`;
}

function detailTable(rows: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;width:100%;background:#f8fafc;">
    <tbody style="padding:12px 16px;display:block;">${rows}</tbody>
  </table>`;
}

// --- Templates ---

export function devisSentEmail(opts: {
  firmName: string;
  clientName: string;
  devisNumber: string;
  devisTitle: string;
  totalTTC: string;
  validUntil: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const subject = `Devis ${opts.devisNumber} — ${opts.firmName}`;
  const body =
    h1(`Votre devis est disponible`) +
    p(`Bonjour ${escapeHtml(opts.clientName)},`) +
    p(`Veuillez trouver ci-dessous le devis que ${escapeHtml(opts.firmName)} vous a transmis. Vous pouvez le consulter, l'accepter ou le refuser depuis votre espace client.`) +
    detailTable(
      detail("Référence", opts.devisNumber) +
      detail("Objet", opts.devisTitle) +
      detail("Montant TTC", opts.totalTTC) +
      detail("Valide jusqu'au", opts.validUntil)
    ) +
    btn("Consulter le devis", opts.portalUrl);
  return { subject, html: layout(body, opts.firmName) };
}

export function factureSentEmail(opts: {
  firmName: string;
  clientName: string;
  factureNumber: string;
  factureTitle: string;
  totalTTC: string;
  dueDate: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const subject = `Facture ${opts.factureNumber} — ${opts.firmName}`;
  const body =
    h1(`Votre facture est disponible`) +
    p(`Bonjour ${escapeHtml(opts.clientName)},`) +
    p(`Veuillez trouver ci-dessous votre facture émise par ${escapeHtml(opts.firmName)}.`) +
    detailTable(
      detail("Référence", opts.factureNumber) +
      detail("Objet", opts.factureTitle) +
      detail("Montant TTC", opts.totalTTC) +
      detail("Échéance", opts.dueDate)
    ) +
    btn("Consulter la facture", opts.portalUrl);
  return { subject, html: layout(body, opts.firmName) };
}

export function contractSignedEmail(opts: {
  firmName: string;
  architectEmail: string;
  clientName: string;
  contractTitle: string;
  signerName: string;
  signedAt: string;
  contractUrl: string;
}): { subject: string; html: string } {
  const subject = `Contrat signé — ${opts.contractTitle}`;
  const body =
    h1("Un contrat vient d'être signé") +
    p(`Le contrat <strong>${escapeHtml(opts.contractTitle)}</strong> a été signé électroniquement par le client.`) +
    detailTable(
      detail("Client", opts.clientName) +
      detail("Signé par", opts.signerName) +
      detail("Date", opts.signedAt)
    ) +
    btn("Voir le contrat", opts.contractUrl);
  return { subject, html: layout(body, opts.firmName) };
}

export function portalMessageEmail(opts: {
  firmName: string;
  architectEmail: string;
  senderName: string;
  messageBody: string;
  replyUrl: string;
  context: string;
}): { subject: string; html: string } {
  const subject = `Nouveau message de ${opts.senderName} — ArchiDesk`;
  const body =
    h1("Nouveau message client") +
    p(`<strong>${escapeHtml(opts.senderName)}</strong> vous a envoyé un message via le portail client (${escapeHtml(opts.context)}).`) +
    `<blockquote style="margin:20px 0;padding:16px;background:#f8fafc;border-left:3px solid #1e3a8a;border-radius:0 8px 8px 0;font-size:14px;color:#334155;font-style:italic;">${escapeTextBlock(opts.messageBody)}</blockquote>` +
    btn("Répondre", opts.replyUrl);
  return { subject, html: layout(body, opts.firmName) };
}

export function paymentReminderEmail(opts: {
  firmName: string;
  clientName: string;
  factureNumber: string;
  totalTTC: string;
  dueDate: string;
  daysOverdue: number;
  portalUrl: string;
}): { subject: string; html: string } {
  const subject = `Rappel de paiement — Facture ${opts.factureNumber}`;
  const overdueNote = opts.daysOverdue > 0
    ? `<p style="margin:12px 0;padding:12px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-size:13px;color:#dc2626;font-weight:500;">Cette facture est en retard de ${escapeHtml(opts.daysOverdue)} jour(s).</p>`
    : "";
  const body =
    h1("Rappel de paiement") +
    p(`Bonjour ${escapeHtml(opts.clientName)},`) +
    p(`Nous vous rappelons qu'une facture est en attente de règlement.`) +
    overdueNote +
    detailTable(
      detail("Référence", opts.factureNumber) +
      detail("Montant TTC", opts.totalTTC) +
      detail("Échéance", opts.dueDate)
    ) +
    btn("Consulter la facture", opts.portalUrl);
  return { subject, html: layout(body, opts.firmName) };
}

export function welcomeEmail(opts: {
  architectName?: string;
  appUrl: string;
}): { subject: string; html: string } {
  const name = opts.architectName ?? "Architecte";
  const subject = "Bienvenue sur ArchiDesk — votre cabinet démarre ici";
  const body =
    h1(`Bienvenue sur ArchiDesk, ${name} !`) +
    p("Votre espace est prêt. Vous disposez de <strong>14 jours d'essai gratuit</strong> incluant toutes les fonctionnalités Studio AI.") +
    p("Voici ce que vous pouvez faire dès maintenant :") +
    `<ul style="margin:12px 0 20px;padding-left:20px;font-size:14px;color:#475569;line-height:2;">
      <li>Créer votre premier <strong>projet</strong> et y ajouter un client</li>
      <li>Générer un <strong>contrat IA</strong> ancré dans la loi 016-89</li>
      <li>Établir un <strong>devis</strong> et l'envoyer au client</li>
      <li>Partager un <strong>portail client</strong> sécurisé</li>
    </ul>` +
    btn("Accéder à mon espace", `${opts.appUrl}/dashboard`);
  return { subject, html: layout(body, "ArchiDesk") };
}

export function inviteEmail(opts: {
  inviterName: string;
  workspaceName: string;
  role: string;
  inviteUrl: string;
}): { subject: string; html: string } {
  const roleLabels: Record<string, string> = {
    admin: "Administrateur",
    member: "Membre",
    viewer: "Observateur",
  };
  const roleLabel = roleLabels[opts.role] ?? opts.role;
  const subject = `Invitation à rejoindre ${opts.workspaceName} sur ArchiDesk`;
  const body =
    h1(`Vous êtes invité(e) à rejoindre ${opts.workspaceName}`) +
    p(`<strong>${escapeHtml(opts.inviterName)}</strong> vous invite à collaborer sur l'espace de travail <strong>${escapeHtml(opts.workspaceName)}</strong> en tant que <strong>${escapeHtml(roleLabel)}</strong>.`) +
    p("Cliquez sur le bouton ci-dessous pour accepter l'invitation et configurer votre accès.") +
    btn("Accepter l'invitation", opts.inviteUrl) +
    `<p style="margin:20px 0 0;font-size:12px;color:#94a3b8;">Ce lien est valable 7 jours. Si vous n'attendiez pas cette invitation, ignorez ce message.</p>`;
  return { subject, html: layout(body, opts.workspaceName) };
}

export function passwordResetEmail(opts: {
  resetUrl: string;
}): { subject: string; html: string } {
  const subject = "Réinitialiser votre mot de passe ArchiDesk";
  const body =
    h1("Réinitialiser votre mot de passe") +
    p("Vous avez demandé à réinitialiser le mot de passe de votre compte ArchiDesk. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.") +
    btn("Réinitialiser le mot de passe", opts.resetUrl) +
    `<p style="margin:20px 0 0;font-size:12px;color:#94a3b8;">Ce lien expire dans 1 heure. Si vous n'avez pas effectué cette demande, ignorez ce message — votre compte reste sécurisé.</p>`;
  return { subject, html: layout(body, "ArchiDesk") };
}

export function architectReplyEmail(opts: {
  firmName: string;
  clientName: string;
  messageBody: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const subject = `Message de ${opts.firmName}`;
  const body =
    h1(`Message de ${opts.firmName}`) +
    p(`Bonjour ${escapeHtml(opts.clientName)},`) +
    p(`Votre architecte vous a envoyé un message via votre espace client.`) +
    `<blockquote style="margin:20px 0;padding:16px;background:#f8fafc;border-left:3px solid #1e3a8a;border-radius:0 8px 8px 0;font-size:14px;color:#334155;font-style:italic;">${escapeTextBlock(opts.messageBody)}</blockquote>` +
    btn("Voir votre espace client", opts.portalUrl);
  return { subject, html: layout(body, opts.firmName) };
}

export { APP_URL };
