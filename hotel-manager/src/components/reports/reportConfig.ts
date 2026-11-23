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
            { key: "totalInvoices", label: "Invoices Processed" },
            { key: "grossRevenue", label: "Gross Revenue", money: true },
            { key: "refunds", label: "Refunds", money: true },
            { key: "netRevenue", label: "Net Revenue", money: true },
        ] as SummaryField[],
    },
    occupancy: {
        label: "Occupancy",
        summary: [
            { key: "totalRoomNights", label: "Room Nights" },
            { key: "averageOccupancyRate", label: "Average Occupancy Rate", percent: true },
        ] as SummaryField[],
    },
    cancellations: {
        label: "Cancellations",
        summary: [
            { key: "totalCancelled", label: "Cancelled Reservations" },
        ] as SummaryField[],
    },
    "room-categories": {
        label: "Room Categories",
        summary: [
            { key: "totalBookings", label: "Bookings" },
            { key: "mostPopular", label: "Most Popular" },
        ] as SummaryField[],
    },
    guests: {
        label: "Guests",
        summary: [
            { key: "uniqueGuests", label: "Unique Guests" },
            { key: "repeatGuests", label: "Repeat Guests" },
            { key: "totalStays", label: "Stays" },
            { key: "averageStayNights", label: "Average Stay (Nights)" },
            { key: "totalSpent", label: "Total Guest Spending", money: true },
        ] as SummaryField[],
    },
    "staff-tasks": {
        label: "Staff Tasks",
        summary: [
            { key: "totalCompleted", label: "Tasks Completed" },
        ] as SummaryField[],
    },
};

export type ReportSlug = keyof typeof REPORTS;

export const REPORT_SLUGS = Object.keys(REPORTS) as ReportSlug[];