import { z } from "zod";

const roleSchema = z.enum(["ADMIN", "RECEPTIONIST", "HOUSEKEEPING", "MANAGER"]);

export const createEmployeeSchema = z.object({
    fullName: z.string().trim().min(1),
    email: z.email(),
    phone: z.string().trim().min(1),
    role: roleSchema,
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z
    .object({
        fullName: z.string().trim().min(1),
        email: z.email(),
        phone: z.string().trim().min(1),
        role: roleSchema,
        isAvailable: z.boolean(),
    })
    .partial()
    .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update");

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export const listEmployeesSchema = z.object({
    search: z.string().trim().min(1).optional(),
    role: roleSchema.optional(),
    isActive: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
    isAvailable: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListEmployeesFilters = z.infer<typeof listEmployeesSchema>;

export const setActiveSchema = z.object({
    active: z.boolean(),
});