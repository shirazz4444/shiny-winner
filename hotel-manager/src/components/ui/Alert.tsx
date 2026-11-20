import type { ReactNode } from "react";

type AlertProps = {
  variant?: "error" | "info";
  children: ReactNode;
};

export default function Alert({ variant = "error", children }: AlertProps) {
  const style =
    variant === "error"
      ? "bg-destructive/10 text-destructive"
      : "bg-info/10 text-info";

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`rounded-md px-3 py-2 text-sm ${style}`}
    >
      {children}
    </div>
  );
}
