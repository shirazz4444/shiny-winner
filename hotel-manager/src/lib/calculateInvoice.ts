// all money values are integer cents (e.g. $10.00 = 1000); taxRate is a decimal fraction (e.g. 0.06)
type InvoiceInput = {
    roomCharge: number;
    items: { unitPrice: number; quantity: number }[];
    discount: number;
    taxRate: number;
};

// rounds up to the next whole cent
const ceilCents = (n: number) => Math.ceil(Number(n.toFixed(6)));

export function calculateInvoice({ roomCharge, items, discount, taxRate }: InvoiceInput) {
    const itemsTotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

    const subtotal = roomCharge + itemsTotal;
    const appliedDiscount = Math.min(discount, subtotal); // can't discount below zero
    const taxableAmount = subtotal - appliedDiscount;
    const taxAmount = ceilCents(taxableAmount * taxRate);
    const total = taxableAmount + taxAmount;

    return { subtotal, appliedDiscount, taxableAmount, taxAmount, total };
}