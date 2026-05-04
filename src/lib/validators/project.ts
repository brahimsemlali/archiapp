import { z } from "zod";

export const projectSchema = z.object({
  title: z.string().min(1, "Titre requis"),
  clientId: z.string().uuid("Client requis"),
  type: z.enum([
    "villa",
    "appartement",
    "immeuble",
    "commercial",
    "renovation",
    "amenagement",
    "autre",
  ]),
  address: z.string().optional(),
  surfaceM2: z.string().optional(),
  phase: z.enum(["esquisse", "aps", "apd", "pc", "dce", "chantier", "reception", "termine"]),
  status: z.enum(["actif", "en_attente", "suspendu", "termine", "archive"]),
  budgetEstimate: z.string().optional(),
  fees: z.string().optional(),
  startDate: z.string().optional(),
  targetEndDate: z.string().optional(),
  notes: z.string().optional(),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;
