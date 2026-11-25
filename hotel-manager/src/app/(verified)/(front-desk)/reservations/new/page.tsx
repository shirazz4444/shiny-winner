import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Card from "@/components/ui/Card";
import ReservationForm from "@/components/reservations/ReservationForm";
import { addDays, today } from "@/lib/dates";
import { requireRole } from "@/services/authService";
import { getGuest } from "@/services/guestService";

type NewReservationProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewReservationPage({
  searchParams,
}: NewReservationProps) {
  const session = await requireRole("ADMIN", "MANAGER", "RECEPTIONIST");
  const raw = await searchParams;

  const guestId = Array.isArray(raw.guestId) ? raw.guestId[0] : raw.guestId;
  const guest = guestId
    ? await getGuest(guestId, session).catch(() => null)
    : null;

  const checkIn = today();

  return (
    <div className="content">
      <Link
        href="/reservations"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        All Reservations
      </Link>

      <h1 className="text-2xl font-semibold">New Reservation</h1>

      <Card>
        <ReservationForm
          mode="create"
          initial={{
            guest: guest ? { id: guest.id, fullName: guest.fullName } : null,
            checkInDate: checkIn,
            checkOutDate: addDays(checkIn, 1),
            adults: 1,
            children: 0,
            roomId: "",
            notes: "",
            status: "PENDING",
          }}
        />
      </Card>
    </div>
  );
}
