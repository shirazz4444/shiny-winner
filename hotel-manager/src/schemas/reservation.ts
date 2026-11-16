import { z } from "zod";

const date = z.iso.date();
const notes = z.string().trim().min(1).max(500);

export const createReservationSchema = z
    .object({
        guestId: z.string().min(1),
        roomId: z.string().min(1).nullable().default(null),
        checkInDate: date,
        checkOutDate: date,
        adults: z.number().int().min(1).default(1),
        children: z.number().int().min(0).default(0),
        status: z.enum(["PENDING", "CONFIRMED"]).default("PENDING"),
        notes: notes.nullable().default(null),
    })
    .refine((v) => v.checkOutDate > v.checkInDate, {
        message: "Check-out must be after check-in",
        path: ["checkOutDate"],
    });

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export const updateReservationSchema = z
    .object({
        guestId: z.string().min(1),
        roomId: z.string().min(1).nullable(),
        checkInDate: date,
        checkOutDate: date,
        adults: z.number().int().min(1),
        children: z.number().int().min(0),
        notes: notes.nullable(),
    })
    .partial()
    .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update")
    .refine((v) => !v.checkInDate || !v.checkOutDate || v.checkOutDate > v.checkInDate, {
        message: "Check-out must be after check-in",
        path: ["checkOutDate"],
    });

export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;

export const listReservationsSchema = z.object({
    search: z.string().trim().min(1).optional(),
    status: z.enum(["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"]).optional(),
    guestId: z.string().optional(),
    roomId: z.string().optional(),
    startDate: date.optional(),
    endDate: date.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListReservationsFilters = z.infer<typeof listReservationsSchema>;

export const setReservationStatusSchema = z.object({
    status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "NO_SHOW"]),
});

export type SetReservationStatusInput = z.infer<typeof setReservationStatusSchema>;

export const checkInSchema = z.object({
    roomId: z.string().min(1).optional(),
});

export type CheckInInput = z.infer<typeof checkInSchema>;

export const availableRoomsSchema = z
    .object({
        checkIn: date,
        checkOut: date,
        adults: z.coerce.number().int().min(1).default(1),
        children: z.coerce.number().int().min(0).default(0),
        categoryId: z.string().optional(),
        excludeReservationId: z.string().optional(),
    })
    .refine((v) => v.checkOut > v.checkIn, {
        message: "Check-out must be after check-in",
        path: ["checkOut"],
    });

export type AvailableRoomsFilters = z.infer<typeof availableRoomsSchema>;