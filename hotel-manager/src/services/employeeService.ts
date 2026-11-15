import { randomInt } from "node:crypto";
import { db } from "@/prisma/db";
import { or } from "@prisma/orm-postgres/orm-client";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/apiResponse";
import { hashPassword } from "@/lib/passwordSecurity";
import { assertRole, likePattern } from "@/lib/serviceHelpers";
import type { Session } from "@/services/authService";
import type { Role } from "@/types/employee";
import type { CreateEmployeeInput, ListEmployeesFilters, UpdateEmployeeInput } from "@/schemas/employee";

// autogenerates a password: 12 chars alphanumeric-only and lookalike characters excluded
const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
function generatePassword(length = 12): string {
    return Array.from({ length }, () => PASSWORD_CHARS[randomInt(PASSWORD_CHARS.length)]).join("");
}

function assertCanManage(session: Session, targetRole: Role) {
    if (targetRole === "ADMIN" && session.role !== "ADMIN") {
        throw new ForbiddenError("Only admins can manage admin accounts");
    }
}

function toSummary(e: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: Role;
    isActive: boolean;
    isAvailable: boolean;
    createdAt: Date;
}) {
    return {
        id: e.id,
        fullName: e.fullName,
        email: e.email,
        phone: e.phone,
        role: e.role,
        isActive: e.isActive,
        isAvailable: e.isAvailable,
        createdAt: e.createdAt,
    };
}

// #region READ OPERATIONS

export async function listEmployees(filters: ListEmployeesFilters, session: Session) {
    assertRole(session, "ADMIN", "MANAGER");
    const { search, role, isActive, isAvailable, page, limit } = filters;

    let query = db.orm.public.Employee.where({});
    if (role) query = query.where({ role });
    if (isActive !== undefined) query = query.where({ isActive });
    if (isAvailable !== undefined) query = query.where({ isAvailable });

    if (search) {
        const pattern = likePattern(search);
        query = query.where((e) => or(e.fullName.ilike(pattern), e.email.ilike(pattern)));
    }

    const { total } = await query.aggregate((a) => ({ total: a.count() }));
    const rows = await query
        .orderBy([(e) => e.fullName.asc(), (e) => e.id.asc()])
        .limit(limit)
        .offset((page - 1) * limit)
        .all();

    return { items: rows.map(toSummary), total, page, limit };
}

export async function getEmployee(employeeId: string, session: Session) {
    assertRole(session, "ADMIN", "MANAGER");

    const employee = await db.orm.public.Employee.where({ id: employeeId }).first();
    if (!employee) throw new NotFoundError("Employee not found");

    const open = await db.orm.public.HousekeepingTask
        .where({ assignedToId: employeeId })
        .where((t) => t.status.in(["PENDING", "IN_PROGRESS"]))
        .orderBy((t) => t.createdAt.asc())
        .include("room")
        .all();

    const { total: completedTasks } = await db.orm.public.HousekeepingTask
        .where({ assignedToId: employeeId, status: "COMPLETED" })
        .aggregate((a) => ({ total: a.count() }));

    return {
        ...toSummary(employee),
        completedTasks,
        openTasks: open.map((t) => ({
            id: t.id,
            roomNumber: t.room.roomNumber,
            status: t.status,
            createdAt: t.createdAt,
        })),
    };
}

// #endregion READ OPERATIONS

// #region WRITE OPERATIONS

export async function createEmployee(input: CreateEmployeeInput, session: Session) {
    assertRole(session, "ADMIN", "MANAGER");
    assertCanManage(session, input.role);

    const email = input.email.toLowerCase();
    const password = generatePassword();
    const passwordHash = await hashPassword(password);

    return db.transaction(async (tx) => {
        const existing = await tx.orm.public.Employee.where({ email }).first();
        if (existing) throw new ConflictError("An employee with this email already exists");

        const employee = await tx.orm.public.Employee.create({
            email,
            passwordHash,
            fullName: input.fullName,
            phone: input.phone,
            role: input.role,
            isActive: true,
            isAvailable: true,
        });

        return { id: employee.id, email, temporaryPassword: password };
    });
}

export async function updateEmployee(employeeId: string, input: UpdateEmployeeInput, session: Session): Promise<void> {
    assertRole(session, "ADMIN", "MANAGER");
    const { email, ...rest } = input;

    await db.transaction(async (tx) => {
        const employee = await tx.orm.public.Employee.where({ id: employeeId }).first();
        if (!employee) throw new NotFoundError("Employee not found");
        assertCanManage(session, employee.role);

        if (input.role !== undefined) {
            assertCanManage(session, input.role);
            if (employeeId === session.employeeId && input.role !== employee.role) {
                throw new ConflictError("You cannot change your own role");
            }
        }

        const newEmail = email?.toLowerCase();
        if (newEmail) {
            const taken = await tx.orm.public.Employee.where({ email: newEmail }).first();
            if (taken && taken.id !== employeeId) throw new ConflictError("An employee with this email already exists");
        }

        await tx.orm.public.Employee.where({ id: employeeId }).update({
            ...rest,
            ...(newEmail !== undefined && { email: newEmail }),
        });
    });
}

export async function setEmployeeActive(employeeId: string, active: boolean, session: Session): Promise<void> {
    assertRole(session, "ADMIN", "MANAGER");

    await db.transaction(async (tx) => {
        const employee = await tx.orm.public.Employee.where({ id: employeeId }).first();
        if (!employee) throw new NotFoundError("Employee not found");
        assertCanManage(session, employee.role);

        if (!active) {
            if (employeeId === session.employeeId) throw new ConflictError("You cannot deactivate your own account");

            const open = await tx.orm.public.HousekeepingTask
                .where({ assignedToId: employeeId })
                .where((t) => t.status.in(["PENDING", "IN_PROGRESS"]))
                .all();
            if (open.length > 0) {
                throw new ConflictError(`Cannot deactivate: ${open.length} unfinished task(s) assigned. Reassign them first`);
            }
        }

        await tx.orm.public.Employee.where({ id: employeeId }).update({ isActive: active });
    });
}

// if an employee forgets their password an admin or manager can reset it (autogenerates a new password)
export async function resetEmployeePassword(employeeId: string, session: Session) {
    assertRole(session, "ADMIN", "MANAGER");

    const employee = await db.orm.public.Employee.where({ id: employeeId }).first();
    if (!employee) throw new NotFoundError("Employee not found");
    assertCanManage(session, employee.role);

    const password = generatePassword();
    const passwordHash = await hashPassword(password);
    await db.orm.public.Employee.where({ id: employeeId }).update({ passwordHash });

    return { temporaryPassword: password };
}

// #endregion WRITE OPERATIONS