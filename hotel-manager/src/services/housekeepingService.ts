import { db, type Tx } from "@/prisma/db";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/apiResponse";
import { assertRole } from "@/lib/serviceHelpers";
import type { Session } from "@/services/authService";
import type { CreateTaskInput, ListTasksFilters, UpdateTaskInput } from "@/schemas/housekeeping";

async function assertAssignable(tx: Tx, employeeId: string) {
    const employee = await tx.orm.public.Employee.where({ id: employeeId }).first();
    if (!employee) throw new NotFoundError("Employee not found");
    if (employee.role !== "HOUSEKEEPING") throw new ConflictError("Tasks can only be assigned to housekeeping staff");
    if (!employee.isActive) throw new ConflictError("Inactive staff cannot be assigned");
    if (!employee.isAvailable) throw new ConflictError(`${employee.fullName} is not available`);
}

// housekeeping staff can only work on tasks that are theirs or that nobody has taken yet (working on one takes it);
// admins and managers work on behalf of whoever the task is assigned to, so it must be assigned first
function workerFor(task: { assignedToId: string | null }, session: Session): string {
    if (session.role === "HOUSEKEEPING") {
        if (task.assignedToId && task.assignedToId !== session.employeeId) {
            throw new ForbiddenError("This task is assigned to someone else");
        }
        return session.employeeId;
    }
    if (!task.assignedToId) throw new ConflictError("Assign this task before working on it");
    return task.assignedToId;
}

function toItem(
    t: {
        id: string;
        roomId: string;
        assignedToId: string | null;
        status: string;
        notes: string | null;
        startedAt: Date | null;
        completedAt: Date | null;
        createdAt: Date;
        room: { roomNumber: string };
        assignedTo: { fullName: string } | null;
    },
    session: Session
) {
    return {
        id: t.id,
        roomId: t.roomId,
        roomNumber: t.room.roomNumber,
        assignedToId: t.assignedToId,
        assignedToName: t.assignedTo?.fullName ?? null,
        isMine: t.assignedToId === session.employeeId,
        status: t.status,
        notes: t.notes,
        startedAt: t.startedAt,
        completedAt: t.completedAt,
        createdAt: t.createdAt,
    };
}

export async function listTasks(filters: ListTasksFilters, session: Session) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING");
    const { status, roomId, assignedToId, unassigned, mine, page, limit } = filters;

    let query = db.orm.public.HousekeepingTask.where({});
    if (status) query = query.where({ status });
    if (roomId) query = query.where({ roomId });

    const assignee = mine ? session.employeeId : assignedToId;
    if (assignee) query = query.where({ assignedToId: assignee });
    else if (unassigned) query = query.where((t) => t.assignedToId.isNull());

    const { total } = await query.aggregate((a) => ({ total: a.count() }));
    const rows = await query
        .orderBy([(t) => t.createdAt.desc(), (t) => t.id.desc()])
        .include("room")
        .include("assignedTo")
        .limit(limit)
        .offset((page - 1) * limit)
        .all();

    return { items: rows.map((t) => toItem(t, session)), total, page, limit };
}

export async function getTask(taskId: string, session: Session) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING");

    const task = await db.orm.public.HousekeepingTask
        .where({ id: taskId })
        .include("room")
        .include("assignedTo")
        .first();
    if (!task) throw new NotFoundError("Task not found");

    return toItem(task, session);
}

// an unfinished task puts a free room into Cleaning; occupied and under-maintenance rooms keep their status
export async function createTask(input: CreateTaskInput, session: Session) {
    assertRole(session, "ADMIN", "MANAGER");

    return db.transaction(async (tx) => {
        const room = await tx.orm.public.Room.where({ id: input.roomId }).first();
        if (!room) throw new NotFoundError("Room not found");

        const open = await tx.orm.public.HousekeepingTask
            .where({ roomId: input.roomId })
            .where((t) => t.status.in(["PENDING", "IN_PROGRESS"]))
            .first();
        if (open) throw new ConflictError("This room already has an unfinished housekeeping task");

        if (input.assignedToId) await assertAssignable(tx, input.assignedToId);

        const task = await tx.orm.public.HousekeepingTask.create({
            roomId: input.roomId,
            assignedToId: input.assignedToId,
            status: "PENDING",
            notes: input.notes,
            startedAt: null,
            completedAt: null,
        });

        if (room.status === "AVAILABLE" || room.status === "RESERVED") {
            await tx.orm.public.Room.where({ id: input.roomId }).update({ status: "CLEANING" });
        }
        return { id: task.id };
    });
}

export async function updateTask(taskId: string, input: UpdateTaskInput, session: Session): Promise<void> {
    assertRole(session, "ADMIN", "MANAGER");

    await db.transaction(async (tx) => {
        const task = await tx.orm.public.HousekeepingTask.where({ id: taskId }).first();
        if (!task) throw new NotFoundError("Task not found");
        if (task.status === "COMPLETED") throw new ConflictError("A completed task can no longer be changed");

        if (input.assignedToId !== undefined && input.assignedToId !== task.assignedToId) {
            if (task.status !== "PENDING") throw new ConflictError("A task can only be reassigned before it starts");
            if (input.assignedToId !== null) await assertAssignable(tx, input.assignedToId);
        }

        await tx.orm.public.HousekeepingTask.where({ id: taskId }).update(input);
    });
}

export async function startTask(taskId: string, session: Session): Promise<void> {
    assertRole(session, "ADMIN", "MANAGER", "HOUSEKEEPING");

    await db.transaction(async (tx) => {
        const task = await tx.orm.public.HousekeepingTask.where({ id: taskId }).first();
        if (!task) throw new NotFoundError("Task not found");
        if (task.status !== "PENDING") throw new ConflictError(`A ${task.status.toLowerCase().replace("_", " ")} task cannot be started`);

        const worker = workerFor(task, session);
        await tx.orm.public.HousekeepingTask
            .where({ id: taskId })
            .update({ status: "IN_PROGRESS", startedAt: new Date(), assignedToId: worker });
    });
}

// marking a task completed is what marks the room as cleaned: a Cleaning room becomes Available
export async function completeTask(taskId: string, session: Session): Promise<void> {
    assertRole(session, "ADMIN", "MANAGER", "HOUSEKEEPING");

    await db.transaction(async (tx) => {
        const task = await tx.orm.public.HousekeepingTask.where({ id: taskId }).first();
        if (!task) throw new NotFoundError("Task not found");
        if (task.status === "COMPLETED") throw new ConflictError("This task is already completed");

        const worker = workerFor(task, session);
        const now = new Date();
        await tx.orm.public.HousekeepingTask.where({ id: taskId }).update({
            status: "COMPLETED",
            startedAt: task.startedAt ?? now,
            completedAt: now,
            assignedToId: worker,
        });

        const room = await tx.orm.public.Room.where({ id: task.roomId }).first();
        if (room && room.status === "CLEANING") {
            await tx.orm.public.Room.where({ id: task.roomId }).update({ status: "AVAILABLE" });
        }
    });
}