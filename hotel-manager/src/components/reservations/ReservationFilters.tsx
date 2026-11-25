import SelectField from "@/components/ui/fields/SelectField";
import TextField from "@/components/ui/fields/TextField";
import SearchFilterForm from "@/components/ui/SearchFilterForm";

const STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CHECKED_IN", label: "Checked in" },
  { value: "CHECKED_OUT", label: "Checked out" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No-show" },
];

type Props = {
  search: string;
  status: string;
  startDate: string;
  endDate: string;
};

export default function ReservationFilters({
  search,
  status,
  startDate,
  endDate,
}: Props) {
  return (
    <SearchFilterForm
      action="/reservations"
      formKey={`${search}-${status}-${startDate}-${endDate}`}
      clearHref="/reservations"
    >
      <TextField
        id="search"
        name="search"
        label="Search"
        placeholder="Guest Name or Reservation ID"
        defaultValue={search}
      />
      <SelectField
        id="status"
        name="status"
        label="Status"
        defaultValue={status}
      >
        <option value="">All</option>
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </SelectField>
      <TextField
        id="startDate"
        name="startDate"
        type="date"
        label="Check-in from"
        defaultValue={startDate}
      />
      <TextField
        id="endDate"
        name="endDate"
        type="date"
        label="Check-in to"
        defaultValue={endDate}
      />
    </SearchFilterForm>
  );
}
