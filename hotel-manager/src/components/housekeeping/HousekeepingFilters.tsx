import SelectField from "@/components/ui/fields/SelectField";
import SearchFilterForm from "@/components/ui/SearchFilterForm";
import type { StaffOption } from "@/components/housekeeping/types";

type Props = {
  section: "tasks" | "maintenance";
  status: string;
  assignee: string;
  showMine: boolean;
  staff: StaffOption[];
};

export default function HousekeepingFilters({
  section,
  status,
  assignee,
  showMine,
  staff,
}: Props) {
  const tasks = section === "tasks";

  return (
    <SearchFilterForm
      action="/housekeeping"
      formKey={`${section}-${status}-${assignee}`}
      clearHref={`/housekeeping?section=${section}`}
    >
      <input type="hidden" name="section" value={section} />

      <SelectField
        id="status"
        name="status"
        label="Status"
        defaultValue={status}
      >
        <option value="">All</option>
        {tasks ? (
          <>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
          </>
        ) : (
          <>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="RESOLVED">Resolved</option>
          </>
        )}
      </SelectField>

      {tasks && (
        <SelectField
          id="assignee"
          name="assignee"
          label="Assigned to"
          defaultValue={assignee}
        >
          <option value="">Anyone</option>
          {showMine && <option value="mine">Me</option>}
          <option value="unassigned">Unassigned</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName}
            </option>
          ))}
        </SelectField>
      )}
    </SearchFilterForm>
  );
}
