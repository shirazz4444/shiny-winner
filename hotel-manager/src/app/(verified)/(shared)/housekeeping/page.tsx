import Link from "next/link";
import Alert from "@/components/ui/Alert";
import Card from "@/components/ui/Card";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Pagination from "@/components/ui/Pagination";
import StatusBadge from "@/components/ui/StatusBadge";
import TabNav from "@/components/ui/TabNav";
import HousekeepingFilters from "@/components/housekeeping/HousekeepingFilters";
import MaintenanceReportDialog from "@/components/housekeeping/MaintenanceReportDialog";
import MaintenanceUpdateDialog from "@/components/housekeeping/MaintenanceUpdateDialog";
import TaskActions from "@/components/housekeeping/TaskActions";
import TaskFormDialog from "@/components/housekeeping/TaskFormDialog";
import { formatDate } from "@/lib/dates";
import { listMaintenanceSchema } from "@/schemas/maintenance";
import { listTasksSchema } from "@/schemas/housekeeping";
import { requireRole } from "@/services/authService";
import { listEmployees } from "@/services/employeeService";
import { listTasks } from "@/services/housekeepingService";
import { listMaintenanceRequests } from "@/services/maintenanceService";
import { listRooms } from "@/services/roomService";

type HousekeepingProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HousekeepingPage({
  searchParams,
}: HousekeepingProps) {
  const session = await requireRole(
    "ADMIN",
    "MANAGER",
    "RECEPTIONIST",
    "HOUSEKEEPING",
  );
  const raw = await searchParams;

  const manage = session.role === "ADMIN" || session.role === "MANAGER";
  const housekeeping = session.role === "HOUSEKEEPING";

  const input: Record<string, string> = Object.fromEntries(
    Object.entries(raw).flatMap(([key, value]) => {
      const v = Array.isArray(value) ? value[0] : value;
      return v ? [[key, v]] : [];
    }),
  );
  const section = input.section === "maintenance" ? "maintenance" : "tasks";

  const [{ items: roomItems }, staffList] = await Promise.all([
    listRooms({ page: 1, limit: 100 }, session),
    manage
      ? listEmployees(
          { role: "HOUSEKEEPING", isActive: true, page: 1, limit: 100 },
          session,
        )
      : Promise.resolve({ items: [] }),
  ]);
  const rooms = roomItems.map((r) => ({ id: r.id, roomNumber: r.roomNumber }));
  const staff = staffList.items.map((s) => ({
    id: s.id,
    fullName: s.fullName,
    isAvailable: s.isAvailable,
  }));

  const { section: _section, page: _page, ...filterParams } = input;

  const tabs = (
    <TabNav
      label="Housekeeping sections"
      items={[
        {
          href: "/housekeeping?section=tasks",
          label: "Cleaning Tasks",
          active: section === "tasks",
        },
        {
          href: "/housekeeping?section=maintenance",
          label: "Maintenance",
          active: section === "maintenance",
        },
      ]}
    />
  );

  if (section === "maintenance") {
    const parsed = listMaintenanceSchema.safeParse({
      ...(input.status && { status: input.status }),
      ...(input.page && { page: input.page }),
    });
    const filters = parsed.success
      ? parsed.data
      : listMaintenanceSchema.parse({});
    const { items, total, page, limit } = await listMaintenanceRequests(
      filters,
      session,
    );

    type Row = (typeof items)[number];
    const columns: Column<Row>[] = [
      {
        key: "roomNumber",
        label: "Room",
        render: (r) => <span className="font-medium">{r.roomNumber}</span>,
      },
      { key: "description", label: "Issue", width: 3 },
      {
        key: "status",
        label: "Status",
        render: (r) => <StatusBadge status={r.status} />,
      },
      { key: "reportedByName", label: "Reported by" },
      {
        key: "resolvedAt",
        label: "Resolved",
        wrap: false,
        render: (r) => (r.resolvedAt ? formatDate(r.resolvedAt) : "–"),
      },
    ];
    if (manage) {
      columns.push({
        key: "actions",
        label: "Actions",
        width: "fit",
        render: (r) =>
          r.status === "RESOLVED" ? (
            <span className="text-sm text-muted-foreground">–</span>
          ) : (
            <MaintenanceUpdateDialog
              request={{
                id: r.id,
                roomId: r.roomId,
                roomNumber: r.roomNumber,
                description: r.description,
                status: r.status,
              }}
            />
          ),
      });
    }

    return (
      <div className="content">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Housekeeping</h1>
          <MaintenanceReportDialog rooms={rooms} />
        </div>
        {tabs}
        <Card>
          <HousekeepingFilters
            section="maintenance"
            status={input.status ?? ""}
            assignee=""
            showMine={false}
            staff={[]}
          />
        </Card>
        {!parsed.success && (
          <Alert>Some filters were invalid and were ignored.</Alert>
        )}
        <Card>
          <DataTable
            caption="Maintenance requests"
            columns={columns}
            rows={items}
            rowKey={(row) => row.id}
            emptyMessage="No maintenance requests match these filters."
          />
          <Pagination
            page={page}
            limit={limit}
            total={total}
            basePath="/housekeeping"
            params={{ section, ...filterParams }}
          />
        </Card>
      </div>
    );
  }

  const assignee = input.assignee ?? "";
  const parsed = listTasksSchema.safeParse({
    ...(input.status && { status: input.status }),
    ...(input.page && { page: input.page }),
    ...(assignee === "mine"
      ? { mine: "true" }
      : assignee === "unassigned"
        ? { unassigned: "true" }
        : assignee
          ? { assignedToId: assignee }
          : {}),
  });
  const filters = parsed.success ? parsed.data : listTasksSchema.parse({});
  const [{ items, total, page, limit }, { total: unassigned }] =
    await Promise.all([
      listTasks(filters, session),
      listTasks(
        { unassigned: true, status: "PENDING", page: 1, limit: 1 },
        session,
      ),
    ]);

  type Row = (typeof items)[number];
  const columns: Column<Row>[] = [
    {
      key: "roomNumber",
      label: "Room",
      render: (r) => <span className="font-medium">{r.roomNumber}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "assignedToName",
      label: "Assigned to",
      render: (r) =>
        r.assignedToName ? (
          <>
            {r.assignedToName}
            {r.isMine && (
              <span className="ml-2 text-sm text-muted-foreground">(you)</span>
            )}
          </>
        ) : (
          <span className="font-medium text-warning">Unassigned</span>
        ),
    },
    { key: "notes", label: "Notes", width: 2, render: (r) => r.notes ?? "–" },
    {
      key: "completedAt",
      label: "Completed",
      wrap: false,
      render: (r) => (r.completedAt ? formatDate(r.completedAt) : "–"),
    },
  ];
  if (manage || housekeeping) {
    columns.push({
      key: "actions",
      label: "Actions",
      width: "fit",
      render: (r) => (
        <TaskActions
          task={{
            id: r.id,
            roomId: r.roomId,
            roomNumber: r.roomNumber,
            assignedToId: r.assignedToId,
            assignedToName: r.assignedToName,
            isMine: r.isMine,
            status: r.status,
            notes: r.notes,
          }}
          viewerRole={session.role}
          viewerId={session.employeeId}
          rooms={rooms}
          housekeepers={staff}
        />
      ),
    });
  }

  return (
    <div className="content">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Housekeeping</h1>
        {manage && (
          <TaskFormDialog mode="create" rooms={rooms} housekeepers={staff} />
        )}
      </div>
      {tabs}

      {unassigned > 0 && (
        <Alert variant="warning">
          <Link
            href="/housekeeping?section=tasks&assignee=unassigned"
            className="font-medium underline"
          >
            {unassigned} open {unassigned === 1 ? "task has" : "tasks have"} no
            one assigned!{" "}
          </Link>
        </Alert>
      )}

      <Card>
        <HousekeepingFilters
          section="tasks"
          status={input.status ?? ""}
          assignee={assignee}
          showMine={housekeeping}
          staff={staff}
        />
      </Card>
      {!parsed.success && (
        <Alert>Some filters were invalid and were ignored.</Alert>
      )}
      <Card>
        <DataTable
          caption="Cleaning Tasks"
          columns={columns}
          rows={items}
          rowKey={(row) => row.id}
          emptyMessage="No cleaning tasks match these filters."
        />
        <Pagination
          page={page}
          limit={limit}
          total={total}
          basePath="/housekeeping"
          params={{ section, ...filterParams }}
        />
      </Card>
    </div>
  );
}
