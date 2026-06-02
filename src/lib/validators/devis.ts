import { z } from "zod";

const emptyStringToUndefined = (value: unknown) => value === "" ? undefined : value;
const optionalUuid = z.preprocess(emptyStringToUndefined, z.string().uuid().optional());
const optionalDate = z.preprocess(
  emptyStringToUndefined,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide").optional()
);

export const devisItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, "Description requise"),
  quantity: z.number().min(0.01, "Quantité invalide"),
  unit: z.string().min(1).default("forfait"),
  unitPriceCentimes: z.number().min(0, "Prix invalide"),
});

export const devisFormSchema = z.object({
  title: z.string().min(1, "Titre requis"),
  clientId: z.string().uuid("Client requis"),
  projectId: optionalUuid,
  items: z.array(devisItemSchema).min(1, "Ajoutez au moins une ligne"),
  tvaRate: z.number().min(0).max(100).default(20),
  notes: z.string().optional(),
  validUntil: optionalDate,
});

export type DevisFormValues = z.infer<typeof devisFormSchema>;
export type DevisItem = z.infer<typeof devisItemSchema>;
