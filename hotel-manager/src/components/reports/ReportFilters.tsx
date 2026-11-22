import SelectField from "@/components/ui/fields/SelectField";
import TextField from "@/components/ui/fields/TextField";
import SearchFilterForm from "@/components/ui/SearchFilterForm";
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
    <SearchFilterForm
      action="/reports"
      formKey={`${slug}-${startDate}-${endDate}-${period}`}
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
    </SearchFilterForm>
  );
}
