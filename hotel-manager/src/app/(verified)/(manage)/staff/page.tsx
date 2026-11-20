import Alert from "@/components/ui/Alert";
import Card from "@/components/ui/Card";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Pagination from "@/components/ui/Pagination";
import StatusBadge from "@/components/ui/StatusBadge";
import EmployeeActions from "@/components/staff/EmployeeActions";
import EmployeeFormDialog from "@/components/staff/EmployeeFormDialog";
import StaffFilters from "@/components/staff/StaffFilters";
import { ROLE_LABELS } from "@/lib/roleLabels";
import { listEmployeesSchema } from "@/schemas/employee";
import { requireRole } from "@/services/authService";
import { listEmployees } from "@/services/employeeService";

type StaffProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StaffPage({ searchParams }: StaffProps) {
  const session = await requireRole("ADMIN", "MANAGER");
  const raw = await searchParams;

  const input: Record<string, string> = Object.fromEntries(
    Object.entries(raw).flatMap(([key, value]) => {
      const v = Array.isArray(value) ? value[0] : value;
      return v ? [[key, v]] : [];
    }),
  );
  const parsed = listEmployeesSchema.safeParse(input);
  const filters = parsed.success ? parsed.data : listEmployeesSchema.parse({});
  const { items, total, page, limit } = await listEmployees(filters, session);

  const { page: _page, ...filterParams } = input;

  type Row = (typeof items)[number];
  const columns: Column<Row>[] = [
    {
      key: "fullName",
      label: "Name",
      render: (e) => (
        <>
          {e.fullName}
          {e.id === session.employeeId && (
            <span className="ml-2 text-sm text-muted-foreground">(you)</span>
          )}
        </>
      ),
    },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "role", label: "Role", render: (e) => ROLE_LABELS[e.role] },
    {
      key: "isActive",
      label: "Status",
      render: (e) => (
        <StatusBadge status={e.isActive ? "ACTIVE" : "INACTIVE"} />
      ),
    },
    {
      key: "isAvailable",
      label: "Availability",
      render: (e) => (
        <StatusBadge status={e.isAvailable ? "AVAILABLE" : "UNAVAILABLE"} />
      ),
    },
    {
      key: "actions",
      label: "Actions",
      width: "fit",
      render: (e) => (
        <EmployeeActions
          employee={{
            id: e.id,
            fullName: e.fullName,
            email: e.email,
            phone: e.phone,
            role: e.role,
            isActive: e.isActive,
            isAvailable: e.isAvailable,
          }}
          viewerRole={session.role}
          viewerId={session.employeeId}
        />
      ),
    },
  ];

  return (
    <div className="content">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Staff</h1>
        <EmployeeFormDialog
          mode="create"
          viewerRole={session.role}
          viewerId={session.employeeId}
        />
      </div>

      <Card>
        <StaffFilters
          search={input.search ?? ""}
          role={input.role ?? ""}
          isActive={input.isActive ?? ""}
          isAvailable={input.isAvailable ?? ""}
        />
      </Card>

      {!parsed.success && (
        <Alert>Some filters were invalid and were ignored.</Alert>
      )}

      <Card>
        <DataTable
          caption="Employees"
          columns={columns}
          rows={items}
          rowKey={(row) => row.id}
          emptyMessage="No employees match these filters."
        />
        <Pagination
          page={page}
          limit={limit}
          total={total}
          basePath="/staff"
          params={filterParams}
        />
      </Card>
    </div>
  );
}
