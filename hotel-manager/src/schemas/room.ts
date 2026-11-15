import { z } from "zod";

const cents = z.number().int().nonnegative();

export const createRoomSchema = z.object({
    roomNumber: z.string().trim().min(1).max(10),
    categoryId: z.string().min(1),
    price: cents.optional(),
    maxOccupancy: z.number().int().min(1).optional(),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const updateRoomSchema = z
    .object({
        roomNumber: z.string().trim().min(1).max(10),
        categoryId: z.string().min(1),
        price: cents,
        maxOccupancy: z.number().int().min(1),
    })
    .partial()
    .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update");

export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;

export const listRoomsSchema = z.object({
    search: z.string().trim().min(1).optional(),
    categoryId: z.string().optional(),
    status: z.enum(["AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE", "RESERVED"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListRoomsFilters = z.infer<typeof listRoomsSchema>;

export const setRoomStatusSchema = z.object({
    status: z.enum(["AVAILABLE", "CLEANING", "MAINTENANCE"]),
});

export type SetRoomStatusInput = z.infer<typeof setRoomStatusSchema>;

export const removeRoomImageSchema = z.object({
    url: z.url(),
});