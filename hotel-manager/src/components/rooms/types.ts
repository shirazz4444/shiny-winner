export type RoomItem = {
  id: string;
  roomNumber: string;
  categoryId: string;
  price: number;
  maxOccupancy: number;
  images: string[];
  status: string;
};

export type CategoryOption = {
  id: string;
  name: string;
  basePrice: number;
  maxOccupancy: number;
  isActive: boolean;
};
