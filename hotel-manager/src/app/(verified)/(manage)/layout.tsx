import { requireRole } from "@/services/authService";

export default async function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("ADMIN", "MANAGER");
  return <>{children}</>;
}
