import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const MEETING_TYPE_LABELS: Record<string, string> = {
  reunion_client: "Réunion client",
  revue_conception: "Revue de conception",
  reunion_chantier: "Réunion de chantier",
  reunion_fournisseur: "Réunion fournisseur",
  kick_off: "Réunion de lancement",
  reception: "Réunion de réception",
};

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, paddingTop: 50, paddingBottom: 60, paddingHorizontal: 50, color: "#1a1a1a", lineHeight: 1.5 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  firmName: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#111827", marginBottom: 3 },
  firmDetails: { fontSize: 9, color: "#6b7280", lineHeight: 1.6 },
  docBadge: { backgroundColor: "#111827", color: "#ffffff", fontSize: 10, fontFamily: "Helvetica-Bold", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 3, marginBottom: 5, textAlign: "center" },
  docTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "right", color: "#111827" },
  docMeta: { fontSize: 9, color: "#6b7280", textAlign: "right", marginTop: 2 },
  metaGrid: { flexDirection: "row", gap: 12, marginBottom: 20, flexWrap: "wrap" },
  metaBox: { backgroundColor: "#f9fafb", borderRadius: 5, padding: 10, flex: 1, minWidth: 120 },
  metaLabel: { fontSize: 8, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 },
  metaValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111827" },
  metaValueSmall: { fontSize: 9, color: "#374151" },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#111827", marginBottom: 8, paddingBottom: 5, borderBottomWidth: 0.5, borderBottomColor: "#d1d5db" },
  section: { marginBottom: 18 },
  summaryText: { fontSize: 10, color: "#374151", lineHeight: 1.7 },
  decisionRow: { flexDirection: "row", gap: 8, marginBottom: 5, alignItems: "flex-start" },
  decisionNum: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1d4ed8", width: 18, flexShrink: 0 },
  decisionText: { fontSize: 10, color: "#374151", flex: 1, lineHeight: 1.5 },
  riskRow: { flexDirection: "row", gap: 8, marginBottom: 5, alignItems: "flex-start" },
  riskDot: { fontSize: 10, color: "#dc2626", width: 12, flexShrink: 0 },
  riskText: { fontSize: 10, color: "#374151", flex: 1, lineHeight: 1.5 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f3f4f6", paddingHorizontal: 8, paddingVertical: 6, borderRadius: 3, marginBottom: 2 },
  tableHeaderText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#374151" },
  tableRow: { flexDirection: "row", paddingHorizontal: 8, paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: "#f3f4f6" },
  tableCell: { fontSize: 9, color: "#374151", lineHeight: 1.4 },
  signaturesRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 36, gap: 20 },
  signatureBox: { flex: 1 },
  signatureLabel: { fontSize: 8, color: "#9ca3af", marginBottom: 8 },
  signatureImage: { width: "100%", height: 60, objectFit: "contain", marginBottom: 4, border: "0.5 solid #e5e7eb" },
  signatureLine: { borderTopWidth: 0.5, borderTopColor: "#d1d5db", borderTopStyle: "dashed", paddingTop: 4 },
  signatureName: { fontSize: 8, color: "#374151", fontFamily: "Helvetica-Bold" },
  signatureDate: { fontSize: 8, color: "#9ca3af" },
  footer: { position: "absolute", bottom: 28, left: 50, right: 50, textAlign: "center", fontSize: 8, color: "#d1d5db" },
  aiDisclaimer: { marginTop: 16, padding: 8, backgroundColor: "#eff6ff", borderRadius: 3, fontSize: 8, color: "#1e40af" },
  attendeeChips: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  attendeeChip: { backgroundColor: "#f3f4f6", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, fontSize: 9, color: "#374151" },
});

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export interface MeetingPdfProps {
  meeting: {
    id: string;
    title: string;
    meeting_date: string;
    meeting_type: string;
    attendees: string[];
    duration_planned_minutes: number | null;
    duration_actual_minutes: number | null;
    raw_notes: string | null;
    summary: string | null;
    decisions: string[];
    risks: string[];
    extracted_tasks: Array<{ title: string; assigneeHint?: string; dueDate?: string; priority: string }>;
    ai_generated: boolean;
    pv_signed_at: string | null;
    pv_signer_name: string | null;
    pv_svg_data: string | null;
  };
  project: { title: string; address?: string | null } | null;
  firm: {
    firm_name?: string | null;
    architect_name?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    ice?: string | null;
    logo_url?: string | null;
  } | null;
}

export function MeetingPdf({ meeting, project, firm }: MeetingPdfProps) {
  const typeLabel = MEETING_TYPE_LABELS[meeting.meeting_type] ?? meeting.meeting_type;
  const duration = meeting.duration_actual_minutes ?? meeting.duration_planned_minutes;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {firm?.logo_url && <Image src={firm.logo_url} style={{ width: 44, height: 44, objectFit: "contain", marginBottom: 5 }} />}
            <Text style={styles.firmName}>{firm?.firm_name ?? "Cabinet d'architecture"}</Text>
            {firm?.architect_name && <Text style={styles.firmDetails}>{firm.architect_name}</Text>}
            {firm?.address && <Text style={styles.firmDetails}>{firm.address}</Text>}
            {firm?.phone && <Text style={styles.firmDetails}>{firm.phone}</Text>}
            {firm?.email && <Text style={styles.firmDetails}>{firm.email}</Text>}
          </View>
          <View>
            <Text style={styles.docBadge}>COMPTE-RENDU DE RÉUNION</Text>
            <Text style={styles.docTitle}>{meeting.title}</Text>
            <Text style={styles.docMeta}>Date : {formatDate(meeting.meeting_date)}</Text>
            <Text style={styles.docMeta}>Type : {typeLabel}</Text>
            {project && <Text style={styles.docMeta}>Projet : {project.title}</Text>}
          </View>
        </View>

        {/* Meta grid */}
        <View style={styles.metaGrid}>
          {meeting.attendees.length > 0 && (
            <View style={[styles.metaBox, { flex: 2 }]}>
              <Text style={styles.metaLabel}>Participants</Text>
              <View style={styles.attendeeChips}>
                {meeting.attendees.map((a, i) => (
                  <View key={i} style={styles.attendeeChip}><Text>{a}</Text></View>
                ))}
              </View>
            </View>
          )}
          {duration && (
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Durée</Text>
              <Text style={styles.metaValue}>{formatDuration(duration)}</Text>
              {meeting.duration_actual_minutes && meeting.duration_planned_minutes &&
                meeting.duration_actual_minutes !== meeting.duration_planned_minutes && (
                  <Text style={styles.metaValueSmall}>Prévue : {formatDuration(meeting.duration_planned_minutes)}</Text>
                )}
            </View>
          )}
          {project?.address && (
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Lieu / Projet</Text>
              <Text style={styles.metaValueSmall}>{project.address}</Text>
            </View>
          )}
        </View>

        {/* Summary */}
        {meeting.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Résumé</Text>
            <Text style={styles.summaryText}>{meeting.summary}</Text>
          </View>
        )}

        {/* Raw notes (if no AI summary) */}
        {!meeting.summary && meeting.raw_notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes de réunion</Text>
            <Text style={styles.summaryText}>{meeting.raw_notes}</Text>
          </View>
        )}

        {/* Decisions */}
        {meeting.decisions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Décisions prises</Text>
            {meeting.decisions.map((d, i) => (
              <View key={i} style={styles.decisionRow}>
                <Text style={styles.decisionNum}>{i + 1}.</Text>
                <Text style={styles.decisionText}>{d}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Risks */}
        {meeting.risks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Points de vigilance</Text>
            {meeting.risks.map((r, i) => (
              <View key={i} style={styles.riskRow}>
                <Text style={styles.riskDot}>▲</Text>
                <Text style={styles.riskText}>{r}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action items */}
        {meeting.extracted_tasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions à mener</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 3 }]}>Action</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Responsable</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Échéance</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Priorité</Text>
            </View>
            {meeting.extracted_tasks.map((task, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 3 }]}>{task.title}</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{task.assigneeHint ?? "—"}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{task.dueDate ? formatDate(task.dueDate) : "—"}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{task.priority}</Text>
              </View>
            ))}
          </View>
        )}

        {/* AI disclaimer */}
        {meeting.ai_generated && (
          <View style={styles.aiDisclaimer}>
            <Text>Ce résumé a été généré par intelligence artificielle (ArchiDesk AI). Vérifiez les informations avant diffusion.</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={styles.signaturesRow}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Signature de l'architecte</Text>
            {firm?.architect_name ? (
              <>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureName}>{firm.architect_name}</Text>
              </>
            ) : (
              <View style={[styles.signatureLine, { marginTop: 40 }]} />
            )}
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Signature du client / maître d'ouvrage</Text>
            {meeting.pv_svg_data ? (
              <>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image
                  src={`data:image/svg+xml;base64,${Buffer.from(meeting.pv_svg_data).toString("base64")}`}
                  style={styles.signatureImage}
                />
                <Text style={styles.signatureName}>{meeting.pv_signer_name}</Text>
                {meeting.pv_signed_at && (
                  <Text style={styles.signatureDate}>
                    Signé le {new Date(meeting.pv_signed_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </Text>
                )}
              </>
            ) : (
              <View style={[styles.signatureLine, { marginTop: 40 }]} />
            )}
          </View>
        </View>

        <Text style={styles.footer}>
          {firm?.firm_name ?? "ArchiDesk"} — Compte-rendu généré le {new Date().toLocaleDateString("fr-FR")}
        </Text>
      </Page>
    </Document>
  );
}
