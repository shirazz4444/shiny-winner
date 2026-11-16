const DAY = 86_400_000;

// today's date as YYYY-MM-DD (UTC)
export function today(): string {
    return new Date().toISOString().slice(0, 10);
}

// whole calendar days between two dates, so a check-in on the 3rd and a check-out on the 5th is a 2 days stay
export function calendarDays(checkIn: string | Date, checkOut: string | Date): number {
    return Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / DAY);
}