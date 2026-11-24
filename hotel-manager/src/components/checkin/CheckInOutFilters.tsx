import SelectField from "@/components/ui/fields/SelectField";
import TextField from "@/components/ui/fields/TextField";
import SearchFilterForm from "@/components/ui/SearchFilterForm";

type Props = {
  mode: "check-in" | "check-out";
  search: string;
  status: string;
  endDate: string;
};

export default function CheckInOutFilters({
  mode,
  search,
  status,
  endDate,
}: Props) {
  return (
    <SearchFilterForm
      action="/check-in-out"
      formKey={`${mode}-${search}-${status}-${endDate}`}
      clearHref={`/check-in-out?mode=${mode}`}
    >
      <input type="hidden" name="mode" value={mode} />
      <TextField
        id="search"
        name="search"
        label="Search"
        placeholder="Guest Name or Reservation ID"
        defaultValue={search}
      />
      {mode === "check-in" && (
        <>
          <SelectField
            id="status"
            name="status"
            label="Status"
            defaultValue={status}
          >
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING">Pending</option>
          </SelectField>
          <TextField
            id="endDate"
            name="endDate"
            type="date"
            label="Arriving on or before"
            defaultValue={endDate}
          />
        </>
      )}
    </SearchFilterForm>
  );
}
