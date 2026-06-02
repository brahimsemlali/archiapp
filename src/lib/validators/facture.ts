import { z } from "zod";
import { devisItemSchema } from "./devis";

const emptyStringToUndefined = (value: unknown) => value === "" ? undefined : value;
const optionalUuid = z.preprocess(emptyStringToUndefined, z.string().uuid().optional());
const optionalDate = z.preprocess(
  emptyStringToUndefined,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide").optional()
);

export const factureFormSchema = z.object({
  title: z.string().min(1, "Titre requis"),
  clientId: z.string().uuid("Client requis"),
  projectId: optionalUuid,
  devisId: optionalUuid,
  items: z.array(devisItemSchema).min(1, "Ajoutez au moins une ligne"),
  tvaRate: z.number().min(0).max(100).default(20),
  notes: z.string().optional(),
  dueDate: optionalDate,
});

export type FactureFormValues = z.infer<typeof factureFormSchema>;
