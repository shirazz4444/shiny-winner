import SelectField from "@/components/ui/fields/SelectField";
import TextField from "@/components/ui/fields/TextField";
import SearchFilterForm from "@/components/ui/SearchFilterForm";
import { ROLES, ROLE_LABELS } from "@/lib/roleLabels";

type StaffFiltersProps = {
  search: string;
  role: string;
  isActive: string;
  isAvailable: string;
};

export default function StaffFilters({
  search,
  role,
  isActive,
  isAvailable,
}: StaffFiltersProps) {
  return (
    <SearchFilterForm
      action="/staff"
      formKey={`${search}-${role}-${isActive}-${isAvailable}`}
      clearHref="/staff"
    >
      <TextField
        id="search"
        name="search"
        label="Search"
        placeholder="Name or Email"
        defaultValue={search}
      />

      <SelectField id="role" name="role" label="Role" defaultValue={role}>
        <option value="">All roles</option>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </SelectField>

      <SelectField
        id="isActive"
        name="isActive"
        label="Status"
        defaultValue={isActive}
      >
        <option value="">All</option>
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </SelectField>

      <SelectField
        id="isAvailable"
        name="isAvailable"
        label="Availability"
        defaultValue={isAvailable}
      >
        <option value="">All</option>
        <option value="true">Available</option>
        <option value="false">Unavailable</option>
      </SelectField>
    </SearchFilterForm>
  );
}
