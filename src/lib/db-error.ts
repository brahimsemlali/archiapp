/**
 * Maps Supabase/Postgres errors to safe user-facing messages.
 * Never expose raw SQL or RLS policy names to clients.
 */
export function dbError(err: { message?: string; code?: string }): string {
  const code = err.code ?? "";
  const msg = err.message ?? "";

  // Unique constraint violation
  if (code === "23505") return "Cette entrée existe déjà.";
  // Foreign key violation
  if (code === "23503") return "Référence invalide ou introuvable.";
  // Not null / check constraint
  if (code === "23502" || code === "23514") return "Données manquantes ou invalides.";
  // Invalid date/time input
  if (code === "22007" || code === "22008") return "Date invalide.";
  // RLS violation
  if (code === "42501" || msg.includes("row-level security")) return "Accès non autorisé.";
  // Insufficient privilege
  if (code === "42000") return "Accès non autorisé.";
  // Readonly transaction
  if (code === "25006") return "Opération non autorisée en lecture seule.";

  return "Une erreur est survenue. Réessayez.";
}
