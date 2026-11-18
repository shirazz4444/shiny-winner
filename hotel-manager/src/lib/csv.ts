import { ok } from "@/lib/apiResponse";

export type ReportColumn = { key: string; label: string; money?: boolean };
export type ReportRow = Record<string, string | number | null>;
export type Report = {
    columns: ReportColumn[];
    rows: ReportRow[];
    summary: Record<string, string | number | null>;
};

function cell(value: string | number | null, money?: boolean): string {
    if (value === null) return "";
    if (typeof value === "number") return money ? (value / 100).toFixed(2) : String(value);

    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(report: Report): string {
    const header = report.columns.map((c) => cell(c.label)).join(",");
    const lines = report.rows.map((row) => report.columns.map((c) => cell(row[c.key] ?? null, c.money)).join(","));
    return [header, ...lines].join("\r\n");
}

export function reportResponse(report: Report, format: "json" | "csv", filename: string) {
    if (format === "json") return ok(report);

    return new Response(`\uFEFF${toCsv(report)}`, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
    });
}