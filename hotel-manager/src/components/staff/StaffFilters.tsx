import Link from "next/link";
import Button, { buttonClass } from "@/components/ui/Button";
import SelectField from "@/components/ui/fields/SelectField";
import TextField from "@/components/ui/fields/TextField";
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
    <form
      key={`${search}-${role}-${isActive}-${isAvailable}`}
      action="/staff"
      method="get"
      className="flex flex-wrap items-end gap-4"
    >
      <TextField
        id="search"
        name="search"
        label="Search"
        placeholder="Name or email"
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
      <Button type="submit">Apply</Button>
      <Link href="/staff" className={buttonClass("secondary")}>
        Clear
      </Link>
    </form>
  );
}
