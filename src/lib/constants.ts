// Phase, status and deliverable LABELS are i18n (messages: `phase`, `status.project`,
// `phaseDeliverables`) — see worldwide.md W3. DB keys (esquisse…termine) stay stable here
// as PHASE_ORDER; only labels localize. PHASE_COLORS is presentation, not translatable.

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

