import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { NormalizedImage } from "@/lib/pdf/moodboard-images";

// Warm, client-facing palette — matches the portal/portfolio surfaces (CLAUDE.md §8), not the cool app theme.
const COLORS = {
  bg: "#F7F6F3",
  ink: "#1C1917",
  muted: "#78716C",
  faint: "#A8A29E",
  border: "#E7E5E4",
  accent: "#2563EB",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  // Cover
  cover: { backgroundColor: COLORS.bg, paddingTop: 90, paddingBottom: 70, paddingHorizontal: 64, color: COLORS.ink },
  coverLogo: { width: 56, height: 56, objectFit: "contain", marginBottom: 40 },
  eyebrow: { fontSize: 10, fontFamily: "Helvetica-Bold", color: COLORS.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 },
  coverTitle: { fontSize: 34, fontFamily: "Helvetica-Bold", color: COLORS.ink, lineHeight: 1.15, marginBottom: 16 },
  coverRule: { width: 48, height: 3, backgroundColor: COLORS.accent, marginBottom: 20 },
  coverDesc: { fontSize: 12, color: COLORS.muted, lineHeight: 1.6, maxWidth: 380, marginBottom: 28 },
  coverMetaRow: { flexDirection: "row", marginBottom: 6 },
  coverMetaLabel: { fontSize: 9, color: COLORS.faint, textTransform: "uppercase", letterSpacing: 1, width: 90 },
  coverMetaValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: COLORS.ink },
  coverFooter: { position: "absolute", bottom: 50, left: 64, right: 64, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 14 },
  coverFooterText: { fontSize: 9, color: COLORS.muted },

  // Grid pages
  page: { backgroundColor: COLORS.bg, paddingTop: 44, paddingBottom: 54, paddingHorizontal: 40, color: COLORS.ink },
  pageHeader: { fontSize: 9, fontFamily: "Helvetica-Bold", color: COLORS.faint, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tile: { width: "48.5%", marginBottom: 18 },
  tileImage: { width: "100%", height: 210, objectFit: "cover", borderRadius: 6, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  tileCaption: { fontSize: 9, color: COLORS.ink, marginTop: 6, lineHeight: 1.4 },
  tileSource: { fontSize: 8, color: COLORS.faint, marginTop: 2 },

  footer: { position: "absolute", bottom: 26, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  footerText: { fontSize: 8, color: COLORS.faint },

  emptyState: { marginTop: 40, fontSize: 11, color: COLORS.muted, textAlign: "center" },

  notice: { marginTop: 28, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, fontSize: 8, color: COLORS.faint, lineHeight: 1.5, maxWidth: 360 },
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function hostOf(source: string): string | null {
  try {
    return new URL(source).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export interface MoodboardPdfProps {
  title: string;
  description?: string | null;
  clientName?: string | null;
  generatedAt: string;
  firm: {
    firm_name?: string | null;
    architect_name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  /** PNG data URI, normalized server-side (see normalizeLogo). Null → cover omits the logo entirely. */
  logoDataUri?: string | null;
  images: NormalizedImage[];
  /** references that couldn't be fetched/decoded and are absent from this document */
  failedCount?: number;
}

export function MoodboardPdf({ title, description, clientName, generatedAt, firm, logoDataUri, images, failedCount = 0 }: MoodboardPdfProps) {
  const firmName = firm?.firm_name ?? "Cabinet d'architecture";
  const contact = [firm?.phone, firm?.email].filter(Boolean).join("  ·  ");

  return (
    <Document title={title} author={firmName}>
      {/* Cover */}
      <Page size="A4" style={styles.cover}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        {logoDataUri ? <Image src={logoDataUri} style={styles.coverLogo} /> : null}
        <Text style={styles.eyebrow}>Planche d&apos;inspiration</Text>
        <Text style={styles.coverTitle}>{title}</Text>
        <View style={styles.coverRule} />
        {description ? <Text style={styles.coverDesc}>{description}</Text> : null}

        {clientName ? (
          <View style={styles.coverMetaRow}>
            <Text style={styles.coverMetaLabel}>Client</Text>
            <Text style={styles.coverMetaValue}>{clientName}</Text>
          </View>
        ) : null}
        <View style={styles.coverMetaRow}>
          <Text style={styles.coverMetaLabel}>Date</Text>
          <Text style={styles.coverMetaValue}>{formatDate(generatedAt)}</Text>
        </View>
        <View style={styles.coverMetaRow}>
          <Text style={styles.coverMetaLabel}>Références</Text>
          <Text style={styles.coverMetaValue}>{images.length}</Text>
        </View>

        {failedCount > 0 ? (
          <Text style={styles.notice}>
            {failedCount} référence{failedCount > 1 ? "s" : ""} n&apos;{failedCount > 1 ? "ont" : "a"} pas pu être chargée
            {failedCount > 1 ? "s" : ""} (lien source indisponible) et {failedCount > 1 ? "ne figurent" : "ne figure"} pas dans
            ce document.
          </Text>
        ) : null}

        <View style={styles.coverFooter}>
          <Text style={styles.coverFooterText}>{firmName}</Text>
          {contact ? <Text style={styles.coverFooterText}>{contact}</Text> : <Text />}
        </View>
      </Page>

      {/* Images */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.pageHeader} fixed>
          {title}
        </Text>

        {images.length > 0 ? (
          <View style={styles.grid}>
            {images.map((img) => {
              const host = img.source ? hostOf(img.source) : null;
              return (
                <View key={img.id} style={styles.tile} wrap={false}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image src={img.dataUri} style={styles.tileImage} />
                  {img.caption ? <Text style={styles.tileCaption}>{img.caption}</Text> : null}
                  {host ? <Text style={styles.tileSource}>{host}</Text> : null}
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyState}>Aucune image n&apos;a pu être chargée pour cette planche.</Text>
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{firmName}</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
