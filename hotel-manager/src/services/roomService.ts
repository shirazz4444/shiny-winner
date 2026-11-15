import { db, type Tx } from "@/prisma/db";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/apiResponse";
import { assertRole, likePattern } from "@/lib/serviceHelpers";
import {
    IMAGE_TYPES,
    MAX_IMAGES_PER_ROOM,
    MAX_IMAGE_BYTES,
    deleteRoomImages,
    uploadRoomImage,
} from "@/lib/roomImageStorage";
import type { Session } from "@/services/authService";
import type { CreateRoomInput, ListRoomsFilters, SetRoomStatusInput, UpdateRoomInput } from "@/schemas/room";

async function assertActiveCategory(tx: Tx, categoryId: string) {
    const category = await tx.orm.public.RoomCategory.where({ id: categoryId }).first();
    if (!category) throw new NotFoundError("Room category not found");
    if (!category.isActive) throw new ConflictError("This room category is no longer available");
    return category;
}

export async function listRooms(filters: ListRoomsFilters, session: Session) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING");
    const { search, categoryId, status, page, limit } = filters;

    let query = db.orm.public.Room.where({});
    if (categoryId) query = query.where({ categoryId });
    if (status) query = query.where({ status });
    if (search) {
        const pattern = likePattern(search);
        query = query.where((r) => r.roomNumber.ilike(pattern));
    }

    const { total } = await query.aggregate((a) => ({ total: a.count() }));
    const rows = await query
        .orderBy([(r) => r.roomNumber.asc(), (r) => r.id.asc()])
        .include("category")
        .limit(limit)
        .offset((page - 1) * limit)
        .all();

    const items = rows.map((r) => ({
        id: r.id,
        roomNumber: r.roomNumber,
        categoryId: r.categoryId,
        categoryName: r.category.name,
        price: r.price,
        maxOccupancy: r.maxOccupancy,
        images: r.images,
        status: r.status,
    }));
    return { items, total, page, limit };
}

export async function getRoom(roomId: string, session: Session) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING");

    const room = await db.orm.public.Room.where({ id: roomId }).include("category").first();
    if (!room) throw new NotFoundError("Room not found");

    return {
        id: room.id,
        roomNumber: room.roomNumber,
        categoryId: room.categoryId,
        price: room.price,
        maxOccupancy: room.maxOccupancy,
        images: room.images,
        status: room.status,
        category: {
            id: room.category.id,
            name: room.category.name,
            description: room.category.description,
            basePrice: room.category.basePrice,
            maxOccupancy: room.category.maxOccupancy,
        },
    };
}

export async function createRoom(input: CreateRoomInput, session: Session) {
    assertRole(session, "ADMIN", "MANAGER");

    return db.transaction(async (tx) => {
        const category = await assertActiveCategory(tx, input.categoryId);

        const existing = await tx.orm.public.Room.where({ roomNumber: input.roomNumber }).first();
        if (existing) throw new ConflictError("A room with this number already exists");

        const room = await tx.orm.public.Room.create({
            roomNumber: input.roomNumber,
            categoryId: input.categoryId,
            price: input.price ?? category.basePrice,
            maxOccupancy: input.maxOccupancy ?? category.maxOccupancy,
            images: [],
            status: "AVAILABLE",
        });
        return { id: room.id };
    });
}

export async function updateRoom(roomId: string, input: UpdateRoomInput, session: Session): Promise<void> {
    assertRole(session, "ADMIN", "MANAGER");

    await db.transaction(async (tx) => {
        const room = await tx.orm.public.Room.where({ id: roomId }).first();
        if (!room) throw new NotFoundError("Room not found");

        if (input.roomNumber !== undefined && input.roomNumber !== room.roomNumber) {
            const taken = await tx.orm.public.Room.where({ roomNumber: input.roomNumber }).first();
            if (taken) throw new ConflictError("A room with this number already exists");
        }
        if (input.categoryId !== undefined && input.categoryId !== room.categoryId) {
            await assertActiveCategory(tx, input.categoryId);
        }

        await tx.orm.public.Room.where({ id: roomId }).update(input);
    });
}

export async function setRoomStatus(roomId: string, input: SetRoomStatusInput, session: Session): Promise<void> {
    assertRole(session, "ADMIN", "MANAGER");

    await db.transaction(async (tx) => {
        const room = await tx.orm.public.Room.where({ id: roomId }).first();
        if (!room) throw new NotFoundError("Room not found");
        if (room.status === "OCCUPIED") {
            throw new ConflictError("An occupied room's status changes when the guest checks out");
        }

        await tx.orm.public.Room.where({ id: roomId }).update({ status: input.status });
    });
}

export async function deleteRoom(roomId: string, session: Session): Promise<void> {
    assertRole(session, "ADMIN", "MANAGER");

    const room = await db.orm.public.Room.where({ id: roomId }).first();
    if (!room) throw new NotFoundError("Room not found");

    const [reservation, task, request] = await Promise.all([
        db.orm.public.Reservation.where({ roomId }).first(),
        db.orm.public.HousekeepingTask.where({ roomId }).first(),
        db.orm.public.MaintenanceRequest.where({ roomId }).first(),
    ]);
    if (reservation || task || request) {
        throw new ConflictError("This room has reservations, housekeeping, or maintenance history and cannot be deleted");
    }

    await db.orm.public.Room.where({ id: roomId }).deleteAll();
    await deleteRoomImages(room.images);
}

export async function addRoomImage(roomId: string, file: File, session: Session) {
    assertRole(session, "ADMIN", "MANAGER");

    if (!Object.hasOwn(IMAGE_TYPES, file.type)) throw new BadRequestError("Only JPEG, PNG, or WebP images are allowed");
    if (file.size === 0) throw new BadRequestError("The image is empty");
    if (file.size > MAX_IMAGE_BYTES) throw new BadRequestError("Images must be 2 MB or smaller");

    const room = await db.orm.public.Room.where({ id: roomId }).first();
    if (!room) throw new NotFoundError("Room not found");
    if (room.images.length >= MAX_IMAGES_PER_ROOM) {
        throw new ConflictError(`A room can have at most ${MAX_IMAGES_PER_ROOM} images`);
    }

    const url = await uploadRoomImage(roomId, file);
    try {
        const images = [...room.images, url];
        await db.orm.public.Room.where({ id: roomId }).update({ images });
        return { url, images };
    } catch (error) {
        await deleteRoomImages([url]);
        throw error;
    }
}

export async function removeRoomImage(roomId: string, url: string, session: Session) {
    assertRole(session, "ADMIN", "MANAGER");

    const room = await db.orm.public.Room.where({ id: roomId }).first();
    if (!room) throw new NotFoundError("Room not found");
    if (!room.images.includes(url)) throw new NotFoundError("That image does not belong to this room");

    const images = room.images.filter((u) => u !== url);
    await db.orm.public.Room.where({ id: roomId }).update({ images });
    await deleteRoomImages([url]);
    return { images };
}