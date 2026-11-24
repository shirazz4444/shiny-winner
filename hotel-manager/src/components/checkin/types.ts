export type ReservationRow = {
  id: string;
  guestName: string;
  roomId: string | null;
  roomNumber: string | null;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  adults: number;
  children: number;
};

export type ReservationDetail = {
  id: string;
  status: string;
  guest: { id: string; fullName: string; email: string; phone: string; address: string };
  room: { id: string; roomNumber: string } | null;
  invoice: { id: string; status: string; total: number } | null;
};

export type AvailableRoom = {
  id: string;
  roomNumber: string;
  categoryName: string;
  price: number;
  maxOccupancy: number;
  status: string;
};

export type InvoiceDetail = {
  id: string;
  reservation: { nights: number; roomNumber: string | null };
  roomCharge: number;
  items: { id: string; name: string; unitPrice: number; quantity: number; total: number }[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
};
