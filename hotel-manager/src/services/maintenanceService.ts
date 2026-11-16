import { db, type Tx } from "@/prisma/db";
import { ConflictError, NotFoundError } from "@/lib/apiResponse";
import { assertRole } from "@/lib/serviceHelpers";
import type { Session } from "@/services/authService";
import type { CreateMaintenanceInput, ListMaintenanceFilters, UpdateMaintenanceInput } from "@/schemas/maintenance";

const STATUS_ORDER: Record<string, number> = { OPEN: 0, IN_PROGRESS: 1, RESOLVED: 2 };

function toItem(m: {
    id: string;
    roomId: string;
    reportedById: string;
    description: string;
    status: string;
    resolvedAt: Date | null;
    createdAt: Date;
    room: { roomNumber: string };
    reportedBy: { fullName: string };
}) {
    return {
        id: m.id,
        roomId: m.roomId,
        roomNumber: m.room.roomNumber,
        description: m.description,
        status: m.status,
        reportedById: m.reportedById,
        reportedByName: m.reportedBy.fullName,
        resolvedAt: m.resolvedAt,
        createdAt: m.createdAt,
    };
}

// once a room's last unresolved request is resolved it leaves Maintenance: it goes to Cleaning if a housekeeping task is still unfinished, otherwise to Available
async function releaseRoom(tx: Tx, roomId: string) {
    const room = await tx.orm.public.Room.where({ id: roomId }).first();
    if (!room || room.status !== "MAINTENANCE") return;

    const unresolved = await tx.orm.public.MaintenanceRequest
        .where({ roomId })
        .where((m) => m.status.neq("RESOLVED"))
        .first();
    if (unresolved) return;

    const openTask = await tx.orm.public.HousekeepingTask
        .where({ roomId })
        .where((t) => t.status.in(["PENDING", "IN_PROGRESS"]))
        .first();

    await tx.orm.public.Room.where({ id: roomId }).update({ status: openTask ? "CLEANING" : "AVAILABLE" });
}

export async function listMaintenanceRequests(filters: ListMaintenanceFilters, session: Session) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING");
    const { status, roomId, page, limit } = filters;

    let query = db.orm.public.MaintenanceRequest.where({});
    if (status) query = query.where({ status });
    if (roomId) query = query.where({ roomId });

    const { total } = await query.aggregate((a) => ({ total: a.count() }));
    const rows = await query
        .orderBy([(m) => m.createdAt.desc(), (m) => m.id.desc()])
        .include("room")
        .include("reportedBy")
        .limit(limit)
        .offset((page - 1) * limit)
        .all();

    return { items: rows.map(toItem), total, page, limit };
}

export async function getMaintenanceRequest(requestId: string, session: Session) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING");

    const request = await db.orm.public.MaintenanceRequest
        .where({ id: requestId })
        .include("room")
        .include("reportedBy")
        .first();
    if (!request) throw new NotFoundError("Maintenance request not found");

    return toItem(request);
}

// reporting an issue puts the room into Maintenance unless a guest is in it; an occupied room is left alone
export async function createMaintenanceRequest(input: CreateMaintenanceInput, session: Session) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING");

    return db.transaction(async (tx) => {
        const room = await tx.orm.public.Room.where({ id: input.roomId }).first();
        if (!room) throw new NotFoundError("Room not found");

        const request = await tx.orm.public.MaintenanceRequest.create({
            roomId: input.roomId,
            reportedById: session.employeeId,
            description: input.description,
            status: "OPEN",
            resolvedAt: null,
        });

        if (room.status !== "OCCUPIED") {
            await tx.orm.public.Room.where({ id: input.roomId }).update({ status: "MAINTENANCE" });
        }
        return { id: request.id };
    });
}

export async function updateMaintenanceRequest(
    requestId: string,
    input: UpdateMaintenanceInput,
    session: Session
): Promise<void> {
    assertRole(session, "ADMIN", "MANAGER");

    await db.transaction(async (tx) => {
        const request = await tx.orm.public.MaintenanceRequest.where({ id: requestId }).first();
        if (!request) throw new NotFoundError("Maintenance request not found");
        if (request.status === "RESOLVED") throw new ConflictError("A resolved request can no longer be changed");

        if (input.status !== undefined && STATUS_ORDER[input.status] < STATUS_ORDER[request.status]) {
            throw new ConflictError("A request cannot move back to an earlier status");
        }
        const statusChanged = input.status !== undefined && input.status !== request.status;
        const descriptionChanged = input.description !== undefined && input.description !== request.description;
        if (!statusChanged && !descriptionChanged) return;

        await tx.orm.public.MaintenanceRequest.where({ id: requestId }).update({
            ...(descriptionChanged && { description: input.description }),
            ...(statusChanged && { status: input.status }),
            ...(statusChanged && input.status === "RESOLVED" && { resolvedAt: new Date() }),
        });

        if (statusChanged && input.status === "RESOLVED") await releaseRoom(tx, request.roomId);
    });
}