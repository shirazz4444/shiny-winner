import { z } from "zod";

const quantity = z.number().int().min(1).max(100);

export const listInvoicesSchema = z.object({
    search: z.string().trim().min(1).optional(),
    status: z.enum(["DRAFT", "ISSUED", "PAID", "REFUNDED"]).optional(),
    startDate: z.iso.date().optional(),
    endDate: z.iso.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListInvoicesFilters = z.infer<typeof listInvoicesSchema>;

export const addInvoiceItemSchema = z.object({
    serviceItemId: z.string().min(1),
    quantity: quantity.default(1),
});

export type AddInvoiceItemInput = z.infer<typeof addInvoiceItemSchema>;

export const updateInvoiceItemSchema = z.object({
    quantity,
});

export type UpdateInvoiceItemInput = z.infer<typeof updateInvoiceItemSchema>;

export const setDiscountSchema = z.object({
    discount: z.number().int().min(0),
});

export type SetDiscountInput = z.infer<typeof setDiscountSchema>;

export const refundSchema = z.object({
    amount: z.number().int().min(1).optional(),
});

export type RefundInput = z.infer<typeof refundSchema>;

export const checkOutSchema = z.object({
    paymentMethod: z.enum(["CASH", "CARD", "UPI"]),
});

export type CheckOutInput = z.infer<typeof checkOutSchema>;