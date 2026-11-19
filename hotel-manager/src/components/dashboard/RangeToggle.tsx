import Link from "next/link";

const OPTIONS = [7, 30, 90];

export default function RangeToggle({ current }: { current: number }) {
  return (
    <nav
      aria-label="Chart range"
      className="inline-flex overflow-hidden rounded-md border border-border"
    >
      {OPTIONS.map((days) => (
        <Link
          key={days}
          href={`/dashboard?days=${days}`}
          aria-current={days === current ? "true" : undefined}
          className={`px-4 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            days === current
              ? "bg-primary text-primary-foreground"
              : "bg-card hover:bg-primary/10 hover:text-primary"
          }`}
        >
          {days} days
        </Link>
      ))}
    </nav>
  );
}
