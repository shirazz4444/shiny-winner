import { z } from "zod";

export const listCatalogSchema = z.object({
    includeInactive: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});

export type ListCatalogFilters = z.infer<typeof listCatalogSchema>;