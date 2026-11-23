import Image from "next/image";
import { ImageOff } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Card from "@/components/ui/Card";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Pagination from "@/components/ui/Pagination";
import StatusBadge from "@/components/ui/StatusBadge";
import RoomActions from "@/components/rooms/RoomActions";
import RoomFilters from "@/components/rooms/RoomFilters";
import RoomFormDialog from "@/components/rooms/RoomFormDialog";
import { centsToUSD } from "@/lib/format";
import { listRoomsSchema } from "@/schemas/room";
import { requireRole } from "@/services/authService";
import { listRoomCategories } from "@/services/roomCategoryService";
import { listRooms } from "@/services/roomService";

type RoomsProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RoomsPage({ searchParams }: RoomsProps) {
  const session = await requireRole(
    "ADMIN",
    "MANAGER",
    "RECEPTIONIST",
    "HOUSEKEEPING",
  );
  const raw = await searchParams;

  const canEdit = session.role === "ADMIN" || session.role === "MANAGER";
  const canSeeCategories = session.role !== "HOUSEKEEPING";

  const input: Record<string, string> = Object.fromEntries(
    Object.entries(raw).flatMap(([key, value]) => {
      const v = Array.isArray(value) ? value[0] : value;
      return v ? [[key, v]] : [];
    }),
  );
  const parsed = listRoomsSchema.safeParse(input);
  const filters = parsed.success ? parsed.data : listRoomsSchema.parse({});

  const [{ items, total, page, limit }, categories] = await Promise.all([
    listRooms(filters, session),
    canSeeCategories
      ? listRoomCategories({ includeInactive: true }, session).then(
          (r) => r.items,
        )
      : Promise.resolve([]),
  ]);

  const { page: _page, ...filterParams } = input;

  type Row = (typeof items)[number];
  const columns: Column<Row>[] = [
    {
      key: "photo",
      label: "Photo",
      width: "fit",
      render: (r) =>
        r.images[0] ? (
          <Image
            src={r.images[0]}
            alt={`Room ${r.roomNumber}`}
            width={64}
            height={48}
            unoptimized
            className="h-12 w-16 rounded-md object-cover"
          />
        ) : (
          <div
            role="img"
            aria-label="No photo"
            className="grid h-12 w-16 place-items-center rounded-md bg-muted text-muted-foreground"
          >
            <ImageOff size={18} aria-hidden="true" />
          </div>
        ),
    },
    {
      key: "roomNumber",
      label: "Room",
      render: (r) => <span className="font-medium">{r.roomNumber}</span>,
    },
    { key: "categoryName", label: "Category" },
    {
      key: "price",
      label: "Price per night",
      align: "right",
      wrap: false,
      render: (r) => centsToUSD(r.price),
    },
    { key: "maxOccupancy", label: "Max Guests", align: "right" },
    {
      key: "status",
      label: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];
  if (canEdit) {
    columns.push({
      key: "actions",
      label: "Actions",
      width: "fit",
      render: (r) => (
        <RoomActions
          room={{
            id: r.id,
            roomNumber: r.roomNumber,
            categoryId: r.categoryId,
            price: r.price,
            maxOccupancy: r.maxOccupancy,
            images: [...r.images],
            status: r.status,
          }}
          categories={categories}
        />
      ),
    });
  }

  return (
    <div className="content">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Rooms</h1>
        {canEdit && <RoomFormDialog mode="create" categories={categories} />}
      </div>

      <Card>
        <RoomFilters
          search={input.search ?? ""}
          categoryId={input.categoryId ?? ""}
          status={input.status ?? ""}
          categories={categories}
        />
      </Card>

      {!parsed.success && (
        <Alert>Some filters were invalid and were ignored.</Alert>
      )}

      <Card>
        <DataTable
          caption="Rooms"
          columns={columns}
          rows={items}
          rowKey={(row) => row.id}
          emptyMessage="No rooms match these filters."
        />
        <Pagination
          page={page}
          limit={limit}
          total={total}
          basePath="/rooms"
          params={filterParams}
        />
      </Card>
    </div>
  );
}
