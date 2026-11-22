import TextField from "@/components/ui/fields/TextField";
import SearchFilterForm from "@/components/ui/SearchFilterForm";

export default function GuestSearch({ search }: { search: string }) {
  return (
    <SearchFilterForm
      action="/guests"
      formKey={search}
      submitLabel="Search"
      clearHref="/guests"
    >
      <TextField
        id="search"
        name="search"
        label="Search"
        placeholder="Name, email, or phone"
        defaultValue={search}
      />
    </SearchFilterForm>
  );
}
