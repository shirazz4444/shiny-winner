import RoomDeleteDialog from "@/components/rooms/RoomDeleteDialog";
import RoomFormDialog from "@/components/rooms/RoomFormDialog";
import RoomImagesDialog from "@/components/rooms/RoomImagesDialog";
import RoomStatusDialog from "@/components/rooms/RoomStatusDialog";
import type { CategoryOption, RoomItem } from "@/components/rooms/types";

type Props = {
  room: RoomItem;
  categories: CategoryOption[];
};

export default function RoomActions({ room, categories }: Props) {
  return (
    <div className="flex flex-col items-stretch gap-1">
      <RoomFormDialog mode="edit" room={room} categories={categories} />
      <RoomImagesDialog room={room} />
      <RoomStatusDialog room={room} />
      <RoomDeleteDialog room={room} />
    </div>
  );
}
