import { z } from "zod";

export const createGuestSchema = z.object({
    fullName: z.string().trim().min(1),
    email: z.email(),
    phone: z.string().trim().min(1),
    address: z.string().trim().min(1),
});

export type CreateGuestInput = z.infer<typeof createGuestSchema>;

export const updateGuestSchema = createGuestSchema
    .partial()
    .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update");

export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;

export const listGuestsSchema = z.object({
    search: z.string().trim().min(1).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListGuestsFilters = z.infer<typeof listGuestsSchema>;