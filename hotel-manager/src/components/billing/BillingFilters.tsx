import SelectField from "@/components/ui/fields/SelectField";
import TextField from "@/components/ui/fields/TextField";
import SearchFilterForm from "@/components/ui/SearchFilterForm";

type Props = {
  search: string;
  status: string;
  startDate: string;
  endDate: string;
};

export default function BillingFilters({ search, status, startDate, endDate }: Props) {
  return (
    <SearchFilterForm
      action="/billing"
      formKey={`${search}-${status}-${startDate}-${endDate}`}
      clearHref="/billing"
    >
      <TextField
        id="search"
        name="search"
        label="Search"
        placeholder="Guest Name or Invoice ID"
        defaultValue={search}
      />
      <SelectField id="status" name="status" label="Status" defaultValue={status}>
        <option value="">All</option>
        <option value="DRAFT">Draft</option>
        <option value="PAID">Paid</option>
        <option value="REFUNDED">Refunded</option>
      </SelectField>
      <TextField id="startDate" name="startDate" type="date" label="Paid from" defaultValue={startDate} />
      <TextField id="endDate" name="endDate" type="date" label="Paid to" defaultValue={endDate} />
    </SearchFilterForm>
  );
}
