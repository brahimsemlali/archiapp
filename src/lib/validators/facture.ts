import { z } from "zod";
import { devisItemSchema } from "./devis";

export const factureFormSchema = z.object({
  title: z.string().min(1, "Titre requis"),
  clientId: z.string().uuid("Client requis"),
  projectId: z.string().uuid().optional(),
  devisId: z.string().uuid().optional(),
  items: z.array(devisItemSchema).min(1, "Ajoutez au moins une ligne"),
  tvaRate: z.number().min(0).max(100).default(20),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
});

export type FactureFormValues = z.infer<typeof factureFormSchema>;
