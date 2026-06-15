import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { DevisItem } from "@/lib/validators/devis";
import { formatMoney } from "@/lib/format";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, paddingTop: 50, paddingBottom: 50, paddingHorizontal: 50, color: "#1a1a1a", lineHeight: 1.5 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 32, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  firmName: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#111827", marginBottom: 4 },
  firmDetails: { fontSize: 9, color: "#6b7280", lineHeight: 1.6 },
  docBadge: { backgroundColor: "#111827", color: "#ffffff", fontSize: 11, fontFamily: "Helvetica-Bold", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4, marginBottom: 6, textAlign: "center" },
  docNumber: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "right" },
  docMeta: { fontSize: 9, color: "#6b7280", textAlign: "right", marginTop: 2 },
  recipientBox: { backgroundColor: "#f9fafb", borderRadius: 6, padding: 12, marginBottom: 20, alignSelf: "flex-start", minWidth: 160 },
  recipientLabel: { fontSize: 8, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  recipientName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#111827" },
  recipientDetail: { fontSize: 9, color: "#6b7280", marginTop: 2 },
  projectRef: { fontSize: 9, color: "#6b7280", marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#111827", marginBottom: 12, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f3f4f6", paddingHorizontal: 8, paddingVertical: 6, borderRadius: 4, marginBottom: 2 },
  tableHeaderText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#374151" },
  tableRow: { flexDirection: "row", paddingHorizontal: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  tableCell: { fontSize: 9, color: "#374151" },
  totalsContainer: { flexDirection: "row", justifyContent: "flex-end", marginTop: 16 },
  totalsBox: { width: 200 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  totalLabel: { fontSize: 9, color: "#6b7280" },
  totalValue: { fontSize: 9, color: "#374151" },
  grandTotal: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderTopWidth: 1, borderTopColor: "#e5e7eb", marginTop: 4 },
  grandTotalLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#111827" },
  grandTotalValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#1d4ed8" },
  notes: { marginTop: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  notesLabel: { fontSize: 8, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  notesText: { fontSize: 9, color: "#6b7280", lineHeight: 1.6 },
  signaturesRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 40 },
  signatureBox: { width: "45%" },
  signatureLabel: { fontSize: 8, color: "#9ca3af", marginBottom: 24 },
  signatureLine: { borderTopWidth: 1, borderTopColor: "#d1d5db", borderTopStyle: "dashed", paddingTop: 4 },
  signatureName: { fontSize: 8, color: "#9ca3af" },
  footer: { position: "absolute", bottom: 30, left: 50, right: 50, textAlign: "center", fontSize: 8, color: "#d1d5db" },
});

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

interface DevisTemplateProps {
  devis: { number: string; title: string; items: DevisItem[]; subtotalCentimes: number; tvaRate: number; tvaCentimes: number; totalCentimes: number; notes?: string | null; validUntil?: string | null; createdAt: string };
  client: { name: string; address?: string | null; ice?: string | null; cin?: string | null } | null;
  project: { title: string } | null;
  firm: { firm_name?: string | null; architect_name?: string | null; address?: string | null; phone?: string | null; email?: string | null; ice?: string | null; logo_url?: string | null } | null;
  currency?: string;
  taxLabel?: string;
}

export function DevisPdf({ devis, client, project, firm, currency = "MAD", taxLabel = "TVA" }: DevisTemplateProps) {
  const money = (centimes: number) => formatMoney(centimes, currency);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {firm?.logo_url && <Image src={firm.logo_url} style={{ width: 48, height: 48, objectFit: "contain", marginBottom: 6 }} />}
            <Text style={styles.firmName}>{firm?.firm_name ?? "Cabinet d'architecture"}</Text>
            {firm?.architect_name && <Text style={styles.firmDetails}>{firm.architect_name}</Text>}
            {firm?.address && <Text style={styles.firmDetails}>{firm.address}</Text>}
            {firm?.ice && <Text style={styles.firmDetails}>ICE : {firm.ice}</Text>}
            {firm?.phone && <Text style={styles.firmDetails}>{firm.phone}</Text>}
            {firm?.email && <Text style={styles.firmDetails}>{firm.email}</Text>}
          </View>
          <View>
            <Text style={styles.docBadge}>DEVIS</Text>
            <Text style={styles.docNumber}>{devis.number}</Text>
            <Text style={styles.docMeta}>Date : {formatDate(devis.createdAt)}</Text>
            {devis.validUntil && <Text style={styles.docMeta}>Valable jusqu'au : {formatDate(devis.validUntil)}</Text>}
          </View>
        </View>

        {/* Client */}
        {client && (
          <View style={styles.recipientBox}>
            <Text style={styles.recipientLabel}>Destinataire</Text>
            <Text style={styles.recipientName}>{client.name}</Text>
            {client.address && <Text style={styles.recipientDetail}>{client.address}</Text>}
            {client.ice && <Text style={styles.recipientDetail}>ICE : {client.ice}</Text>}
            {client.cin && <Text style={styles.recipientDetail}>CIN : {client.cin}</Text>}
          </View>
        )}

        {project && <Text style={styles.projectRef}>Réf. projet : {project.title}</Text>}

        {/* Title */}
        <Text style={styles.sectionTitle}>{devis.title}</Text>

        {/* Items table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { flex: 4 }]}>Description</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "center" }]}>Qté</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "center" }]}>Unité</Text>
          <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: "right" }]}>P.U. HT</Text>
          <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: "right" }]}>Total HT</Text>
        </View>
        {devis.items.map((item) => (
          <View key={item.id} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 4 }]}>{item.description}</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: "center" }]}>{item.quantity}</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: "center", color: "#9ca3af" }]}>{item.unit}</Text>
            <Text style={[styles.tableCell, { flex: 1.5, textAlign: "right" }]}>{money(item.unitPriceCentimes)}</Text>
            <Text style={[styles.tableCell, { flex: 1.5, textAlign: "right", fontFamily: "Helvetica-Bold" }]}>
              {money(Math.round(item.quantity * item.unitPriceCentimes))}
            </Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Sous-total HT</Text>
              <Text style={styles.totalValue}>{money(devis.subtotalCentimes)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{taxLabel} {devis.tvaRate}%</Text>
              <Text style={styles.totalValue}>{money(devis.tvaCentimes)}</Text>
            </View>
            <View style={styles.grandTotal}>
              <Text style={styles.grandTotalLabel}>Total TTC</Text>
              <Text style={styles.grandTotalValue}>{money(devis.totalCentimes)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {devis.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Conditions</Text>
            <Text style={styles.notesText}>{devis.notes}</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={styles.signaturesRow}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Cachet et signature de l'architecte</Text>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureName}>{firm?.architect_name ?? ""}</Text>
            </View>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Bon pour accord — Signature du client</Text>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureName}>{client?.name ?? ""}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>{firm?.firm_name} · {firm?.address}</Text>
      </Page>
    </Document>
  );
}
