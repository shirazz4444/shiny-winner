"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  DoorOpen,
  Calendar,
  UserRound,
  CreditCard,
  BedDouble,
  SprayCan,
  Users,
  FileText,
} from "lucide-react";
import type { Role } from "@/types/employee";

const ALL: Role[] = ["ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING"];
const MANAGE: Role[] = ["ADMIN", "MANAGER"];
const FRONT_DESK: Role[] = ["ADMIN", "MANAGER", "RECEPTIONIST"];

const links = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: MANAGE,
  },
  {
    href: "/reservations",
    label: "Reservations",
    icon: CalendarCheck,
    roles: FRONT_DESK,
  },
  {
    href: "/check-in-out",
    label: "Check-in / Check-out",
    icon: DoorOpen,
    roles: FRONT_DESK,
  },
  { href: "/calendar", label: "Calendar", icon: Calendar, roles: FRONT_DESK },
  { href: "/guests", label: "Guests", icon: UserRound, roles: FRONT_DESK },
  { href: "/billing", label: "Billing", icon: CreditCard, roles: FRONT_DESK },
  { href: "/rooms", label: "Rooms", icon: BedDouble, roles: ALL },
  { href: "/housekeeping", label: "Housekeeping", icon: SprayCan, roles: ALL },
  { href: "/staff", label: "Staff", icon: Users, roles: MANAGE },
  { href: "/reports", label: "Reports", icon: FileText, roles: MANAGE },
];

type SidebarProps = {
  role: Role;
  open: boolean;
  onClose: () => void;
};

export default function Sidebar({ role, open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const visible = links.filter((link) => link.roles.includes(role));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <aside
      id="sidebar"
      aria-label="Main navigation"
      className={`fixed bottom-0 left-0 top-(--header-height) z-40 w-64 overflow-y-auto border-r border-border bg-card text-card-foreground shadow-lg transition-transform ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
      inert={!open}
    >
      <nav className="py-3">
        <ul className="flex flex-col gap-1 px-2">
          {visible.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  <Icon size={18} aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
