import {
  BedDouble,
  Clock,
  DollarSign,
  DoorOpen,
  Hotel,
  LogIn,
  LogOut,
  ListTodo,
} from "lucide-react";
import Card from "@/components/ui/Card";
import KpiCard from "@/components/ui/KpiCard";
import RangeToggle from "@/components/dashboard/RangeToggle";
import BookingsChart from "@/components/dashboard/charts/BookingsChart";
import OccupancyChart from "@/components/dashboard/charts/OccupancyChart";
import RevenueChart from "@/components/dashboard/charts/RevenueChart";
import RoomTypeChart from "@/components/dashboard/charts/RoomTypeChart";
import { centsToUSD } from "@/lib/format";
import { dashboardChartsSchema } from "@/schemas/dashboard";
import { requireRole } from "@/services/authService";
import {
  getDashboardCharts,
  getDashboardKpis,
} from "@/services/dashboardService";

type DashboardProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: DashboardProps) {
  const session = await requireRole("ADMIN", "MANAGER");
  const parsed = dashboardChartsSchema.safeParse(await searchParams);
  const filters = parsed.success
    ? parsed.data
    : dashboardChartsSchema.parse({});

  const [kpis, charts] = await Promise.all([
    getDashboardKpis(session),
    getDashboardCharts(filters, session),
  ]);

  return (
    <div className="content">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <RangeToggle current={filters.days} />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Pending Reservations"
          value={kpis.pendingReservations}
          icon={Clock}
        />
        <KpiCard
          label="Open Housekeeping Tasks"
          value={kpis.openTasks}
          icon={ListTodo}
        />
        <KpiCard
          label="Available Rooms"
          value={kpis.availableRooms}
          icon={DoorOpen}
        />
        <KpiCard
          label="Occupied Rooms"
          value={kpis.occupiedRooms}
          icon={BedDouble}
        />
        <KpiCard label="Total Rooms" value={kpis.totalRooms} icon={Hotel} />
        <KpiCard
          label="Today's Check-ins"
          value={kpis.todaysCheckIns}
          icon={LogIn}
        />
        <KpiCard
          label="Today's Check-outs"
          value={kpis.todaysCheckOuts}
          icon={LogOut}
        />
        <KpiCard
          label="Total Revenue"
          value={centsToUSD(kpis.totalRevenue)}
          icon={DollarSign}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title={`Monthly Revenue (last ${charts.monthlyRevenue.length} months)`}
        >
          <RevenueChart data={charts.monthlyRevenue} />
        </Card>
        <Card title={`Room Occupancy Rate (last ${filters.days} days)`}>
          <OccupancyChart data={charts.occupancy} />
        </Card>
        <Card title="Reservations by Room Type">
          <RoomTypeChart data={charts.reservationsByRoomType} />
        </Card>
        <Card title={`Booking Trends (check-ins, last ${filters.days} days)`}>
          <BookingsChart data={charts.bookingTrends} />
        </Card>
      </div>
    </div>
  );
}
