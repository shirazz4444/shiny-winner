import SelectField from "@/components/ui/fields/SelectField";
import TextField from "@/components/ui/fields/TextField";
import SearchFilterForm from "@/components/ui/SearchFilterForm";
import type { CategoryOption } from "@/components/rooms/types";

const STATUSES = [
  "AVAILABLE",
  "OCCUPIED",
  "CLEANING",
  "MAINTENANCE",
  "RESERVED",
];

const statusLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

type RoomFiltersProps = {
  search: string;
  categoryId: string;
  status: string;
  categories: CategoryOption[];
};

export default function RoomFilters({
  search,
  categoryId,
  status,
  categories,
}: RoomFiltersProps) {
  return (
    <SearchFilterForm
      action="/rooms"
      formKey={`${search}-${categoryId}-${status}`}
      clearHref="/rooms"
    >
      <TextField
        id="search"
        name="search"
        label="Room number"
        placeholder="e.g. 204"
        defaultValue={search}
      />

      {categories.length > 0 && (
        <SelectField
          id="categoryId"
          name="categoryId"
          label="Category"
          defaultValue={categoryId}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.isActive ? "" : " (inactive)"}
            </option>
          ))}
        </SelectField>
      )}

      <SelectField
        id="status"
        name="status"
        label="Status"
        defaultValue={status}
      >
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {statusLabel(s)}
          </option>
        ))}
      </SelectField>
    </SearchFilterForm>
  );
}
