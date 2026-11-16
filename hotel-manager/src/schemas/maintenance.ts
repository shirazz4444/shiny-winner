import { z } from "zod";

const statusSchema = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]);

export const createMaintenanceSchema = z.object({
    roomId: z.string().min(1),
    description: z.string().trim().min(1).max(500),
});

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;

export const updateMaintenanceSchema = z
    .object({
        description: z.string().trim().min(1).max(500),
        status: statusSchema,
    })
    .partial()
    .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update");

export type UpdateMaintenanceInput = z.infer<typeof updateMaintenanceSchema>;

export const listMaintenanceSchema = z.object({
    status: statusSchema.optional(),
    roomId: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListMaintenanceFilters = z.infer<typeof listMaintenanceSchema>;