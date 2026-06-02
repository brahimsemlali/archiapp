import { z } from "zod";

const optionalUuid = z.preprocess(
  (value) => value === "" || value == null ? undefined : value,
  z.string().uuid().optional()
);

const optionalDate = z.preprocess(
  (value) => value === "" || value == null ? undefined : value,
  z.string().optional()
);

export const taskFormSchema = z.object({
  title: z.string().min(1, "Titre requis"),
  description: z.string().optional(),
  projectId: optionalUuid,
  clientId: optionalUuid,
  assignedTo: optionalUuid,
  dueDate: optionalDate,
  priority: z.enum(["haute", "moyenne", "basse"]).default("moyenne"),
  status: z.enum(["a_faire", "en_cours", "termine"]).default("a_faire"),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const taskUpdateSchema = taskFormSchema.partial();

export type TaskUpdateValues = z.infer<typeof taskUpdateSchema>;

export const PRIORITY_LABELS: Record<string, string> = {
  haute: "Haute",
  moyenne: "Moyenne",
  basse: "Basse",
};

export const PRIORITY_COLORS: Record<string, string> = {
  haute: "bg-red-100 text-red-700",
  moyenne: "bg-amber-100 text-amber-700",
  basse: "bg-slate-100 text-slate-600",
};

export const STATUS_LABELS: Record<string, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  termine: "Terminé",
};

export const STATUS_COLORS: Record<string, string> = {
  a_faire: "bg-slate-100 text-slate-600",
  en_cours: "bg-blue-100 text-blue-700",
  termine: "bg-green-100 text-green-700",
};
