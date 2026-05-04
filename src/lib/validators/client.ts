import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  type: z.enum(["particulier", "societe"]),
  phone: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  address: z.string().optional(),
  ice: z.string().optional(),
  cin: z.string().optional(),
  notes: z.string().optional(),
});

export type ClientFormValues = z.infer<typeof clientSchema>;
