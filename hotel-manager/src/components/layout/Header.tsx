"use client";

import { useState } from "react";
import Link from "next/link";
import { Hotel, LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import type { Role } from "@/types/employee";

type HeaderProps = {
  role: Role;
};

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  RECEPTIONIST: "Receptionist",
  HOUSEKEEPING: "Housekeeper",
};

export default function Header({ role }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const label = ROLE_LABELS[role];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 flex h-header items-center gap-4 border-b border-border bg-card px-[max(5vw,1.5rem)] shadow-sm">
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="sidebar"
        className="cursor-pointer rounded-md border-2 border-primary p-2 text-primary"
      >
        <Menu
          size={30}
          aria-hidden="true"
          className={`transition-transform duration-200 ${
            open ? "-rotate-90" : "rotate-0"
          }`}
        />
      </button>
      <Sidebar role={role} open={open} onClose={() => setOpen(false)} />
      <Link
        className="ml-4 flex shrink-0 items-center gap-2 text-primary"
        href="/"
        aria-label="Home"
      >
        <Hotel size={32} aria-hidden="true" />
        <span className="hidden text-xl font-semibold sm:inline">
          Hotel Management
        </span>
      </Link>
      <div className="ml-auto mr-8 hidden text-muted-foreground sm:block">
        Logged in as {/^[AEIOU]/.test(label) ? "an" : "a"} {label}
      </div>
      <button
        type="button"
        onClick={handleLogout}
        aria-label="Log out"
        className="ml-auto cursor-pointer rounded-md border-2 border-destructive p-2 text-destructive sm:ml-0"
      >
        <LogOut size={30} aria-hidden="true" />
      </button>
    </header>
  );
}
