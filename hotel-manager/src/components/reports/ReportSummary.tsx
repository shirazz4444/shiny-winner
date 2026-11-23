import KpiCard from "@/components/ui/KpiCard";
import { centsToUSD } from "@/lib/format";
import type { SummaryField } from "@/components/reports/reportConfig";

type ReportSummaryProps = {
  fields: SummaryField[];
  summary: Record<string, string | number | null>;
};

function format(
  value: string | number | null | undefined,
  field: SummaryField,
) {
  if (value === null || value === undefined) return "–";
  if (typeof value === "string") return value;
  if (field.money) return centsToUSD(Math.round(value));
  if (field.percent) return `${value}%`;
  return value.toLocaleString("en-US");
}

export default function ReportSummary({ fields, summary }: ReportSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {fields.map((field) => (
        <KpiCard
          key={field.key}
          label={field.label}
          value={format(summary[field.key], field)}
        />
      ))}
    </div>
  );
}
