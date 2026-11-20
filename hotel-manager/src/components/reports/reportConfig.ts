export type SummaryField = {
    key: string;
    label: string;
    money?: boolean;
    percent?: boolean;
};

export const REPORTS = {
    revenue: {
        label: "Revenue",
        summary: [
            { key: "totalInvoices", label: "Invoices" },
            { key: "grossRevenue", label: "Gross revenue", money: true },
            { key: "refunds", label: "Refunds", money: true },
            { key: "netRevenue", label: "Net revenue", money: true },
        ] as SummaryField[],
    },
    occupancy: {
        label: "Occupancy",
        summary: [
            { key: "totalRoomNights", label: "Room nights" },
            { key: "averageOccupancyRate", label: "Average occupancy", percent: true },
        ] as SummaryField[],
    },
    cancellations: {
        label: "Cancellations",
        summary: [
            { key: "totalCancelled", label: "Cancellations" },
            { key: "cancelledNights", label: "Nights lost" },
        ] as SummaryField[],
    },
    "room-categories": {
        label: "Room categories",
        summary: [
            { key: "totalBookings", label: "Bookings" },
            { key: "mostPopular", label: "Most popular" },
        ] as SummaryField[],
    },
    guests: {
        label: "Guests",
        summary: [
            { key: "guestsOnRecord", label: "Guests on record" },
            { key: "uniqueGuests", label: "Guests with a stay" },
            { key: "totalStays", label: "Stays" },
            { key: "averageStayNights", label: "Average stay (nights)" },
            { key: "repeatGuests", label: "Repeat guests" },
            { key: "totalSpent", label: "Total spent", money: true },
        ] as SummaryField[],
    },
    "staff-tasks": {
        label: "Staff tasks",
        summary: [
            { key: "totalCompleted", label: "Tasks completed" },
            { key: "unassignedOpenTasks", label: "Unassigned open tasks" },
        ] as SummaryField[],
    },
};

export type ReportSlug = keyof typeof REPORTS;

export const REPORT_SLUGS = Object.keys(REPORTS) as ReportSlug[];