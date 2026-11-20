import type { Role } from "@/types/employee";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  RECEPTIONIST: "Receptionist",
  HOUSEKEEPING: "Housekeeper",
};

export const ROLES = Object.keys(ROLE_LABELS) as Role[];
