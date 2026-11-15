import { faker } from "@faker-js/faker";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { calculateInvoice } from "../lib/calculateInvoice";

// run this script via `npx tsx src/prisma/seed.ts` or `npm run seed` (requires tsx: `npm install -D tsx`)
// for automatically seeding the backend database with fresh data (for testing and demo only; not for use during "real" deployments)
// WARNING: running the script will overwrite all pre-existing data in the database

faker.seed(42); // same data on every run

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ??
    (() => {
        throw new Error("DEMO_PASSWORD is missing from .env");
    })(); // default password for all employees in the seed data; loaded from .env (cannot run without it)

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const NOW = Date.now();

// ---------- how much data ----------

const EMPLOYEE_COUNT = 12; // including the hardcoded ones (there are always at least 5)
const GUEST_COUNT = 30; // including the hardcoded ones
const ROOM_COUNT = 16;
const RESERVATION_COUNT = 160; // including the hardcoded ones; fewer are made if the rooms can't fit them without overlapping dates
const MAINTENANCE_COUNT = 6; // half (rounded up) are still unresolved, the rest are resolved
const OPEN_TASK_COUNT = 3; // unfinished housekeeping tasks on top of the ones that today's check-outs create
const HISTORY_DAYS = 90; // how far back finished stays go
const FUTURE_DAYS = 30; // how far ahead upcoming stays go
const TAX_RATE = 0.1; // decimal representing a percentage i.e. 0.1 = 10%

// ---------- types ----------

type Role = "ADMIN" | "RECEPTIONIST" | "HOUSEKEEPING" | "MANAGER";
type RStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED" | "NO_SHOW";
type RoomState = "AVAILABLE" | "OCCUPIED" | "CLEANING" | "MAINTENANCE" | "RESERVED";
type TaskState = "PENDING" | "IN_PROGRESS" | "COMPLETED";
type MaintState = "OPEN" | "IN_PROGRESS" | "RESOLVED";
type InvState = "DRAFT" | "PAID" | "REFUNDED";
type Method = "CASH" | "CARD" | "UPI";

// a reservation and its related details
type Spec = {
    start: number; // days from today (negative = past); this is the check-in date
    nights: number;
    guest: number; // index into guests
    room: number | null; // index into rooms; null = no room assigned yet
    status: RStatus;
    adults: number; // 18 or over
    children: number; // 17 or younger
    method?: Method; // how the checked-out stay was paid
    discount?: number; // cents
    refund?: "full" | "partial"; // only for checked-out stays: the invoice ends up Refunded
    items?: { item: number; quantity: number }[]; // service charges: index into the service item catalog
};

type TaskRow = {
    id: string;
    roomId: string;
    assignedToId: string | null;
    status: TaskState;
    notes: string;
    startedAt: Date | null;
    completedAt: Date | null;
};

type MaintRow = {
    id: string;
    roomId: string;
    reportedById: string;
    description: string;
    status: MaintState;
    resolvedAt: Date | null;
};

type InvoiceRow = {
    id: string;
    reservationId: string;
    roomCharge: number;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    discount: number;
    total: number;
    status: InvState;
    paymentMethod: Method | null;
    paidAt: Date | null;
    paidById: string | null;
    refundedAt: Date | null;
    refundAmount: number | null;
    issuedAt: Date | null;
};

type ItemRow = {
    id: string;
    invoiceId: string;
    serviceItemId: string;
    name: string;
    unitPrice: number;
    quantity: number;
};

type EmployeeSeed = { name: string; email: string; role: Role; isActive: boolean; isAvailable: boolean };

// ---------- catalogs (money in cents) ----------

const CATEGORIES = [
    { name: "Standard", description: "A standard room for a short stay.", basePrice: 9900, maxOccupancy: 2 },
    { name: "Deluxe", description: "A larger room for more people or longer stays.", basePrice: 14900, maxOccupancy: 4 },
    { name: "Executive", description: "A premium room with extra accomodations.", basePrice: 19900, maxOccupancy: 6 },
    { name: "Suite", description: "A super-premium room with extra-extra accomodations.", basePrice: 24900, maxOccupancy: 6 },
    { name: "Presidential Suite", description: "The most luxurious accommodation we have to offer.", basePrice: 39900, maxOccupancy: 10 },
];

const SERVICE_ITEMS = [
    { name: "Room Food Order", price: 1800, isActive: true },
    { name: "Luxury Food Item", price: 3800, isActive: true },
    { name: "Laundry", price: 250, isActive: true },
    { name: "Spa", price: 2000, isActive: true },
    { name: "Massage", price: 7000, isActive: true },
    { name: "Extra Bed", price: 4000, isActive: true },
];

const ACTIVE_ITEMS = SERVICE_ITEMS.flatMap((s, i) => (s.isActive ? [i] : []));

const ROOM_PATTERN = [0, 0, 1, 0, 1, 2, 0, 3, 1, 2, 0, 1, 3, 0, 2, 4]; // category index for each room in turn

const NOTES = [
    "Late arrival expected",
    "Requests a high floor",
    "Celebrating an anniversary",
    "Needs an extra pillow",
    "Allergic to feather bedding",
    "Early check-in requested",
];

const ISSUES = [
    "Air conditioner not cooling",
    "Leaking faucet in the bathroom",
    "TV not turning on",
    "Door lock sticking",
    "Water heater not heating",
    "Light fixture flickering",
    "Wi-Fi router offline",
    "Shower drain clogged",
    "Window latch broken",
    "Minibar not cooling",
];

// ---------- helpers ----------

const slug = (n: string) => n.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");

// emails come from names, so every name has to be unique
const usedNames = new Set(["Admin", "Maria Lopez", "Daniel Kim", "Priya Nair", "Tom Becker", "Emma Wilson", "Liam Carter"]);
function uniqueName(): string {
    let name: string;
    do name = `${faker.person.firstName()} ${faker.person.lastName()}`;
    while (usedNames.has(name));
    usedNames.add(name);
    return name;
}

function dayAt(offset: number, hour: number, min = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    d.setHours(hour, min, 0, 0);
    return d;
}

function dateOnly(offset: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const notFuture = (d: Date) => new Date(Math.min(d.getTime(), NOW - HOUR));

async function insertAll<T>(rows: T[], insert: (batch: T[]) => PromiseLike<unknown>): Promise<void> {
    for (let i = 0; i < rows.length; i += 500) await insert(rows.slice(i, i + 500));
}

// ---------- employees (the first five are hardcoded, the rest are generated housekeeping staff) ----------

const employeeSeeds: EmployeeSeed[] = [
    { name: "Admin", email: "admin@hotel.test", role: "ADMIN", isActive: true, isAvailable: true },
    { name: "Maria Lopez", email: "manager@hotel.test", role: "MANAGER", isActive: true, isAvailable: true },
    { name: "Daniel Kim", email: "receptionist@hotel.test", role: "RECEPTIONIST", isActive: true, isAvailable: true },
    { name: "Priya Nair", email: "housekeeping@hotel.test", role: "HOUSEKEEPING", isActive: true, isAvailable: true },
    { name: "Tom Becker", email: "housekeeping2@hotel.test", role: "HOUSEKEEPING", isActive: true, isAvailable: true },
    ...Array.from({ length: Math.max(0, EMPLOYEE_COUNT - 5) }, (): EmployeeSeed => {
        const name = uniqueName();
        return {
            name,
            email: `${slug(name)}@hotel.test`,
            role: "HOUSEKEEPING",
            isActive: !faker.datatype.boolean({ probability: 0.12 }), // about 1 in 8 are deactivated
            isAvailable: !faker.datatype.boolean({ probability: 0.2 }),
        };
    }),
];

// ---------- guests (hardcoded first, then generated up to GUEST_COUNT) ----------

// add any guests you want by hand to this list, and to the usedNames set near the top
const hardcodedGuests = ["Emma Wilson", "Liam Carter"];
const guestNames = [
    ...hardcodedGuests,
    ...Array.from({ length: Math.max(0, GUEST_COUNT - hardcodedGuests.length) }, () => uniqueName()),
];

// ---------- reservation scenarios ----------

const specs: Spec[] = [];
const booked: { start: number; end: number }[][] = Array.from({ length: ROOM_COUNT }, () => []);

// a room can never hold two reservations whose dates overlap (a check-out and a check-in on the same day is fine)
function place(spec: Spec): boolean {
    if (spec.room !== null) {
        const end = spec.start + spec.nights;
        if (booked[spec.room].some((b) => spec.start < b.end && b.start < end)) return false;
        booked[spec.room].push({ start: spec.start, end });
    }
    specs.push(spec);
    return true;
}

const STATUS_WEIGHTS: { weight: number; value: RStatus }[] = [
    { weight: 55, value: "CHECKED_OUT" },
    { weight: 14, value: "CONFIRMED" },
    { weight: 8, value: "CANCELLED" },
    { weight: 6, value: "PENDING" },
    { weight: 5, value: "NO_SHOW" },
    { weight: 4, value: "CHECKED_IN" },
];

const NIGHT_WEIGHTS = [
    { weight: 15, value: 1 },
    { weight: 30, value: 2 },
    { weight: 25, value: 3 },
    { weight: 15, value: 4 },
    { weight: 8, value: 5 },
    { weight: 7, value: 7 },
];

// Picks a random status first, then picks dates that fit it, so the data never contradicts itself:
// checked-out and no-show stays are in the past, checked-in stays cover today, confirmed and pending ones are ahead,
// and only pending reservations can be missing a room.
function randomSpec(): Spec {
    const status = faker.helpers.weightedArrayElement(STATUS_WEIGHTS);
    const nights = faker.helpers.weightedArrayElement(NIGHT_WEIGHTS);

    let start: number;
    if (status === "CHECKED_OUT") start = faker.number.int({ min: -HISTORY_DAYS, max: -1 - nights });
    else if (status === "NO_SHOW") start = faker.number.int({ min: -HISTORY_DAYS, max: -nights });
    else if (status === "CHECKED_IN") start = faker.number.int({ min: Math.max(-3, 1 - nights), max: 0 });
    else if (status === "CANCELLED") start = faker.number.int({ min: -HISTORY_DAYS, max: FUTURE_DAYS });
    else if (status === "CONFIRMED") start = faker.number.int({ min: 0, max: FUTURE_DAYS });
    else start = faker.number.int({ min: 1, max: FUTURE_DAYS });

    const noRoom = status === "PENDING" && faker.datatype.boolean({ probability: 0.35 });

    return {
        start,
        nights,
        status,
        guest: faker.number.int({ min: 0, max: guestNames.length - 1 }),
        room: noRoom ? null : faker.number.int({ min: 0, max: ROOM_COUNT - 1 }),
        adults: faker.number.int({ min: 1, max: 3 }),
        children: faker.helpers.weightedArrayElement([
            { weight: 70, value: 0 },
            { weight: 20, value: 1 },
            { weight: 10, value: 2 },
        ]),
        method: faker.helpers.arrayElement<Method>(["CASH", "CARD", "UPI"]),
        discount: faker.datatype.boolean({ probability: 0.2 })
            ? faker.number.int({ min: 500, max: 3000, multipleOf: 100 })
            : undefined,
        refund:
            status === "CHECKED_OUT" && faker.datatype.boolean({ probability: 0.1 })
                ? faker.helpers.arrayElement<"full" | "partial">(["full", "partial"])
                : undefined,
        items: faker.datatype.boolean({ probability: 0.6 })
            ? faker.helpers.arrayElements(ACTIVE_ITEMS, { min: 1, max: 3 }).map((item) => ({
                item,
                quantity: faker.number.int({ min: 1, max: 3 }),
            }))
            : undefined,
    };
}

// the ones kept by hand: today's check-ins and check-outs and the states the random ones might miss
const HARDCODED_SPECS: Spec[] = [
    // checked in today and still in house
    { start: 0, nights: 2, guest: 0, room: 0, status: "CHECKED_IN", adults: 2, children: 0, items: [{ item: 0, quantity: 2 }] },
    // due out tomorrow
    { start: -2, nights: 3, guest: 1, room: 1, status: "CHECKED_IN", adults: 2, children: 0 },
    // due out today
    { start: -3, nights: 3, guest: 2, room: 2, status: "CHECKED_IN", adults: 1, children: 0, items: [{ item: 1, quantity: 1 }, { item: 2, quantity: 2 }] },
    { start: -2, nights: 2, guest: 3, room: 3, status: "CHECKED_IN", adults: 2, children: 0 },
    // already checked out today (their rooms need cleaning)
    { start: -2, nights: 2, guest: 4, room: 4, status: "CHECKED_OUT", adults: 2, children: 0, method: "CARD" },
    { start: -1, nights: 1, guest: 5, room: 5, status: "CHECKED_OUT", adults: 1, children: 0, method: "CASH", discount: 1000 },
    // arriving today
    { start: 0, nights: 3, guest: 6, room: 6, status: "CONFIRMED", adults: 2, children: 0 },
    { start: 0, nights: 2, guest: 7, room: 7, status: "CONFIRMED", adults: 2, children: 1 },
    // one of each state the random ones might miss
    { start: 2, nights: 2, guest: 8, room: null, status: "PENDING", adults: 2, children: 0 },
    { start: 4, nights: 3, guest: 9, room: null, status: "PENDING", adults: 1, children: 0 },
    { start: -2, nights: 2, guest: 10, room: 8, status: "NO_SHOW", adults: 2, children: 0 },
    { start: 6, nights: 2, guest: 11, room: 9, status: "CANCELLED", adults: 2, children: 0 },
    { start: -20, nights: 3, guest: 12, room: 10, status: "CHECKED_OUT", adults: 2, children: 0, method: "CARD", refund: "full" },
    { start: -35, nights: 2, guest: 13, room: 11, status: "CHECKED_OUT", adults: 2, children: 0, method: "UPI", refund: "partial" },
];

for (const spec of HARDCODED_SPECS.filter((s) => s.room === null || s.room < ROOM_COUNT)) {
    if (!place(spec)) throw new Error("Two hardcoded reservations overlap on the same room");
}

for (let attempts = 0; specs.length < RESERVATION_COUNT && attempts < RESERVATION_COUNT * 30; attempts++) {
    place(randomSpec());
}

// ---------- the seed ----------

async function main() {
    // clear children before parents
    await db.orm.public.InvoiceItem.where({}).deleteAll();
    await db.orm.public.Invoice.where({}).deleteAll();
    await db.orm.public.HousekeepingTask.where({}).deleteAll();
    await db.orm.public.MaintenanceRequest.where({}).deleteAll();
    await db.orm.public.Reservation.where({}).deleteAll();
    await db.orm.public.Room.where({}).deleteAll();
    await db.orm.public.RoomCategory.where({}).deleteAll();
    await db.orm.public.ServiceItem.where({}).deleteAll();
    await db.orm.public.Guest.where({}).deleteAll();
    await db.orm.public.Employee.where({}).deleteAll();

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    // ---- employees ----
    const employeeIds = employeeSeeds.map(() => randomUUID());
    await insertAll(
        employeeSeeds.map((e, i) => ({
            id: employeeIds[i],
            email: e.email,
            passwordHash,
            fullName: e.name,
            phone: `555-02${String(i + 1).padStart(2, "0")}`,
            role: e.role,
            isActive: e.isActive,
            isAvailable: e.isAvailable,
        })),
        (batch) => db.orm.public.Employee.createAll(batch)
    );

    const desk = employeeSeeds.flatMap((e, i) => (e.role !== "HOUSEKEEPING" ? [employeeIds[i]] : []));
    const housekeepers = employeeSeeds.flatMap((e, i) =>
        e.role === "HOUSEKEEPING" && e.isActive && e.isAvailable ? [employeeIds[i]] : []
    );
    const anyActive = employeeSeeds.flatMap((e, i) => (e.isActive ? [employeeIds[i]] : []));

    // ---- catalogs ----
    const categoryIds = CATEGORIES.map(() => randomUUID());
    await db.orm.public.RoomCategory.createAll(
        CATEGORIES.map((c, i) => ({ id: categoryIds[i], ...c, isActive: true }))
    );

    const serviceItemIds = SERVICE_ITEMS.map(() => randomUUID());
    await db.orm.public.ServiceItem.createAll(SERVICE_ITEMS.map((s, i) => ({ id: serviceItemIds[i], ...s })));

    // ---- rooms (their status is worked out below, once the reservations are known) ----
    const rooms = Array.from({ length: ROOM_COUNT }, (_, i) => {
        const categoryIndex = ROOM_PATTERN[i % ROOM_PATTERN.length];
        const category = CATEGORIES[categoryIndex];
        const adjusted = faker.datatype.boolean({ probability: 0.25 });
        return {
            id: randomUUID(),
            roomNumber: `${Math.floor(i / 5) + 1}${String((i % 5) + 1).padStart(2, "0")}`,
            categoryId: categoryIds[categoryIndex],
            price: adjusted
                ? Math.round((category.basePrice * faker.number.float({ min: 0.9, max: 1.15 })) / 100) * 100
                : category.basePrice,
            maxOccupancy: category.maxOccupancy,
        };
    });

    // ---- guests ----
    const guestIds = guestNames.map(() => randomUUID());
    const guestRows = guestNames.map((name, i) => ({
        id: guestIds[i],
        fullName: name,
        email: `${slug(name)}@example.com`,
        phone: `555-01${String(i + 1).padStart(2, "0")}`,
        address: `${faker.location.streetAddress()}, ${faker.location.city()}`,
    }));

    // ---- reservations and everything derived from them ----
    const plans = specs.map((spec) => {
        const room = spec.room === null ? null : rooms[spec.room];
        const max = room ? room.maxOccupancy : 4;
        const adults = Math.min(spec.adults, max);
        const children = Math.min(spec.children, max - adults);
        const end = spec.start + spec.nights;
        return {
            id: randomUUID(),
            spec,
            room,
            adults,
            children,
            end,
            checkInAt: notFuture(dayAt(spec.start, faker.number.int({ min: 13, max: 18 }), faker.helpers.arrayElement([0, 30]))),
            checkOutAt: notFuture(dayAt(end, faker.number.int({ min: 9, max: 12 }), faker.helpers.arrayElement([0, 30]))),
            createdById: faker.helpers.arrayElement(desk),
            notes: faker.datatype.boolean({ probability: 0.3 }) ? faker.helpers.arrayElement(NOTES) : null,
            cancelledAt:
                spec.status === "CANCELLED"
                    ? notFuture(new Date(dayAt(spec.start, 12).getTime() - faker.number.int({ min: 1, max: 10 }) * DAY))
                    : null,
        };
    });

    // ---- room status, housekeeping tasks, maintenance ----
    // a room is Occupied only while a checked-in stay is using it, Cleaning while a task is unfinished,
    // Maintenance while a request is unresolved, and Reserved when a confirmed guest arrives today
    const roomState: RoomState[] = rooms.map(() => "AVAILABLE");
    const occupied = new Set(
        plans.flatMap((p) => (p.spec.status === "CHECKED_IN" && p.spec.room !== null ? [p.spec.room] : []))
    );
    occupied.forEach((r) => {
        roomState[r] = "OCCUPIED";
    });

    const tasks: TaskRow[] = [];
    let openIndex = 0;
    function openTask(roomIndex: number, notes: string) {
        const mode = openIndex++ % 3; // unassigned, assigned, in progress
        roomState[roomIndex] = "CLEANING";
        tasks.push({
            id: randomUUID(),
            roomId: rooms[roomIndex].id,
            assignedToId: mode === 0 ? null : faker.helpers.arrayElement(housekeepers),
            status: mode === 2 ? "IN_PROGRESS" : "PENDING",
            notes,
            startedAt: mode === 2 ? new Date(NOW - 30 * 60_000) : null,
            completedAt: null,
        });
    }

    for (const p of plans) {
        if (p.spec.status !== "CHECKED_OUT" || p.spec.room === null) continue;

        if (p.end === 0 && !occupied.has(p.spec.room)) {
            openTask(p.spec.room, "Turnover clean after check-out");
            continue;
        }

        const startedAt = notFuture(new Date(p.checkOutAt.getTime() + faker.number.int({ min: 30, max: 90 }) * 60_000));
        const completedAt = notFuture(new Date(startedAt.getTime() + faker.number.int({ min: 30, max: 60 }) * 60_000));
        tasks.push({
            id: randomUUID(),
            roomId: rooms[p.spec.room].id,
            assignedToId: faker.helpers.arrayElement(housekeepers),
            status: "COMPLETED",
            notes: "Turnover clean after check-out",
            startedAt,
            completedAt,
        });
    }

    for (const p of plans) {
        if (
            p.spec.status === "CONFIRMED" &&
            p.spec.start === 0 &&
            p.spec.room !== null &&
            roomState[p.spec.room] === "AVAILABLE"
        ) {
            roomState[p.spec.room] = "RESERVED";
        }
    }

    // rooms with a stay today or tomorrow are left alone, so maintenance and extra cleaning only hit free rooms
    const busy = new Set(
        plans.flatMap((p) =>
            p.spec.room !== null &&
                ["CHECKED_IN", "CONFIRMED", "PENDING"].includes(p.spec.status) &&
                p.spec.start < 2 &&
                p.end >= 0
                ? [p.spec.room]
                : []
        )
    );
    const pool = faker.helpers.shuffle(rooms.flatMap((_, i) => (roomState[i] === "AVAILABLE" && !busy.has(i) ? [i] : [])));

    const maintenance: MaintRow[] = [];
    const unresolved = Math.min(Math.ceil(MAINTENANCE_COUNT / 2), pool.length);
    for (let k = 0; k < unresolved; k++) {
        const roomIndex = pool.shift()!;
        roomState[roomIndex] = "MAINTENANCE";
        maintenance.push({
            id: randomUUID(),
            roomId: rooms[roomIndex].id,
            reportedById: faker.helpers.arrayElement(anyActive),
            description: faker.helpers.arrayElement(ISSUES),
            status: k % 2 === 0 ? "OPEN" : "IN_PROGRESS",
            resolvedAt: null,
        });
    }
    for (let k = 0; k < MAINTENANCE_COUNT - unresolved; k++) {
        maintenance.push({
            id: randomUUID(),
            roomId: rooms[faker.number.int({ min: 0, max: ROOM_COUNT - 1 })].id,
            reportedById: faker.helpers.arrayElement(anyActive),
            description: faker.helpers.arrayElement(ISSUES),
            status: "RESOLVED",
            resolvedAt: notFuture(dayAt(-faker.number.int({ min: 1, max: HISTORY_DAYS }), 15)),
        });
    }

    for (let k = 0; k < OPEN_TASK_COUNT && pool.length > 0; k++) {
        openTask(pool.shift()!, "Deep clean and inspection");
    }

    // ---- invoices: a draft for every checked-in stay, a paid (or refunded) one for every checked-out stay ----
    const invoiceRows: InvoiceRow[] = [];
    const itemRows: ItemRow[] = [];
    for (const p of plans) {
        const { spec, room } = p;
        if (!room || (spec.status !== "CHECKED_OUT" && spec.status !== "CHECKED_IN")) continue;

        const invoiceId = randomUUID();
        const finished = spec.status === "CHECKED_OUT";
        const lines = (spec.items ?? []).map(({ item, quantity }) => ({
            id: randomUUID(),
            invoiceId,
            serviceItemId: serviceItemIds[item],
            name: SERVICE_ITEMS[item].name,
            unitPrice: SERVICE_ITEMS[item].price,
            quantity,
        }));
        itemRows.push(...lines);

        const calc = calculateInvoice({
            roomCharge: room.price * spec.nights,
            items: lines,
            discount: finished ? spec.discount ?? 0 : 0,
            taxRate: TAX_RATE,
        });
        const status: InvState = !finished ? "DRAFT" : spec.refund ? "REFUNDED" : "PAID";
        const paidAt = finished ? p.checkOutAt : null;

        invoiceRows.push({
            id: invoiceId,
            reservationId: p.id,
            roomCharge: room.price * spec.nights,
            subtotal: calc.subtotal,
            taxRate: TAX_RATE,
            taxAmount: calc.taxAmount,
            discount: calc.appliedDiscount,
            total: calc.total,
            status,
            paymentMethod: finished ? spec.method ?? "CARD" : null,
            paidAt,
            paidById: finished ? faker.helpers.arrayElement(desk) : null,
            refundedAt:
                status === "REFUNDED" && paidAt
                    ? notFuture(new Date(paidAt.getTime() + faker.number.int({ min: 2, max: 48 }) * HOUR))
                    : null,
            refundAmount:
                status === "REFUNDED" ? (spec.refund === "full" ? calc.total : Math.floor(calc.total / 200) * 100) : null,
            issuedAt: paidAt,
        });
    }

    // ---- write everything (parents before children) ----
    await insertAll(
        rooms.map((r, i) => ({ ...r, images: [] as string[], status: roomState[i] })),
        (batch) => db.orm.public.Room.createAll(batch)
    );
    await insertAll(guestRows, (batch) => db.orm.public.Guest.createAll(batch));
    await insertAll(
        plans.map((p) => ({
            id: p.id,
            guestId: guestIds[p.spec.guest % guestIds.length],
            roomId: p.room ? p.room.id : null,
            status: p.spec.status,
            checkInDate: dateOnly(p.spec.start),
            checkOutDate: dateOnly(p.end),
            adults: p.adults,
            children: p.children,
            actualCheckIn: p.spec.status === "CHECKED_IN" || p.spec.status === "CHECKED_OUT" ? p.checkInAt : null,
            actualCheckOut: p.spec.status === "CHECKED_OUT" ? p.checkOutAt : null,
            notes: p.notes,
            createdById: p.createdById,
            cancelledAt: p.cancelledAt,
        })),
        (batch) => db.orm.public.Reservation.createAll(batch)
    );
    await insertAll(invoiceRows, (batch) => db.orm.public.Invoice.createAll(batch));
    await insertAll(itemRows, (batch) => db.orm.public.InvoiceItem.createAll(batch));
    await insertAll(tasks, (batch) => db.orm.public.HousekeepingTask.createAll(batch));
    await insertAll(maintenance, (batch) => db.orm.public.MaintenanceRequest.createAll(batch));

    if (plans.length < RESERVATION_COUNT) {
        console.warn(`Only ${plans.length} of ${RESERVATION_COUNT} reservations fit; add rooms or lower RESERVATION_COUNT`);
    }
    console.log("Data Seeded");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .then(() => process.exit(0)); // the DB client may keep the process alive otherwise