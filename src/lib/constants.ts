export const PHASE_LABELS: Record<string, string> = {
  esquisse: "Esquisse",
  aps: "APS",
  apd: "APD",
  pc: "PC",
  dce: "DCE",
  chantier: "Chantier",
  reception: "Réception",
  termine: "Terminé",
};

export const PHASE_COLORS: Record<string, string> = {
  esquisse: "bg-slate-100 text-slate-700",
  aps: "bg-blue-100 text-blue-700",
  apd: "bg-indigo-100 text-indigo-700",
  pc: "bg-purple-100 text-purple-700",
  dce: "bg-orange-100 text-orange-700",
  chantier: "bg-yellow-100 text-yellow-700",
  reception: "bg-green-100 text-green-700",
  termine: "bg-gray-100 text-gray-700",
};

export const PHASE_ORDER = [
  "esquisse",
  "aps",
  "apd",
  "pc",
  "dce",
  "chantier",
  "reception",
  "termine",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  actif: "Actif",
  en_attente: "En attente",
  suspendu: "Suspendu",
  termine: "Terminé",
  archive: "Archivé",
};

export const PHASE_DELIVERABLES: Record<string, string[]> = {
  esquisse: [
    "Esquisse architecturale",
    "Note de présentation",
    "Estimation sommaire",
  ],
  aps: [
    "Plans masse",
    "Plans de niveaux APS",
    "Coupes et façades APS",
    "Notice descriptive",
    "Estimation provisoire",
  ],
  apd: [
    "Plans détaillés APD",
    "CCTP (Cahier des Clauses Techniques Particulières)",
    "Estimation détaillée",
    "Dossier PC préparé",
  ],
  pc: [
    "Dossier permis de construire déposé",
    "Accusé de réception PC",
    "Permis de construire obtenu",
  ],
  dce: [
    "Plans d'exécution",
    "CCTP lot par lot",
    "Bordereau des prix unitaires",
    "Dossier consultation des entreprises",
  ],
  chantier: [
    "PV de démarrage de chantier",
    "Visites de chantier régulières",
    "PV de réception partielle",
    "Gestion des avenants",
  ],
  reception: [
    "PV de réception définitive",
    "Levée des réserves",
    "DOE (Dossier des ouvrages exécutés)",
    "Attestation de conformité",
  ],
  termine: [
    "Archivage complet du dossier",
    "Facture solde honoraires",
    "Retour d'expérience client",
  ],
};
