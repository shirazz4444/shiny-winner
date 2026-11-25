"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import ReservationForm from "@/components/reservations/ReservationForm";

type Props = {
  reservation: {
    id: string;
    checkInDate: string;
    checkOutDate: string;
    adults: number;
    children: number;
    roomId: string | null;
    notes: string | null;
  };
};

export default function ModifyReservationDialog({ reservation }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Modify
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Modify reservation"
      >
        <ReservationForm
          mode="edit"
          reservationId={reservation.id}
          initial={{
            guest: null,
            checkInDate: reservation.checkInDate,
            checkOutDate: reservation.checkOutDate,
            adults: reservation.adults,
            children: reservation.children,
            roomId: reservation.roomId ?? "",
            notes: reservation.notes ?? "",
            status: "PENDING",
          }}
          onDone={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </Dialog>
    </>
  );
}
