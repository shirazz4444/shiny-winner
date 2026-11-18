const DAY = 86_400_000;

// today's date as YYYY-MM-DD (UTC)
export function today(): string {
    return new Date().toISOString().slice(0, 10);
}

// whole calendar days between two dates, so a check-in on the 3rd and a check-out on the 5th is a 2 days stay
export function calendarDays(checkIn: string | Date, checkOut: string | Date): number {
    return Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / DAY);
}

export function dateOf(value: Date): string {
    return value.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
    const d = new Date(`${date}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

export function eachDay(start: string, end: string): string[] {
    const days: string[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
    return days;
}

export function weekStart(date: string): string {
    const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    return addDays(date, -((day + 6) % 7));
}

export function monthStart(date: string): string {
    return `${date.slice(0, 7)}-01`;
}

export function nextMonthStart(date: string): string {
    const d = new Date(`${monthStart(date)}T00:00:00.000Z`);
    d.setUTCMonth(d.getUTCMonth() + 1);
    return d.toISOString().slice(0, 10);
}
