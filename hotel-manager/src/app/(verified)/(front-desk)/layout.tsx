import { requireRole } from "@/services/authService";

export default async function FrontDeskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("ADMIN", "MANAGER", "RECEPTIONIST");
  return <>{children}</>;
}
