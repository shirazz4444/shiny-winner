import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import { requireRole } from "@/services/authService";

export const metadata: Metadata = {
  title: "Hotel Management",
};

export default async function VerifiedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(
    "ADMIN",
    "MANAGER",
    "RECEPTIONIST",
    "HOUSEKEEPING",
  );
  return (
    <>
      <Header role={session.role} />
      <main>{children}</main>
    </>
  );
}
