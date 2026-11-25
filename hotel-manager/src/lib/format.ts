export function centsToUSD(cents: number): string {
    if (!Number.isInteger(cents)) {
        throw new Error("cents must be an integer");
    }

    const sign = cents < 0 ? "-" : "";
    return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

export function centsToUSDWhole(cents: number): string {
    if (!Number.isInteger(cents)) {
        throw new Error("cents must be an integer");
    }

    const sign = cents < 0 ? "-" : "";
    return `${sign}$${Math.round(Math.abs(cents) / 100)}`;
}

export function USDToCents(text: string): number | null {
    const trimmed = text.trim();
    const n = Number(trimmed);
    return trimmed !== "" && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

export function formatDate(value: string | Date): string {
    return new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}

export function formatDateTime(value: string | Date): string {
    return `${new Date(value).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
    })} UTC`;
}

export const PAYMENT_METHODS: Record<string, string> = {
    CASH: "Cash",
    CARD: "Card",
    UPI: "UPI",
};