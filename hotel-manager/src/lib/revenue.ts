// revenue counts paid invoices, and refunded ones only for the part that was not refunded (all in cents)
export function netRevenue(invoice: { status: string; total: number; refundAmount: number | null }): number {
    if (invoice.status === "PAID") return invoice.total;
    if (invoice.status === "REFUNDED") return invoice.total - (invoice.refundAmount ?? 0);
    return 0;
}