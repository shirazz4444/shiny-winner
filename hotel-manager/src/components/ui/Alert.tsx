import type { ReactNode } from "react";

type AlertProps = {
  variant?: "error" | "info" | "warning";
  children: ReactNode;
};

const styles = {
  error: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
};

export default function Alert({ variant = "error", children }: AlertProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`rounded-md px-3 py-2 text-sm ${styles[variant]}`}
    >
      {children}
    </div>
  );
}
