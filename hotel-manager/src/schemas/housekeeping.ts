import { z } from "zod";

const notes = z.string().trim().min(1).max(500);
const booleanQuery = z.enum(["true", "false"]).transform((v) => v === "true");

export const createTaskSchema = z.object({
    roomId: z.string().min(1),
    assignedToId: z.string().min(1).nullable().default(null),
    notes: notes.nullable().default(null),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z
    .object({
        assignedToId: z.string().min(1).nullable(),
        notes: notes.nullable(),
    })
    .partial()
    .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update");

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const listTasksSchema = z.object({
    status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),
    roomId: z.string().optional(),
    assignedToId: z.string().optional(),
    unassigned: booleanQuery.optional(),
    mine: booleanQuery.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListTasksFilters = z.infer<typeof listTasksSchema>;