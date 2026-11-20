import Button from "@/components/ui/Button";
import SelectField from "@/components/ui/fields/SelectField";
import TextField from "@/components/ui/fields/TextField";
import type { ReportSlug } from "@/components/reports/reportConfig";

type ReportFiltersProps = {
  slug: ReportSlug;
  startDate: string;
  endDate: string;
  period: string;
};

export default function ReportFilters({
  slug,
  startDate,
  endDate,
  period,
}: ReportFiltersProps) {
  return (
    <form
      key={`${slug}-${startDate}-${endDate}-${period}`}
      action="/reports"
      method="get"
      className="flex flex-wrap items-end gap-4"
    >
      <input type="hidden" name="report" value={slug} />

      <TextField
        id="startDate"
        name="startDate"
        type="date"
        label="From"
        defaultValue={startDate}
        required
      />
      <TextField
        id="endDate"
        name="endDate"
        type="date"
        label="To"
        defaultValue={endDate}
        required
      />

      {slug === "revenue" && (
        <SelectField
          id="period"
          name="period"
          label="Group by"
          defaultValue={period}
        >
          <option value="daily">Day</option>
          <option value="weekly">Week</option>
          <option value="monthly">Month</option>
        </SelectField>
      )}

      <Button type="submit">Apply</Button>
    </form>
  );
}
