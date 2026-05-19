export type Result<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E; code?: "upgrade_required" | "trial_expired" | string };

export type ProjectPhase =
  | "esquisse"
  | "aps"
  | "apd"
  | "pc"
  | "dce"
  | "chantier"
  | "reception"
  | "termine";

export type ProjectStatus =
  | "actif"
  | "en_attente"
  | "suspendu"
  | "termine"
  | "archive";

export type ClientType = "particulier" | "societe";

export type ContractType =
  | "mission_complete"
  | "mission_partielle"
  | "etude_faisabilite"
  | "suivi_chantier"
  | "autre";

export type ContractStatus = "brouillon" | "finalise" | "archive";
