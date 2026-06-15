// Single source of truth for client-portal sections + per-client sharing config.
// Used by BOTH the portal page (src/app/portal/client/[token]/page.tsx) and the
// architect sharing UI (Portail tab) so keys/labels never drift.
//
// Sharing config lives in clients.metadata.portal (no migration; survives link
// regeneration). Visibility resolves with a fallback to DEFAULT_VISIBILITY so
// existing portals need no backfill.

export const PORTAL_SECTION_KEYS = [
  "projets",
  "avancement",
  "chantier",
  "blocages",
  "temps",
  "contrats",
  "devis",
  "factures",
  "documents",
  "notes",
  "inspirations",
  "historique",
  "discussion",
  "contact",
] as const;

export type PortalSectionKey = (typeof PORTAL_SECTION_KEYS)[number];

export type PortalSectionGroup = "suivi" | "documents" | "echanges";

export interface PortalSectionDef {
  key: PortalSectionKey;
  /** Label shown in the architect toggle list. */
  label: string;
  /** One-line helper under the toggle. */
  description: string;
  group: PortalSectionGroup;
  /** Smart default: safe sections ON, sensitive ones OFF. */
  defaultVisible: boolean;
}

export const PORTAL_GROUPS: { id: PortalSectionGroup; label: string }[] = [
  { id: "suivi", label: "Suivi du projet" },
  { id: "documents", label: "Documents & finances" },
  { id: "echanges", label: "Échanges & infos" },
];

export const PORTAL_SECTIONS: PortalSectionDef[] = [
  { key: "projets", label: "Projets", description: "Liste des projets et leur phase.", group: "suivi", defaultVisible: true },
  { key: "avancement", label: "Avancement & jalons", description: "Progression globale, livrables de la phase, échéance.", group: "suivi", defaultVisible: true },
  { key: "chantier", label: "Comptes-rendus & visites", description: "PV de réunion et visites de chantier.", group: "suivi", defaultVisible: true },
  { key: "blocages", label: "Chantier & blocages", description: "Points ouverts et blocages sur le chantier.", group: "suivi", defaultVisible: false },
  { key: "temps", label: "Temps passé", description: "Heures travaillées par projet (transparence sur l'effort).", group: "suivi", defaultVisible: false },
  { key: "contrats", label: "Contrats", description: "Contrats à lire et signer.", group: "documents", defaultVisible: true },
  { key: "devis", label: "Devis", description: "Devis à consulter et accepter.", group: "documents", defaultVisible: true },
  { key: "factures", label: "Factures", description: "Factures et coordonnées de paiement.", group: "documents", defaultVisible: true },
  { key: "documents", label: "Documents partagés", description: "Plans, rendus et documents à approuver.", group: "documents", defaultVisible: true },
  { key: "notes", label: "Notes & mises à jour", description: "Messages courts que vous publiez pour le client.", group: "echanges", defaultVisible: false },
  { key: "inspirations", label: "Inspirations", description: "Moodboards liés au client.", group: "echanges", defaultVisible: true },
  { key: "historique", label: "Historique", description: "Chronologie de la collaboration.", group: "echanges", defaultVisible: true },
  { key: "discussion", label: "Discussion", description: "Messagerie avec le client.", group: "echanges", defaultVisible: true },
  { key: "contact", label: "Contact", description: "Vos coordonnées de cabinet.", group: "echanges", defaultVisible: true },
];

export const DEFAULT_VISIBILITY = Object.fromEntries(
  PORTAL_SECTIONS.map((s) => [s.key, s.defaultVisible])
) as Record<PortalSectionKey, boolean>;

export interface PortalUpdate {
  id: string;
  body: string;
  createdAt: string;
  authorName: string | null;
}

export interface PortalMeta {
  visibility?: Partial<Record<PortalSectionKey, boolean>>;
  updates?: PortalUpdate[];
}

/** Safely extract the `portal` block from a client's `metadata` jsonb. */
export function getPortalMeta(metadata: unknown): PortalMeta {
  if (metadata && typeof metadata === "object" && "portal" in metadata) {
    const portal = (metadata as { portal?: unknown }).portal;
    if (portal && typeof portal === "object") return portal as PortalMeta;
  }
  return {};
}

/** Resolve every section's visibility, falling back to smart defaults. */
export function resolveVisibility(metadata: unknown): Record<PortalSectionKey, boolean> {
  const vis = getPortalMeta(metadata).visibility ?? {};
  const out = {} as Record<PortalSectionKey, boolean>;
  for (const key of PORTAL_SECTION_KEYS) {
    out[key] = vis[key] ?? DEFAULT_VISIBILITY[key];
  }
  return out;
}

/** Architect-posted client updates, newest first. */
export function getPortalUpdates(metadata: unknown): PortalUpdate[] {
  const updates = getPortalMeta(metadata).updates;
  if (!Array.isArray(updates)) return [];
  return [...updates].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
