import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 60,
    color: "#1a1a1a",
    lineHeight: 1.6,
  },
  header: {
    marginBottom: 40,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  firmName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 4,
  },
  firmDetails: {
    fontSize: 9,
    color: "#6b7280",
    lineHeight: 1.5,
  },
  title: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#111827",
  },
  subtitle: {
    fontSize: 10,
    textAlign: "center",
    color: "#6b7280",
    marginBottom: 30,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    color: "#111827",
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#d1d5db",
  },
  sectionBody: {
    fontSize: 10,
    color: "#374151",
    lineHeight: 1.6,
  },
  disclaimer: {
    marginTop: 40,
    padding: 10,
    backgroundColor: "#fef3c7",
    borderRadius: 4,
    fontSize: 8,
    color: "#92400e",
  },
  signatureArea: {
    marginTop: 50,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBox: {
    width: "45%",
  },
  signatureLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 40,
    color: "#374151",
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#9ca3af",
    paddingTop: 4,
    fontSize: 8,
    color: "#9ca3af",
  },
});

interface ContractSection {
  heading: string;
  body: string;
}

interface ContractContent {
  title: string;
  sections: ContractSection[];
}

interface FirmProfile {
  firm_name?: string | null;
  architect_name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  ice?: string | null;
  rc?: string | null;
}

interface ContractPdfProps {
  content: ContractContent;
  firm: FirmProfile | null;
}

export function ContractPdf({ content, firm }: ContractPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Firm header */}
        <View style={styles.header}>
          <Text style={styles.firmName}>{firm?.firm_name ?? "Cabinet d'architecture"}</Text>
          <Text style={styles.firmDetails}>
            {firm?.architect_name ?? ""}
            {firm?.address ? `\n${firm.address}` : ""}
            {firm?.phone ? `  ·  Tél : ${firm.phone}` : ""}
            {firm?.email ? `  ·  ${firm.email}` : ""}
            {firm?.ice ? `\nICE : ${firm.ice}` : ""}
            {firm?.rc ? `  ·  RC : ${firm.rc}` : ""}
          </Text>
        </View>

        {/* Contract title */}
        <Text style={styles.title}>{content.title}</Text>

        {/* Sections */}
        {content.sections.map((section, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        {/* Signature area */}
        <View style={styles.signatureArea}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Le Maître d'ouvrage</Text>
            <Text style={styles.signatureLine}>Signature et cachet</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>L'Architecte</Text>
            <Text style={styles.signatureLine}>Signature et cachet</Text>
          </View>
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          Ce contrat a été généré par ArchiDesk (IA). Il doit être relu et validé par un juriste avant toute signature.
          Modèle basé sur les usages de la profession d'architecte au Maroc — Loi 016-89.
        </Text>
      </Page>
    </Document>
  );
}
