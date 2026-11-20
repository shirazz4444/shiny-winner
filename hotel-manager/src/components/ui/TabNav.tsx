import Link from "next/link";

type TabItem = {
  href: string;
  label: string;
  active: boolean;
};

export default function TabNav({
  label,
  items,
}: {
  label: string;
  items: TabItem[];
}) {
  return (
    <nav
      aria-label={label}
      className="flex flex-wrap gap-1 border-b border-border"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            item.active
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
